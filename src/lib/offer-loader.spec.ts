import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { getOffer } from '@/api/offers'
import { loadOfferInto } from './offer-loader'

vi.mock('@/api/offers', () => ({ getOffer: vi.fn() }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('loadOfferInto', () => {
  beforeEach(() => {
    vi.mocked(getOffer).mockReset()
  })

  it('passes the loaded offer to the page', async () => {
    vi.mocked(getOffer).mockResolvedValue({ id: 7 } as never)
    const setOffer = vi.fn()
    const setLoadError = vi.fn()

    loadOfferInto(7, () => false, setOffer, setLoadError)
    await flush()

    expect(setOffer).toHaveBeenCalledWith({ id: 7 })
    expect(setLoadError).not.toHaveBeenCalled()
  })

  it('shows the API message when the request fails with an ApiError', async () => {
    vi.mocked(getOffer).mockRejectedValue(new ApiError(403, 'no autorizado'))
    const setOffer = vi.fn()
    const setLoadError = vi.fn()

    loadOfferInto(7, () => false, setOffer, setLoadError)
    await flush()

    expect(setOffer).toHaveBeenCalledWith(null)
    expect(setLoadError).toHaveBeenCalledWith('no autorizado')
  })

  it('shows a generic message for other failures', async () => {
    vi.mocked(getOffer).mockRejectedValue(new Error('red caída'))
    const setLoadError = vi.fn()

    loadOfferInto(7, () => false, vi.fn(), setLoadError)
    await flush()

    expect(setLoadError).toHaveBeenCalledWith('No se pudo cargar la oferta')
  })

  it('ignores both outcomes once the page is gone', async () => {
    vi.mocked(getOffer).mockResolvedValue({ id: 7 } as never)
    const setOffer = vi.fn()
    const setLoadError = vi.fn()

    loadOfferInto(7, () => true, setOffer, setLoadError)
    await flush()

    expect(setOffer).not.toHaveBeenCalled()
    expect(setLoadError).not.toHaveBeenCalled()
  })

  it('ignores a failure once the page is gone', async () => {
    vi.mocked(getOffer).mockRejectedValue(new Error('red caída'))
    const setOffer = vi.fn()
    const setLoadError = vi.fn()

    loadOfferInto(7, () => true, setOffer, setLoadError)
    await flush()

    expect(setOffer).not.toHaveBeenCalled()
    expect(setLoadError).not.toHaveBeenCalled()
  })
})
