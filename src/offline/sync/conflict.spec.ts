import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { applyResults } from './conflict'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('applyResults', () => {
  it('marks the local row as synced when the server applied it', async () => {
    await db.hourLogs.put({
      id: 5,
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

    await applyResults(
      [{ clientOpId: 'a', status: 'applied', server: { id: 5, version: 2 }, reason: null }],
      new Map([['a', 5]]),
    )

    await expect(db.hourLogs.get(5)).resolves.toMatchObject({ syncState: 'synced', version: 2 })
  })

  it('marks the local row as failed and keeps the reason when rejected', async () => {
    await db.hourLogs.put({
      id: 6,
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

    await applyResults(
      [{ clientOpId: 'b', status: 'rejected', server: { id: 6 }, reason: 'el placement no es tuyo' }],
      new Map([['b', 6]]),
    )

    await expect(db.hourLogs.get(6)).resolves.toMatchObject({ syncState: 'failed', syncNote: 'el placement no es tuyo' })
  })

  it('reconciles a negative local id with the id the server assigned on create, leaving a single row', async () => {
    await db.hourLogs.put({
      id: -1700000000000,
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

    await applyResults(
      [
        {
          clientOpId: 'c',
          status: 'applied',
          server: {
            id: 42,
            placementId: 1,
            date: '2026-04-01',
            startTime: '08:00',
            endTime: '12:00',
            hours: 4,
            activity: 'Soporte',
            status: 'SUBMITTED',
            version: 1,
            updatedAt: '2026-04-01T00:00:00.000Z',
          },
          reason: null,
        },
      ],
      new Map([['c', -1700000000000]]),
    )

    const rows = await db.hourLogs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 42, syncState: 'synced' })
  })

  // E1-04 · El tutor ya resolvió la hora y la edición del estudiante llegó
  // tarde. El servidor manda: nos quedamos con su fila y se lo explicamos.
  describe('cuando el servidor devuelve conflict (E1-04)', () => {
    const localRow = {
      id: 7,
      placementId: 1,
      date: '2026-04-01',
      startTime: '08:00',
      endTime: '12:00',
      hours: 4,
      activity: 'Soporte',
      status: 'SUBMITTED' as const,
      version: 1,
      updatedAt: '2026-04-01T00:00:00.000Z',
      syncState: 'queued' as const,
    }

    it.each([
      ['APPROVED', 'aprobó'],
      ['REJECTED', 'rechazó'],
    ] as const)('guarda el estado del servidor y lo explica cuando el tutor %s', async (status, verbo) => {
      await db.hourLogs.put({ ...localRow, hours: 9, activity: 'Soporte editado sin conexión' })

      await applyResults(
        [
          {
            clientOpId: 'd',
            status: 'conflict',
            server: { id: 7, status, hours: 4, activity: 'Soporte', version: 5 },
            reason: `el tutor ya ${verbo} este registro y no admite más cambios`,
          },
        ],
        new Map([['d', 7]]),
      )

      const row = await db.hourLogs.get(7)
      // Gana el servidor: la edición local se descarta.
      expect(row).toMatchObject({ status, hours: 4, activity: 'Soporte', version: 5 })
      expect(row?.syncState).toBe('conflict')
      // Y el estudiante lee una frase, no un código.
      expect(row?.syncNote).toContain(verbo)
      expect(row?.syncNote).not.toContain('conflict')
    })

    it('no pisa la nota del tutor con la explicación de la sincronización', async () => {
      await db.hourLogs.put({ ...localRow, reviewNote: 'Faltó detallar la actividad' })

      await applyResults(
        [
          {
            clientOpId: 'e',
            status: 'conflict',
            server: { id: 7, status: 'REJECTED', version: 5 },
            reason: 'el tutor ya rechazó este registro y no admite más cambios',
          },
        ],
        new Map([['e', 7]]),
      )

      const row = await db.hourLogs.get(7)
      // Justo cuando el tutor rechaza es cuando su nota más importa.
      expect(row?.reviewNote).toBe('Faltó detallar la actividad')
      expect(row?.syncNote).toBeTruthy()
      expect(row?.syncNote).not.toBe(row?.reviewNote)
    })

    it('se distingue de un fallo de envío, que sí deja la fila en failed', async () => {
      await db.hourLogs.put(localRow)

      await applyResults(
        [{ clientOpId: 'f', status: 'rejected', server: { id: 7 }, reason: 'el placement no es tuyo' }],
        new Map([['f', 7]]),
      )

      await expect(db.hourLogs.get(7)).resolves.toMatchObject({ syncState: 'failed' })
    })
  })
})
