import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalDocument, type LocalPlacement } from '@/offline/db'

/** Documentos locales de una práctica. `undefined` mientras no hay práctica o carga. */
export function usePlacementDocuments(placement: LocalPlacement | null | undefined): LocalDocument[] | undefined {
  return useLiveQuery<LocalDocument[] | undefined>(async () => {
    if (!placement) return undefined
    return db.documents.where('placementId').equals(placement.id).toArray()
  }, [placement?.id])
}
