import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/offline/db'
import { pullChanges } from './pull'
import { pushOutbox } from './push'
import { backoffDelayMs, maxPushAttempts } from './retry'
import { startSync, syncNow } from './scheduler'
import { getStatus, setStatus, subscribe } from './status'

vi.mock('./pull', () => ({ pullChanges: vi.fn() }))
vi.mock('./push', () => ({ pushOutbox: vi.fn() }))
// La espera entre reintentos se anula aqui para no tardar segundos reales: lo
// que crezca 1s, 2s, 4s se prueba aparte en retry.spec.ts. maxPushAttempts se
// conserva tal cual porque es el tope que estos tests ejercitan.
vi.mock('./retry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./retry')>()),
  backoffDelayMs: vi.fn(() => 0),
}))

const mockedPull = vi.mocked(pullChanges)
const mockedPush = vi.mocked(pushOutbox)
const mockedBackoff = vi.mocked(backoffDelayMs)

async function queueOperation(id: number) {
  await db.hourLogs.put({
    id,
    placementId: 1,
    date: '2026-04-01',
    startTime: '08:00',
    endTime: '12:00',
    hours: 4,
    activity: 'Soporte',
    status: 'SUBMITTED',
    version: 1,
    updatedAt: '2026-04-01T00:00:00.000Z',
    syncState: 'queued',
  })
  await db.outbox.add({
    clientOpId: `op-${id}`,
    entity: 'hourLog',
    op: 'update',
    payload: { id },
    baseVersion: 1,
    createdAt: '2026-04-01T00:00:00.000Z',
    attempts: 0,
    lastError: null,
  })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
  mockedPull.mockReset()
  mockedPush.mockReset()
  mockedBackoff.mockClear()
  vi.restoreAllMocks()
  setStatus({ online: true, pending: 0, lastSyncAt: null, syncing: false })
})

describe('syncNow', () => {
  it('no sincroniza sin sesión activa', async () => {
    await syncNow()

    expect(mockedPull).not.toHaveBeenCalled()
    expect(mockedPush).not.toHaveBeenCalled()
  })

  it('hace pull hasta agotar hasMore y luego push cuando hay sesión', async () => {
    localStorage.setItem('access_token', 'tok')
    mockedPull
      .mockResolvedValueOnce({ applied: 1, hasMore: true })
      .mockResolvedValueOnce({ applied: 0, hasMore: false })
    mockedPush.mockResolvedValue({ applied: 0, failed: 0 })

    await syncNow()

    expect(mockedPull).toHaveBeenCalledTimes(2)
    expect(mockedPush).toHaveBeenCalledTimes(1)
    expect(getStatus().syncing).toBe(false)
  })

  it('reutiliza la corrida en curso si ya hay una sincronización en vuelo', async () => {
    localStorage.setItem('access_token', 'tok')
    mockedPull.mockResolvedValue({ applied: 0, hasMore: false })
    mockedPush.mockResolvedValue({ applied: 0, failed: 0 })

    await Promise.all([syncNow(), syncNow()])

    expect(mockedPush).toHaveBeenCalledTimes(1)
  })

  it('emite una sola transición coherente al cerrar el sync con pendientes recalculados', async () => {
    localStorage.setItem('access_token', 'tok')
    mockedPull.mockResolvedValue({ applied: 0, hasMore: false })
    mockedPush.mockResolvedValue({ applied: 0, failed: 0 })
    setStatus({ pending: 3 })

    const seen: Array<Record<string, unknown>> = []
    const capture = () => {
      seen.push({ ...getStatus() })
    }

    const unsubscribeListener = subscribe(capture)

    await syncNow()

    unsubscribeListener()

    expect(seen).toEqual([
      expect.objectContaining({ syncing: true, pending: 3 }),
      expect.objectContaining({ syncing: false, pending: 0, lastSyncAt: expect.any(String) }),
    ])
    expect(seen.some((state) => !state.syncing && Number(state.pending) !== 0)).toBe(false)
    expect(getStatus().lastSyncAt).toBeTruthy()
  })

  it('atrapa errores de red y deja de sincronizar sin propagar la excepción', async () => {
    localStorage.setItem('access_token', 'tok')
    mockedPull.mockRejectedValue(new Error('sin conexión'))

    await expect(syncNow()).resolves.toBeUndefined()
    expect(getStatus().syncing).toBe(false)
    expect(getStatus().lastSyncAt).toBeNull()
  })
})

