import { beforeEach, describe, expect, it } from 'vitest'
import { buildActions } from './bindings'
import { moveItemFocus } from './listFocus'

describe('buildActions per role', () => {
  it('gives the student the "registrar horas" primary action', () => {
    const newAction = buildActions(5, 'STUDENT').find((action) => action.id === 'new')

    expect(newAction?.label).toBe('Registrar horas')
    expect(newAction?.defaultKeys).toBe('n')
  })

  it('gives the company the "publicar oferta" primary action', () => {
    const newAction = buildActions(1, 'COMPANY').find((action) => action.id === 'new')

    expect(newAction?.label).toBe('Publicar oferta')
  })

  it('does not offer a primary action to the tutor or the coordinator, who have nothing to create', () => {
    expect(buildActions(1, 'TUTOR').some((action) => action.id === 'new')).toBe(false)
    expect(buildActions(1, 'COORDINATOR').some((action) => action.id === 'new')).toBe(false)
  })

  it('keeps search, help and the menu numbers for every role', () => {
    for (const role of ['STUDENT', 'TUTOR', 'COMPANY', 'COORDINATOR'] as const) {
      const ids = buildActions(2, role).map((action) => action.id)
      expect(ids).toEqual(expect.arrayContaining(['search', 'help', 'nav-1', 'nav-2']))
    }
  })
})

describe('moveItemFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-shortcut-item><button id="first">Aprobar</button></div>
      <div data-shortcut-item><button id="second">Aprobar</button></div>
      <div data-shortcut-item><button id="third">Aprobar</button></div>`
  })

  it('goes to the first item from nothing focused, then steps forward and back', () => {
    expect(moveItemFocus(1)).toBe(true)
    expect(document.activeElement?.id).toBe('first')

    moveItemFocus(1)
    expect(document.activeElement?.id).toBe('second')

    moveItemFocus(-1)
    expect(document.activeElement?.id).toBe('first')
  })

  it('stops at the edges instead of wrapping around', () => {
    moveItemFocus(-1)
    expect(document.activeElement?.id).toBe('first')

    document.getElementById('third')?.focus()
    moveItemFocus(1)
    expect(document.activeElement?.id).toBe('third')
  })

  it('keeps the place in the list when the focus is lost, e.g. a button disabled after approving', () => {
    moveItemFocus(1)
    moveItemFocus(1)
    ;(document.activeElement as HTMLElement).blur()

    moveItemFocus(1)

    expect(document.activeElement?.id).toBe('third')
  })

  it('reports false when the screen has no items', () => {
    document.body.innerHTML = '<p>sin filas</p>'

    expect(moveItemFocus(1)).toBe(false)
  })
})
