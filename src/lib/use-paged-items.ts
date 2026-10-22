import { useState } from 'react'
import { type Page, paginate } from './paginate'

/**
 * Página actual de una lista filtrada. La página vuelve a la primera cuando cambia
 * `resetKey` (por ejemplo, el texto buscado o un filtro), sin un efecto extra.
 */
export type PagedItems<T> = Page<T> & { setPage: (page: number) => void }

export function usePagedItems<T>(
  items: T[] | undefined,
  pageSize: number,
  resetKey: string,
): PagedItems<T> | undefined {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const requestedPage = state.key === resetKey ? state.page : 1

  if (items === undefined) return undefined

  const page = paginate(items, requestedPage, pageSize)
  return {
    ...page,
    setPage: (next: number) => setState({ key: resetKey, page: next }),
  }
}
