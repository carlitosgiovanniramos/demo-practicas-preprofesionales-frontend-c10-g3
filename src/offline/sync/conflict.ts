import { db, type LocalHourLog } from '@/offline/db'

export interface SyncOperationResult {
  clientOpId: string
  status: 'applied' | 'conflict' | 'rejected'
  server: (Partial<LocalHourLog> & { id: number }) | null
  reason: string | null
}

// Escribe el resultado de una operación "applied". Si la fila vivía con un id
// local negativo (creada offline) y el servidor asignó uno positivo, la
// temporal se borra y la definitiva se escribe con el id real, en vez de
// intentar un update que nunca encontraría la fila (Dexie.update() en una
// clave inexistente es un no-op y la deja huérfana).
async function applyApplied(server: NonNullable<SyncOperationResult['server']>, localId: number | undefined) {
  const { id: serverId, ...serverFields } = server
  const isReconciledCreate = localId != null && localId < 0 && serverId > 0

  if (isReconciledCreate) {
    await db.hourLogs.delete(localId)
    await db.hourLogs.put({ ...serverFields, id: serverId, syncState: 'synced' } as LocalHourLog)
  } else {
    await db.hourLogs.update(localId ?? serverId, { ...serverFields, syncState: 'synced' })
  }
}

// El servidor es la autoridad sobre el estado: si devolvió 'conflict', el
// tutor ya había resuelto la hora y nuestra edición no entró. Lo que vale es
// su fila, así que la escribimos encima de la copia local — por eso el
// estudiante ve en qué quedó sin recargar nada: la pantalla lee de Dexie con
// useLiveQuery y se repinta sola.
async function applyConflict(
  server: NonNullable<SyncOperationResult['server']>,
  localId: number | undefined,
) {
  const { id: serverId, ...serverFields } = server
  await db.hourLogs.update(localId ?? serverId, {
    ...serverFields,
    syncState: 'conflict',
    syncNote: explainConflict(server.status),
  })
}

// El motivo que manda el servidor está escrito para nosotros, no para el
// estudiante. Acá se traduce a algo que él pueda entender, a partir del
// estado real — no del texto, que puede cambiar sin avisar.
const TUTOR_DECISION: Partial<Record<NonNullable<LocalHourLog['status']>, string>> = {
  APPROVED: 'aprobó',
  REJECTED: 'rechazó',
}

function explainConflict(status: LocalHourLog['status'] | undefined): string {
  const decision = status ? TUTOR_DECISION[status] : undefined

  if (!decision) {
    return 'Este registro cambió en el servidor mientras no tenías conexión, así que tu edición no se guardó.'
  }
  return `Tu tutor ${decision} estas horas mientras no tenías conexión, así que el cambio que hiciste no se guardó. Lo que ves ahora es lo que quedó registrado.`
}

export async function applyResults(
  results: SyncOperationResult[],
  localIds: Map<string, number>,
): Promise<void> {
  for (const result of results) {
    const localId = localIds.get(result.clientOpId)

    if (result.status === 'applied' && result.server) {
      await applyApplied(result.server, localId)
      continue
    }

    if (result.status === 'conflict' && result.server) {
      await applyConflict(result.server, localId)
      continue
    }

    const targetId = localId ?? result.server?.id
    if (targetId != null) {
      // Va a syncNote, no a reviewNote: el motivo de un rechazo de
      // sincronización no es el juicio del tutor, y pisarlo le borraba al
      // estudiante la única explicación que le importa cuando la hora
      // venía rechazada de verdad.
      await db.hourLogs.update(targetId, { syncState: 'failed', syncNote: result.reason })
    }
  }
}
