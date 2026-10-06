import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/offline/db'
import { pullChanges } from './pull'
import { pushOutbox } from './push'
import { SYNC_LEASE_KEY, SYNC_LEASE_TTL_MS, startSync, syncNow } from './scheduler'
import { getStatus, setStatus, subscribe } from './status'

vi.mock('./pull', () => ({ pullChanges: vi.fn() }))
vi.mock('./push', () => ({ pushOutbox: vi.fn() }))

const mockedPull = vi.mocked(pullChanges)
const mockedPush = vi.mocked(pushOutbox)

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
  mockedPull.mockReset()
  mockedPush.mockReset()
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

// E1-08 · Dos pestanas comparten la misma cola local. Si las dos sincronizan a
// la vez, compiten por las mismas operaciones. Una concesion en localStorage
// -- que es lo unico que las dos pestanas ven -- deja sincronizar a una sola.
describe('una sola pestana sincroniza a la vez (E1-08)', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'tok')
    mockedPull.mockResolvedValue({ applied: 0, hasMore: false })
    mockedPush.mockResolvedValue({ applied: 0, failed: 0 })
  })

  it('no sincroniza si otra pestana tiene la cola tomada', async () => {
    localStorage.setItem(SYNC_LEASE_KEY, JSON.stringify({ tab: 'otra-pestana', at: Date.now() }))

    await syncNow()

    expect(mockedPull).not.toHaveBeenCalled()
    expect(mockedPush).not.toHaveBeenCalled()
  })

  it('suelta la cola al terminar para que la otra pestana pueda sincronizar', async () => {
    await syncNow()

    expect(localStorage.getItem(SYNC_LEASE_KEY)).toBeNull()
    expect(mockedPush).toHaveBeenCalledTimes(1)
  })

  it('suelta la cola aunque la sincronizacion falle', async () => {
    mockedPull.mockRejectedValue(new Error('sin conexion'))

    await syncNow()

    expect(localStorage.getItem(SYNC_LEASE_KEY)).toBeNull()
  })

  // Si una pestana se cierra a mitad de un sync, su concesion se queda escrita.
  // Sin caducidad, nadie volveria a sincronizar nunca.
  it('ignora una concesion caducada de una pestana que ya no esta', async () => {
    const caducada = Date.now() - SYNC_LEASE_TTL_MS - 1
    localStorage.setItem(SYNC_LEASE_KEY, JSON.stringify({ tab: 'pestana-cerrada', at: caducada }))

    await syncNow()

    expect(mockedPush).toHaveBeenCalledTimes(1)
  })
})

