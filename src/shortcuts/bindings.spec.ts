import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildActions,
  findConflict,
  loadOverrides,
  matchSequence,
  normalizeEventKey,
  parseKeys,
  resolveBindings,
  saveOverrides,
} from './bindings'

describe('parseKeys', () => {
  it('accepts a single key and a two-step sequence', () => {
    expect(parseKeys('/')).toEqual(['/'])
    expect(parseKeys('g  O')).toEqual(['g', 'o'])
  })

  it('rejects empty text, more than two steps and multi-character keys', () => {
    expect(parseKeys('   ')).toBeNull()
    expect(parseKeys('g o k')).toBeNull()
    expect(parseKeys('Escape')).toBeNull()
  })
})

describe('normalizeEventKey', () => {
  it('lowercases letters and ignores keys that are not printable characters', () => {
    expect(normalizeEventKey({ key: 'N' })).toBe('n')
    expect(normalizeEventKey({ key: 'Shift' })).toBeNull()
    expect(normalizeEventKey({ key: 'Enter' })).toBeNull()
  })
})

describe('matchSequence', () => {
  const bindings = { search: ['/'], help: ['?'], go: ['g', 'o'] }

  it('matches a complete single-key binding', () => {
    expect(matchSequence(['/'], bindings)).toEqual({ kind: 'match', id: 'search' })
  })

  it('waits when the buffer is the start of a sequence', () => {
    expect(matchSequence(['g'], bindings)).toEqual({ kind: 'prefix' })
  })

  it('matches the completed sequence', () => {
    expect(matchSequence(['g', 'o'], bindings)).toEqual({ kind: 'match', id: 'go' })
  })

  it('reports none when nothing can match', () => {
    expect(matchSequence(['x'], bindings)).toEqual({ kind: 'none' })
  })
})

describe('buildActions and resolveBindings', () => {
  it('adds one navigation action per sidebar item and keeps the defaults', () => {
    const actions = buildActions(3)

    expect(actions.map((action) => action.id)).toEqual(['search', 'new', 'help', 'nav-1', 'nav-2', 'nav-3'])
    expect(actions.find((action) => action.id === 'nav-2')?.defaultKeys).toBe('2')
  })

  it('applies user overrides on top of the defaults', () => {
    const actions = buildActions(1)

    const bindings = resolveBindings(actions, { search: ['k'] })

    expect(bindings.search).toEqual(['k'])
    expect(bindings.help).toEqual(['?'])
  })
})

describe('findConflict', () => {
  it('returns the label of the other action that already uses the same keys', () => {
    const actions = buildActions(0)
    const bindings = resolveBindings(actions, {})

    expect(findConflict(actions, bindings, 'new', ['/'])).toBe('Ir al buscador de la pantalla')
    expect(findConflict(actions, bindings, 'new', ['n'])).toBeNull()
  })
})

describe('overrides storage', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads overrides, discarding invalid entries', () => {
    saveOverrides({ search: ['k'] })
    localStorage.setItem('shortcuts:v1', JSON.stringify({ search: ['k'], help: ['toolong', 'x', 'y'] }))

    expect(loadOverrides()).toEqual({ search: ['k'] })
  })

  it('returns no overrides when storage is empty or corrupted', () => {
    expect(loadOverrides()).toEqual({})
    localStorage.setItem('shortcuts:v1', '{not json')
    expect(loadOverrides()).toEqual({})
  })
})
