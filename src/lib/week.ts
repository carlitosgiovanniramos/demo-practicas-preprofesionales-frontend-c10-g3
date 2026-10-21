/** Hoy en formato YYYY-MM-DD según la fecha local del usuario (lo que espera un <input type="date">). */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Lunes de la semana que contiene `isoDate` (YYYY-MM-DD). Cálculo en UTC, igual que las jornadas
 * que guarda el backend como medianoche UTC. Devuelve '' si no hay fecha.
 */
export function mondayOf(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - daysSinceMonday)
  return date.toISOString().slice(0, 10)
}
