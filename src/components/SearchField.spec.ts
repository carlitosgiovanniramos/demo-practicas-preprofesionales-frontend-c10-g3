import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeSearch } from './SearchField'

describe('matchesSearch', () => {
  it('matches everything when the query is empty or blank', () => {
    expect(matchesSearch('Ingeniería', '')).toBe(true)
    expect(matchesSearch('Ingeniería', '   ')).toBe(true)
  })

  it('ignores case and accents', () => {
    expect(matchesSearch('Ingeniería de Software', 'ingenieria')).toBe(true)
    expect(matchesSearch('Ingenieria', 'INGENIERÍA')).toBe(true)
  })

  it('returns false when the text does not contain the query', () => {
    expect(matchesSearch('Soporte técnico', 'contabilidad')).toBe(false)
  })
})

describe('normalizeSearch', () => {
  it('removes accents and surrounding spaces', () => {
    expect(normalizeSearch('  Análisis ')).toBe('analisis')
  })
})
