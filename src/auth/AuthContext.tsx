import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, renewAccessToken } from '@/api/client'
import { db } from '@/offline/db'
import { resetVoiceTutorial } from '@/voice/tutorial'

export type Role = 'STUDENT' | 'TUTOR' | 'COMPANY' | 'COORDINATOR'

export interface AuthUser {
  id: number
  email: string
  fullName: string
  role: Role
  // Solo relevante para Role.COMPANY (ver User.companyId en el backend); el
  // resto de roles lo trae null. CompanyOffersPage arma CreateOfferDto con él.
  companyId: number | null
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  role: Role | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const LOGIN_MESSAGE_KEY = 'auth_message'

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function expiryOf(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(base64)) as { exp?: number }
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

async function clearLocalData(): Promise<void> {
  // Purge the shared lab computer's offline cache as well as auth state so a
  // later student cannot inherit the previous user's sync checkpoint or rows.
  try {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()))
    })
  } finally {
    localStorage.clear()
    sessionStorage.clear()
  }
}

type RenewalTimer = { current: ReturnType<typeof setTimeout> | null }

function scheduleRenewal(timer: RenewalTimer, token: string | null, onExpired: () => Promise<void>): void {
  if (timer.current) clearTimeout(timer.current)
  timer.current = null
  if (!token) return
  const expiresAt = expiryOf(token)
  if (!expiresAt) return

  // Renew one minute before expiry (or halfway through very short TTLs).
  const remaining = expiresAt - Date.now()
  const delay = Math.max(0, remaining - Math.min(60_000, remaining / 2))
  timer.current = setTimeout(() => {
    renewAccessToken(token)
      .then((renewedToken) => renewedToken ? undefined : onExpired())
      .catch(() => scheduleRetry(timer, onExpired))
  }, delay)
}

function scheduleRetry(timer: RenewalTimer, onExpired: () => Promise<void>): void {
  timer.current = setTimeout(() => {
    const latest = localStorage.getItem('access_token')
    if (latest) scheduleRenewal(timer, latest, onExpired)
  }, 15_000)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const navigate = useNavigate()
  const ended = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const endSession = useCallback(async (message: string) => {
    if (ended.current) return
    ended.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    try {
      await clearLocalData()
    } finally {
      sessionStorage.setItem(LOGIN_MESSAGE_KEY, message)
      setUser(null)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const onExpiredSession = useCallback(
    () => endSession('Tu sesión expiró. Inicia sesión de nuevo.'),
    [endSession],
  )

  useEffect(() => {
    scheduleRenewal(timer, localStorage.getItem('access_token'), onExpiredSession)

    const onExpired = () => {
      endSession('Tu sesión expiró. Inicia sesión de nuevo.').catch(() => undefined)
    }
    const onTokenRefreshed = () => scheduleRenewal(timer, localStorage.getItem('access_token'), onExpiredSession)
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' && event.newValue === null) {
        endSession('Se cerró la sesión en otra pestaña. Inicia sesión de nuevo.').catch(() => undefined)
      } else if (event.key === 'access_token' && event.newValue) {
        scheduleRenewal(timer, event.newValue, onExpiredSession)
      } else if (event.key === null) {
        endSession('Se cerró la sesión en otra pestaña. Inicia sesión de nuevo.').catch(() => undefined)
      }
    }

    window.addEventListener('auth:expired', onExpired)
    window.addEventListener('auth:token-refreshed', onTokenRefreshed)
    window.addEventListener('storage', onStorage)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      window.removeEventListener('auth:expired', onExpired)
      window.removeEventListener('auth:token-refreshed', onTokenRefreshed)
      window.removeEventListener('storage', onStorage)
    }
  }, [endSession, onExpiredSession])

  async function login(email: string, password: string) {
    const { accessToken, user: loggedUser } = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    ended.current = false
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('user', JSON.stringify(loggedUser))
    // Cada inicio de sesión vuelve a mostrar el tutorial de voz la primera vez que se usa el micrófono.
    resetVoiceTutorial()
    setUser(loggedUser)
    scheduleRenewal(timer, accessToken, onExpiredSession)
  }

  async function logout() {
    ended.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    // Signal sibling tabs immediately and stop any in-flight refresh from
    // restoring a token after logout starts.
    localStorage.removeItem('access_token')
    // Best effort: local logout must still work if the API is unreachable.
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearLocalData()
    ended.current = true
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
