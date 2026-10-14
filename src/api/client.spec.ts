import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('attaches the bearer token and returns parsed json', async () => {
    localStorage.setItem('access_token', 'tok')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api<{ id: number }>('/offers')).resolves.toEqual({ id: 1 })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(init.credentials).toBe('include')
  })

  it('throws ApiError carrying the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403,
      json: async () => ({ statusCode: 403, message: 'rol insuficiente' }),
    }))

    await expect(api('/offers')).rejects.toMatchObject({ statusCode: 403, message: 'rol insuficiente' })
    await expect(api('/offers')).rejects.toBeInstanceOf(ApiError)
  })

  it('renews an expired access token once and retries the original request', async () => {
    localStorage.setItem('access_token', 'expired-token')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'token expirado' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'fresh-token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rows: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api<{ rows: unknown[] }>('/offers')).resolves.toEqual({ rows: [] })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh')
    expect(localStorage.getItem('access_token')).toBe('fresh-token')
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh-token')
  })

  it('announces an expired session when the refresh cookie is rejected', async () => {
    localStorage.setItem('access_token', 'expired-token')
    const expired = vi.fn()
    window.addEventListener('auth:expired', expired)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'token expirado' }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'sesión expirada' }) }))

    await expect(api('/offers')).rejects.toMatchObject({ statusCode: 401 })
    expect(expired).toHaveBeenCalledOnce()
    window.removeEventListener('auth:expired', expired)
  })
})
