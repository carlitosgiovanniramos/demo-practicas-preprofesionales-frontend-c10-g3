import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStatus, setStatus, subscribe } from './status'

describe('sync status store', () => {
  it('merges a partial patch into the current status', () => {
    setStatus({ pending: 3 })
    expect(getStatus()).toMatchObject({ pending: 3 })

    setStatus({ syncing: true })
    expect(getStatus()).toMatchObject({ pending: 3, syncing: true })
  })

  it('notifies subscribers on every update and stops after unsubscribing', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    setStatus({ online: false })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setStatus({ online: true })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

// E1-08 · Dos pestanas comparten la base local pero no el estado en memoria.
// Cada "pestana" de estos tests es una instancia nueva del modulo, que es
// exactamente lo que ocurre cuando el navegador carga la app dos veces.
describe('estado compartido entre pestanas (E1-08)', () => {
  const abiertas: Array<{ closeSyncStatusChannel: () => void }> = []

  async function abrirPestana() {
    vi.resetModules()
    const mod = await import('./status')
    abiertas.push(mod)
    return mod
  }

  // Deja que el mensaje de BroadcastChannel cruce entre instancias.
  const entregaDelMensaje = () => new Promise((resolve) => setTimeout(resolve, 0))

  afterEach(() => {
    for (const pestana of abiertas) pestana.closeSyncStatusChannel()
    abiertas.length = 0
  })

  it('una pestana ve los pendientes y el ultimo sync de la otra', async () => {
    const a = await abrirPestana()
    const b = await abrirPestana()

    a.setStatus({ pending: 4, lastSyncAt: '2026-10-06T10:00:00.000Z' })
    await entregaDelMensaje()

    expect(b.getStatus()).toMatchObject({ pending: 4, lastSyncAt: '2026-10-06T10:00:00.000Z' })
  })

  it('sincronizar en una avisa a la otra sin recargar', async () => {
    const a = await abrirPestana()
    const b = await abrirPestana()

    const avisos = vi.fn()
    b.subscribe(avisos)

    a.setStatus({ syncing: true })
    await entregaDelMensaje()

    expect(avisos).toHaveBeenCalled()
    expect(b.getStatus().syncing).toBe(true)
  })

  // Sin esto, cada pestana reenviaria lo que recibe y las dos se quedarian
  // rebotando el mismo estado.
  it('no reenvia lo que recibe de la otra pestana', async () => {
    const a = await abrirPestana()
    const b = await abrirPestana()

    const espia = vi.spyOn(BroadcastChannel.prototype, 'postMessage')
    a.setStatus({ pending: 1 })
    await entregaDelMensaje()
    await entregaDelMensaje()

    // Un solo envio: el de la pestana que origino el cambio.
    expect(espia).toHaveBeenCalledTimes(1)
    expect(b.getStatus().pending).toBe(1)
    espia.mockRestore()
  })

  // navigator.onLine es de cada pestana. Propagarlo haria que una pestana
  // dijese "en linea" apoyandose en lo que ve otra.
  it('no propaga online, que es de cada pestana', async () => {
    const a = await abrirPestana()
    const b = await abrirPestana()

    b.setStatus({ online: false })
    a.setStatus({ online: true, pending: 2 })
    await entregaDelMensaje()

    expect(b.getStatus().pending).toBe(2)
    expect(b.getStatus().online).toBe(false)
  })

  // Reportado por Erick en la revision del PR #8. Una pestana recien abierta
  // arranca con pending 0 y lastSyncAt null; si al sincronizar publica su
  // estado entero, le borra a las demas el contador que si era correcto.
  it('una pestana nueva no borra los pendientes de la que ya estaba', async () => {
    const a = await abrirPestana()
    a.setStatus({ pending: 3, lastSyncAt: '2026-10-06T10:00:00.000Z' })

    const b = await abrirPestana()
    b.setStatus({ syncing: true })
    await entregaDelMensaje()

    expect(a.getStatus()).toMatchObject({
      pending: 3,
      lastSyncAt: '2026-10-06T10:00:00.000Z',
      syncing: true,
    })
  })

  // Un cambio que solo toca online no tiene por que viajar: es de cada pestana.
  it('no publica nada cuando el parche solo trae online', async () => {
    const a = await abrirPestana()
    await abrirPestana()

    const espia = vi.spyOn(BroadcastChannel.prototype, 'postMessage')
    a.setStatus({ online: false })
    await entregaDelMensaje()

    expect(espia).not.toHaveBeenCalled()
    espia.mockRestore()
  })
})