describe('startSync', () => {
  it('registra los listeners de online/offline y los retira al desmontar', () => {
    mockedPull.mockResolvedValue({ applied: 0, hasMore: false })
    mockedPush.mockResolvedValue({ applied: 0, failed: 0 })

    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const stop = startSync()
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    stop()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})

// E1-06 · Con senal intermitente, un fallo de envio no puede quedarse en un
// solo intento ni quemar bateria reintentando sin pausa.
describe('reintento del envio con espera creciente (E1-06)', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'tok')
    mockedPull.mockResolvedValue({ applied: 0, hasMore: false })
  })

  it('reintenta hasta el tope configurado cuando el envio falla', async () => {
    mockedPush.mockRejectedValue(new Error('sin conexion'))

    await syncNow()

    expect(mockedPush).toHaveBeenCalledTimes(maxPushAttempts)
  })

  it('espera un poco mas antes de cada reintento', async () => {
    mockedPush.mockRejectedValue(new Error('sin conexion'))

    await syncNow()

    // Una espera por cada reintento, y cada una pedida para un intento mayor
    // que la anterior: el crecimiento concreto se prueba en retry.spec.ts.
    const intentos = mockedBackoff.mock.calls.map(([n]) => n)
    expect(intentos).toEqual([...Array(maxPushAttempts - 1)].map((_, i) => i + 1))
  })

  it('deja de reintentar en cuanto el envio sale bien', async () => {
    mockedPush
      .mockRejectedValueOnce(new Error('sin conexion'))
      .mockResolvedValue({ applied: 1, failed: 0 })

    await syncNow()

    expect(mockedPush).toHaveBeenCalledTimes(2)
    expect(getStatus().lastSyncAt).toBeTruthy()
  })

  it('anota el intento y el ultimo error en la cola local', async () => {
    await queueOperation(10)
    mockedPush.mockRejectedValue(new Error('la red se cayo'))

    await syncNow()

    const [entrada] = await db.outbox.toArray()
    expect(entrada.attempts).toBe(maxPushAttempts)
    expect(entrada.lastError).toBe('la red se cayo')
  })

  it('tras agotar los reintentos marca la fila como fallida y NO la descarta', async () => {
    await queueOperation(10)
    mockedPush.mockRejectedValue(new Error('la red se cayo'))

    await syncNow()

    // La operacion sigue en la cola: se reintentara en la proxima corrida.
    await expect(db.outbox.count()).resolves.toBe(1)
    const fila = await db.hourLogs.get(10)
    expect(fila?.syncState).toBe('failed')
    expect(fila?.syncNote).toBeTruthy()
    // Y el contador refleja lo que de verdad hay pendiente.
    expect(getStatus().pending).toBe(1)
  })

  it('cancela los reintentos si el dispositivo pierde la conexion', async () => {
    await queueOperation(10)
    mockedPush.mockRejectedValue(new Error('sin conexion'))
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)

    await syncNow()

    // Un solo intento: sin red no tiene sentido quemar el tope. La cola queda
    // intacta y el listener de 'online' reanuda al volver la senal.
    expect(mockedPush).toHaveBeenCalledTimes(1)
    await expect(db.outbox.count()).resolves.toBe(1)
    const fila = await db.hourLogs.get(10)
    expect(fila?.syncState).toBe('queued')
  })
})

