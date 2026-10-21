/** Parsea una fecha ISO como fecha local, no como medianoche UTC. */
export function parseLocalDate(value: string): Date {
  const [datePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Fecha corta en español (p. ej. 03 mar 2026). Si no es válida, devuelve el texto original. */
export function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

/** Rango de fechas "inicio – fin" para mostrar un periodo. */
export function formatPeriod(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
}
