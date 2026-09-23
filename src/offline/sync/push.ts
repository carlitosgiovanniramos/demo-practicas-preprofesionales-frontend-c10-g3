import { api } from '@/api/client'
import { db, type OutboxEntry } from '@/offline/db'
import { applyResults, type SyncOperationResult } from './conflict'
import { setStatus } from './status'

export async function enqueue(
  op: Omit<OutboxEntry, 'id' | 'clientOpId' | 'createdAt' | 'attempts' | 'lastError'>,
): Promise<void> {
  const entry: OutboxEntry = {
    ...op,
    clientOpId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  }

  await db.transaction('rw', [db.outbox, db.hourLogs], async () => {
    await db.outbox.add(entry)
    const rowId = entry.payload.id
    if (typeof rowId === 'number') {
      await db.hourLogs.update(rowId, { syncState: 'queued' })
    }
  })

  // Sin esto, el contador "N pendientes" solo se recalcula tras un push
  // exitoso (scheduler.ts:34) y jamás refleja lo que se acaba de encolar
  // mientras no hay conexión.
  setStatus({ pending: await db.outbox.count() })
}

export async function pushOutbox(): Promise<{ applied: number; failed: number }> {
  const entries = await db.outbox.orderBy('createdAt').limit(500).toArray()
  if (entries.length === 0) return { applied: 0, failed: 0 }

  const ops = entries.map((e) => ({
    clientOpId: e.clientOpId,
    entity: e.entity,
    op: e.op,
    baseVersion: e.baseVersion,
    payload: e.payload,
  }))

  const localIds = new Map(entries.map((e) => [e.clientOpId, Number(e.payload.id)]))

  const { results } = await api<{ results: SyncOperationResult[] }>('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ ops }),
  })
  const attemptedClientOpIds = new Set(entries.map((entry) => entry.clientOpId))
  const correlatedResults = results.filter((result) => attemptedClientOpIds.has(result.clientOpId))
  const confirmedIds = new Set(correlatedResults.map((result) => result.clientOpId))

  await db.transaction('rw', [db.hourLogs, db.outbox], async () => {
    await applyResults(correlatedResults, localIds)
    await db.outbox.bulkDelete(entries.filter((entry) => confirmedIds.has(entry.clientOpId)).map((entry) => entry.id as number))
  })

  return {
    applied: correlatedResults.filter((result) => result.status === 'applied').length,
    failed: correlatedResults.filter((result) => result.status !== 'applied').length,
  }
}
