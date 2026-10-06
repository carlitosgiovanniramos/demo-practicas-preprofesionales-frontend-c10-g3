import { db } from '@/offline/db'
import { pullChanges } from './pull'
import { pushOutbox } from './push'
import { setStatus } from './status'

const SYNC_INTERVAL_MS = 60_000
// Tope de rondas de pull por corrida: evita que un servidor que siempre
// responda hasMore:true cuelgue el scheduler en un bucle infinito.
const MAX_PULL_ROUNDS = 20

function hasSession(): boolean {
  return Boolean(localStorage.getItem('access_token'))
}

/**
 * Concesión para sincronizar, en `localStorage` porque es lo único que las dos
 * pestañas ven a la vez. `currentSync` solo evita el solape dentro de una
 * pestaña; dos pestañas distintas competirían por las mismas operaciones de la
 * cola, que es una sola y compartida.
 */
export const SYNC_LEASE_KEY = 'practicas:sync-lease'

/**
 * Cuánto vale una concesión. Si una pestaña se cierra a mitad de un sync, la
 * suya se queda escrita: sin caducidad nadie volvería a sincronizar nunca. El
 * peor caso al caducar es saltarse un ciclo, porque el intervalo es de 60s.
 */
export const SYNC_LEASE_TTL_MS = 60_000

// Identifica a esta pestaña frente a las demás. El mismo `crypto.randomUUID`
// que ya usa el outbox para los clientOpId.
const tabId = crypto.randomUUID()

function claimSyncLease(): boolean {
  const raw = localStorage.getItem(SYNC_LEASE_KEY)
  if (raw) {
    try {
      const lease = JSON.parse(raw) as { tab?: string; at?: number }
      const vigente = typeof lease.at === 'number' && Date.now() - lease.at < SYNC_LEASE_TTL_MS
      if (vigente && lease.tab !== tabId) return false
    } catch {
      // Una concesión ilegible no debe bloquear la sincronización para siempre.
    }
  }
  localStorage.setItem(SYNC_LEASE_KEY, JSON.stringify({ tab: tabId, at: Date.now() }))
  return true
}

function releaseSyncLease(): void {
  const raw = localStorage.getItem(SYNC_LEASE_KEY)
  if (!raw) return
  try {
    const lease = JSON.parse(raw) as { tab?: string }
    if (lease.tab !== tabId) return
  } catch {
    // Ilegible: la quitamos igual, nadie puede reclamarla.
  }
  localStorage.removeItem(SYNC_LEASE_KEY)
}

let currentSync: Promise<void> | null = null

async function runSync(): Promise<void> {
  if (!hasSession()) return
  // Otra pestaña está sincronizando esta misma cola: su resultado llega por el
  // canal de estado, así que no hay nada que hacer aquí.
  if (!claimSyncLease()) return

  setStatus({ syncing: true })

  try {
    let hasMore = true
    let rounds = 0
    while (hasMore && rounds < MAX_PULL_ROUNDS) {
      const result = await pullChanges()
      hasMore = result.hasMore
      rounds += 1
    }

    await pushOutbox()

    const pending = await db.outbox.count()
    setStatus({ syncing: false, pending, lastSyncAt: new Date().toISOString() })
  } catch (err) {
    console.error('sincronización falló', err)
    setStatus({ syncing: false })
  } finally {
    // Siempre, también si falló: una concesión retenida por un error dejaría a
    // las demás pestañas esperando hasta que caduque.
    releaseSyncLease()
  }
}

/** Corre pull + push. Si ya hay una corrida en curso, la reutiliza en vez de duplicarla. */
export function syncNow(): Promise<void> {
  if (!currentSync) {
    currentSync = runSync().finally(() => {
      currentSync = null
    })
  }
  return currentSync
}

/**
 * Arranca el scheduler: sincroniza al montar, al recuperar conexión, y cada
 * 60s. Debe llamarse una sola vez (desde un useEffect en AppLayout) — llamar
 * en cada hook crearía un timer y un listener por cada consumidor.
 */
export function startSync(): () => void {
  void syncNow()

  const handleOnline = () => {
    setStatus({ online: true })
    void syncNow()
  }
  const handleOffline = () => {
    setStatus({ online: false })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  const intervalId = window.setInterval(() => {
    void syncNow()
  }, SYNC_INTERVAL_MS)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.clearInterval(intervalId)
  }
}
