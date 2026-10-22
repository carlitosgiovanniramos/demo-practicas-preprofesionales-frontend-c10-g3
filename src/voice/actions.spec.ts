import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNew, searchFor, submitForm, writeText } from './actions'

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('searchFor', () => {
  it('escribe el texto en el buscador de la pantalla y lo enfoca', () => {
    document.body.innerHTML = '<input data-shortcut-search aria-label="Buscar" />'
    const input = document.querySelector<HTMLInputElement>('input')!
    const onInput = vi.fn()
    input.addEventListener('input', onInput)

    expect(searchFor('Ana')).toBe(true)

    expect(input.value).toBe('Ana')
    expect(onInput).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(input)
  })

  it('no hace nada si la pantalla no tiene buscador', () => {
    expect(searchFor('Ana')).toBe(false)
  })
})

describe('createNew', () => {
  it('pulsa el botón de crear de la pantalla', () => {
    const onClick = vi.fn()
    document.body.innerHTML = '<button data-shortcut-new>Nuevo</button>'
    document.querySelector('button')!.addEventListener('click', onClick)

    expect(createNew()).toBe(true)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('informa cuando la pantalla no tiene nada que crear', () => {
    expect(createNew()).toBe(false)
  })
})

describe('submitForm', () => {
  it('envía el formulario donde está el foco', () => {
    document.body.innerHTML = `
      <form><input id="a" /><button type="submit">Guardar</button></form>
      <form><input id="b" /><button type="submit">Otro</button></form>`
    const second = document.querySelectorAll('form')[1]
    const onSubmit = vi.fn((event: Event) => event.preventDefault())
    second.addEventListener('submit', onSubmit)
    document.getElementById('b')!.focus()

    expect(submitForm()).toBe(true)
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('no envía un formulario que está deshabilitado mientras se guarda', () => {
    document.body.innerHTML = '<form><button type="submit" disabled>Guardando…</button></form>'
    expect(submitForm()).toBe(false)
  })
})

describe('writeText', () => {
  it('añade el texto dictado al campo que tiene el foco', () => {
    document.body.innerHTML = '<textarea>Hola</textarea>'
    const area = document.querySelector('textarea')!
    area.focus()

    expect(writeText('equipo')).toBe(true)
    expect(area.value).toBe('Hola equipo')
  })

  it('no escribe si el foco no está en un campo de texto', () => {
    document.body.innerHTML = '<button>Ver</button>'
    document.querySelector('button')!.focus()

    expect(writeText('hola')).toBe(false)
  })
})
