import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalPlacement } from '@/offline/db'

/** Lee una práctica desde Dexie por id: `undefined` mientras carga, `null` si no existe. */
export function usePlacementById(placementId: number): LocalPlacement | null | undefined {
  return useLiveQuery<LocalPlacement | null | undefined>(async () => {
    const found = await db.placements.get(placementId)
    return found ?? null
  }, [placementId])
}
