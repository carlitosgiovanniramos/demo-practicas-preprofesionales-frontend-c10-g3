export interface Page<T> {
  /** Página efectiva, ya acotada entre la primera y la última. */
  page: number
  totalPages: number
  totalItems: number
  pageItems: T[]
  /** Primer y último número de elemento visibles (1-based); 0 y 0 si no hay elementos. */
  from: number
  to: number
}

/** Corta una lista en páginas de `pageSize` elementos. Acota `page` al rango válido. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const effectivePage = Math.min(Math.max(1, Math.floor(page)), totalPages)
  const start = (effectivePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return {
    page: effectivePage,
    totalPages,
    totalItems,
    pageItems,
    from: totalItems === 0 ? 0 : start + 1,
    to: totalItems === 0 ? 0 : start + pageItems.length,
  }
}
