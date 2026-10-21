import { describe, expect, it } from 'vitest'
import { formatDate, formatPeriod, parseLocalDate } from './date'

// Caracterización: formatDate y formatPeriod se comparten entre páginas (antes eran copias).
describe('formatDate and formatPeriod', () => {
  it('formats a valid ISO date in short Spanish form', () => {
    expect(formatDate('2026-03-02')).toBe(new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(2026, 2, 2)))
  })

  it('returns the original text when the date is invalid', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha')
  })

  it('joins a period with an en dash', () => {
    expect(formatPeriod('2026-03-02', '2026-06-30')).toBe(`${formatDate('2026-03-02')} – ${formatDate('2026-06-30')}`)
  })
})

describe('parseLocalDate', () => {
  it('parses a date-only ISO string as local midnight, not UTC midnight', () => {
    const parsed = parseLocalDate('2026-01-01')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(1)
  })

  it('ignores a time component if present', () => {
    const parsed = parseLocalDate('2026-08-04T15:30:00.000Z')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(4)
  })
})
