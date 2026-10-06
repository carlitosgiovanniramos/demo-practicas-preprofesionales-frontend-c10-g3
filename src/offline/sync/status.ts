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

function shared(status: SyncStatus): SharedStatus {
  const copy: Partial<SyncStatus> = { ...status }
  delete copy.online
  return copy as SharedStatus
}

if (channel) {
  channel.onmessage = (event: MessageEvent<SharedStatus>) => {
    // Se aplica sin volver a publicar: si cada pestaña reenviase lo que recibe,
    // las dos se quedarían rebotando el mismo estado.
    applyPatch(event.data)
  }
}

export function setStatus(patch: Partial<SyncStatus>): void {
  applyPatch(patch)
  channel?.postMessage(shared(state))
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
