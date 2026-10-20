/**
 * Regla única de qué es un registro de horas válido (D-06).
 *
 * Espejo de `src/hour-log/hour-log.rules.ts` del backend. Las dos copias deben
 * tener el mismo valor: cambiar el límite exige editar ambos repos.
 */
export const HOUR_LOG_LIMITS = Object.freeze({ minHours: 0.5, maxHours: 8 })

export const HOUR_LOG_HOURS_MESSAGE = `Las horas deben estar entre ${HOUR_LOG_LIMITS.minHours} y ${HOUR_LOG_LIMITS.maxHours} por registro`

const MISSING_HOURS_MESSAGE = 'Ingresa un número de horas válido'
const TIME_ORDER_MESSAGE = 'La hora de fin debe ser posterior a la de inicio'

/** Motivo por el que el registro no es válido en el formulario, o `null` si lo es. */
export function hourLogFieldsError(hours: string, startTime: string, endTime: string): string | null {
  const value = Number(hours)
  if (!hours || Number.isNaN(value)) {
    return MISSING_HOURS_MESSAGE
  }
  // `!(a && b)` también rechaza NaN, igual que en el backend.
  if (!(value >= HOUR_LOG_LIMITS.minHours && value <= HOUR_LOG_LIMITS.maxHours)) {
    return HOUR_LOG_HOURS_MESSAGE
  }
  if (startTime && endTime && endTime <= startTime) {
    return TIME_ORDER_MESSAGE
  }
  return null
}
