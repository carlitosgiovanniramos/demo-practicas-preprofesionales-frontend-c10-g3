export interface SyncStatus {
  online: boolean
  pending: number
  lastSyncAt: string | null
  syncing: boolean
}

/**
 * Lo que una pestaña le cuenta a las demás. `online` queda fuera a propósito:
 * `navigator.onLine` es de cada pestaña, y propagarlo haría que una dijese
 * "en línea" apoyándose en lo que ve otra.
 */
type SharedStatus = Omit<SyncStatus, 'online'>

type Listener = () => void

const CHANNEL_NAME = 'practicas:sync-status'

let state: SyncStatus = {
  online: navigator.onLine,
  pending: 0,
  lastSyncAt: null,
  syncing: false,
}

const listeners = new Set<Listener>()

// Las dos pestañas comparten la base local pero no este objeto, que vive en
// memoria. El canal es lo que las mantiene diciendo lo mismo.
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null

export function getStatus(): SyncStatus {
  return state
}

function applyPatch(patch: Partial<SyncStatus>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

/**
 * Lo que se publica de un cambio: el parche, sin `online`.
 *
 * Nunca el estado entero. Una pestaña recién abierta arranca con `pending: 0`
 * y `lastSyncAt: null`; si al empezar a sincronizar publicase su estado
 * completo, le borraría a las demás el contador que sí era correcto.
 */
function sharedPatch(patch: Partial<SyncStatus>): Partial<SharedStatus> {
  const copy: Partial<SyncStatus> = { ...patch }
  delete copy.online
  return copy
}

if (channel) {
  channel.onmessage = (event: MessageEvent<Partial<SharedStatus>>) => {
    // Se aplica sin volver a publicar: si cada pestaña reenviase lo que recibe,
    // las dos se quedarían rebotando el mismo estado.
    applyPatch(event.data)
  }
}

export function setStatus(patch: Partial<SyncStatus>): void {
  applyPatch(patch)
  const compartido = sharedPatch(patch)
  // Un cambio que solo toca `online` no tiene por qué viajar: es de cada pestaña.
  if (Object.keys(compartido).length > 0) channel?.postMessage(compartido)
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Cierra el canal. Solo lo necesitan los tests, que abren varias "pestañas". */
export function closeSyncStatusChannel(): void {
  channel?.close()
}
