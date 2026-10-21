import { describe, expect, it } from 'vitest'
import { mondayOf, todayIsoDate } from './week'

describe('mondayOf', () => {
  it('devuelve el lunes de la semana de un miércoles', () => {
    expect(mondayOf('2026-04-08')).toBe('2026-04-06')
  })

  it('devuelve el mismo día si ya es lunes', () => {
    expect(mondayOf('2026-04-06')).toBe('2026-04-06')
  })

  it('devuelve el lunes anterior si es domingo', () => {
    expect(mondayOf('2026-04-12')).toBe('2026-04-06')
  })

  it('devuelve cadena vacía sin fecha', () => {
    expect(mondayOf('')).toBe('')
  })
})

describe('todayIsoDate', () => {
  it('formatea la fecha local como YYYY-MM-DD con ceros', () => {
    expect(todayIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
