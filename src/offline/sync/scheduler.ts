import { db } from '@/offline/db'
import { pullChanges } from './pull'
import { pushOutbox } from './push'
import { backoffDelayMs, maxPushAttempts } from './retry'
import { setStatus } from './status'

const SYNC_INTERVAL_MS = 60_000
// Tope de rondas de pull por corrida: evita que un servidor que siempre
// responda hasMore:true cuelgue el scheduler en un bucle infinito.
const MAX_PULL_ROUNDS = 20

// Lo que lee el estudiante cuando una corrida agota sus intentos. No menciona
// el error técnico a propósito: lo que necesita saber es que sus horas siguen
// guardadas y que la app va a seguir intentando.
const EXHAUSTED_NOTE =
  'No pudimos enviar estas horas todavía. Siguen guardadas en este dispositivo y lo volveremos a intentar.'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** Deja constancia del intento fallido en cada operación que sigue en la cola. */
async function recordAttempt(message: string): Promise<void> {
  await db.outbox.toCollection().modify((entry) => {
    entry.attempts += 1
    entry.lastError = message
  })
}

/**
 * Marca como fallidas las filas de las operaciones que siguen encoladas, para
 * que el estudiante las vea. No las saca del outbox: la historia pide que
 * queden visibles, no que se descarten — se reintentan en la próxima corrida.
 */
async function markQueuedRowsFailed(): Promise<void> {
  const ids = (await db.outbox.toArray())
    .map((entry) => Number(entry.payload.id))
    .filter((id) => Number.isFinite(id))
  if (ids.length === 0) return
  await db.hourLogs.where('id').anyOf(ids).modify({ syncState: 'failed', syncNote: EXHAUSTED_NOTE })
}

/**
 * Envía la cola reintentando con espera creciente.
 *
 * Se detiene antes de tiempo si el dispositivo pierde la conexión: sin red,
 * gastar el tope de intentos no sirve de nada y la cola queda igual de llena.
 * El listener de `online` reanuda en cuanto vuelve la señal.
 */
async function pushWithBackoff(): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await pushOutbox()
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'no se pudo enviar la cola'
      await recordAttempt(message)

      if (attempt >= maxPushAttempts) {
        await markQueuedRowsFailed()
        throw err
      }
      if (!navigator.onLine) return
      await sleep(backoffDelayMs(attempt))
      if (!navigator.onLine) return
    }
  }
}

function hasSession(): boolean {
  return Boolean(localStorage.getItem('access_token'))
}

let currentSync: Promise<void> | null = null

async function runSync(): Promise<void> {
  if (!hasSession()) return

  setStatus({ syncing: true })

  try {
    let hasMore = true
    let rounds = 0
    while (hasMore && rounds < MAX_PULL_ROUNDS) {
      const result = await pullChanges()
      hasMore = result.hasMore
      rounds += 1
    }

    await pushWithBackoff()

    const pending = await db.outbox.count()
    setStatus({ syncing: false, pending, lastSyncAt: new Date().toISOString() })
  } catch (err) {
    console.error('sincronización falló', err)
    // El contador se recalcula también aquí: tras agotar los reintentos las
    // operaciones siguen en la cola, y dejar el número viejo le mostraría al
    // estudiante menos pendientes de los que realmente tiene.
    setStatus({ syncing: false, pending: await db.outbox.count() })
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
