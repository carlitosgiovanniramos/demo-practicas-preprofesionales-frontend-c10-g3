import { describe, expect, it } from 'vitest'
import { HOUR_LOG_HOURS_MESSAGE, HOUR_LOG_LIMITS, hourLogFieldsError } from './hour-log-rules'

const window = { startTime: '08:00', endTime: '12:00' }

// D-06: espejo de src/hour-log/hour-log.rules.ts del backend. Los bordes se derivan
// de HOUR_LOG_LIMITS: cambiar el límite en un solo lugar mueve también estas pruebas.
describe('regla única de horas por registro (D-06)', () => {
  it('fija 0.5 a 8 horas, igual que el backend', () => {
    expect(HOUR_LOG_LIMITS).toEqual({ minHours: 0.5, maxHours: 8 })
  })

  it('acepta exactamente los dos bordes', () => {
    expect(hourLogFieldsError(String(HOUR_LOG_LIMITS.minHours), window.startTime, window.endTime)).toBeNull()
    expect(hourLogFieldsError(String(HOUR_LOG_LIMITS.maxHours), window.startTime, window.endTime)).toBeNull()
  })

  it.each([
    '0',
    String(HOUR_LOG_LIMITS.minHours - 0.1),
    String(HOUR_LOG_LIMITS.maxHours + 0.5),
    '12',
  ])('rechaza %s horas con el mensaje único', (hours) => {
    expect(hourLogFieldsError(hours, window.startTime, window.endTime)).toBe(HOUR_LOG_HOURS_MESSAGE)
  })

  it('usa el mensaje exacto que ve el estudiante', () => {
    expect(HOUR_LOG_HOURS_MESSAGE).toBe('Las horas deben estar entre 0.5 y 8 por registro')
  })

  it('pide un número cuando el campo está vacío o no es numérico', () => {
    expect(hourLogFieldsError('', window.startTime, window.endTime)).toBe('Ingresa un número de horas válido')
    expect(hourLogFieldsError('abc', window.startTime, window.endTime)).toBe('Ingresa un número de horas válido')
  })

  it('rechaza una hora de fin que no es posterior a la de inicio', () => {
    expect(hourLogFieldsError('4', '12:00', '08:00')).toBe('La hora de fin debe ser posterior a la de inicio')
  })
})
