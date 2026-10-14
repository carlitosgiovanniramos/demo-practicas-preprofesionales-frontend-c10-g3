const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const AUTH_ENDPOINTS = new Set(['/auth/login', '/auth/refresh', '/auth/logout'])

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let refreshInFlight: Promise<string | null> | null = null

async function refreshWithCookie(previousToken: string): Promise<string | null> {
  const currentToken = localStorage.getItem('access_token')
  if (!currentToken) return null
  if (currentToken && currentToken !== previousToken) return currentToken

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (response.status === 401) return null
  if (!response.ok) throw new ApiError(response.status, 'no se pudo renovar la sesión')

  const latestToken = localStorage.getItem('access_token')
  if (!latestToken) return null
  if (latestToken !== previousToken) return latestToken

  const body = (await response.json()) as { accessToken: string }
  localStorage.setItem('access_token', body.accessToken)
  window.dispatchEvent(new Event('auth:token-refreshed'))
  return body.accessToken
}

export function renewAccessToken(previousToken: string): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  const renew = () => refreshWithCookie(previousToken)
  const operation = async () => locks
    ? await locks.request('practicas-auth-refresh', renew)
    : await renew()
  refreshInFlight = operation().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function request(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token')
  let res = await request(path, init, token)

  if (res.status === 401 && token && !AUTH_ENDPOINTS.has(path)) {
    const renewedToken = await renewAccessToken(token)
    if (renewedToken) {
      res = await request(path, init, renewedToken)
    } else {
      window.dispatchEvent(new Event('auth:expired'))
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
