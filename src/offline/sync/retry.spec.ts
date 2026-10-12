import { describe, expect, it } from 'vitest'
import { MAX_DELAY_MS, backoffDelayMs, maxPushAttempts } from './retry'

describe('backoffDelayMs', () => {
  it('dobla la espera en cada intento: 1s, 2s, 4s, 8s', () => {
    expect([1, 2, 3, 4].map(backoffDelayMs)).toEqual([1_000, 2_000, 4_000, 8_000])
  })

  // Sin tope, una caída larga dejaría al estudiante esperando minutos entre
  // intentos y el reintento dejaría de servir para algo.
  it('no crece sin límite: se queda en el tope', () => {
    expect(backoffDelayMs(99)).toBe(MAX_DELAY_MS)
    expect(backoffDelayMs(99)).toBeLessThanOrEqual(MAX_DELAY_MS)
  })

  it('la primera espera nunca es cero', () => {
    expect(backoffDelayMs(1)).toBeGreaterThan(0)
  })
})

describe('maxPushAttempts', () => {
  it('es un tope configurable y razonable', () => {
    expect(Number.isInteger(maxPushAttempts)).toBe(true)
    expect(maxPushAttempts).toBeGreaterThan(1)
  })
})
