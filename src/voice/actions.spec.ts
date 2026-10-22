import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clickButtonNamed,
  clearField,
  createNew,
  dictateIntoFocused,
  fillField,
  nextField,
  searchFor,
  submitForm,
  writeText,
} from './actions'

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

describe('fillField', () => {
  it('escribe en el campo cuyo nombre se dice, sustituyendo lo que había', () => {
    document.body.innerHTML = `
      <form>
        <label for="c">Comentario</label><textarea id="c">antes</textarea>
        <label for="n">Nombre</label><input id="n" />
      </form>`
    const comment = document.getElementById('c') as HTMLTextAreaElement

    expect(fillField('Comentario muy buen trabajo')).toBe(true)

    expect(comment.value).toBe('muy buen trabajo')
    expect(document.activeElement).toBe(comment)
  })

  it('reconoce campos con nombre de varias palabras, eligiendo el nombre más largo', () => {
    document.body.innerHTML = `
      <form>
        <label for="a">Motivación</label><input id="a" />
        <label for="b">Motivación del estudiante</label><input id="b" />
      </form>`

    fillField('motivación del estudiante quiero aprender')

    expect((document.getElementById('b') as HTMLInputElement).value).toBe('quiero aprender')
    expect((document.getElementById('a') as HTMLInputElement).value).toBe('')
  })

  it('informa cuando no hay un campo con ese nombre', () => {
    document.body.innerHTML = '<form><label for="n">Nombre</label><input id="n" /></form>'
    expect(fillField('correo hola')).toBe(false)
  })
})

describe('dictation and field formats', () => {
  it('reemplaza el valor del campo enfocado con lo dictado', () => {
    document.body.innerHTML = '<form><input id="a" value="viejo" /></form>'
    document.getElementById('a')!.focus()

    expect(dictateIntoFocused('nuevo texto')).toBe(true)
    expect((document.getElementById('a') as HTMLInputElement).value).toBe('nuevo texto')
  })

  it('escribe la hora dictada en formato HH:mm en un campo de hora', () => {
    document.body.innerHTML = '<form><input id="t" type="time" /></form>'
    document.getElementById('t')!.focus()

    dictateIntoFocused('2:35')
    expect((document.getElementById('t') as HTMLInputElement).value).toBe('02:35')

    dictateIntoFocused('14 30')
    expect((document.getElementById('t') as HTMLInputElement).value).toBe('14:30')
  })

  it('convierte una fecha dictada en formato AAAA-MM-DD para un campo de fecha', () => {
    document.body.innerHTML = '<form><input id="d" type="date" /></form>'
    document.getElementById('d')!.focus()

    dictateIntoFocused('5/3/2026')
    expect((document.getElementById('d') as HTMLInputElement).value).toBe('2026-03-05')
  })

  it('no escribe nada si no hay campo enfocado', () => {
    expect(dictateIntoFocused('hola')).toBe(false)
  })

  it('llena un campo de hora de cualquier página aunque no esté en un formulario', () => {
    document.body.innerHTML = '<label for="h">Hora de inicio</label><input id="h" type="time" />'

    expect(fillField('hora de inicio 2:35')).toBe(true)
    expect((document.getElementById('h') as HTMLInputElement).value).toBe('02:35')
  })
})

describe('nextField and clearField', () => {
  it('pasa el foco al campo siguiente o anterior del formulario', () => {
    document.body.innerHTML = '<form><input id="a" /><input id="b" /><input id="c" /></form>'
    document.getElementById('a')!.focus()

    expect(nextField(1)).toBe(true)
    expect(document.activeElement?.id).toBe('b')
    expect(nextField(-1)).toBe(true)
    expect(document.activeElement?.id).toBe('a')
  })

  it('borra el texto del campo enfocado', () => {
    document.body.innerHTML = '<form><input id="a" value="borrame" /></form>'
    document.getElementById('a')!.focus()

    expect(clearField()).toBe(true)
    expect((document.getElementById('a') as HTMLInputElement).value).toBe('')
  })
})

describe('clickButtonNamed', () => {
  it('pulsa el botón cuyo nombre se dice, aunque esté dentro de un formulario', () => {
    document.body.innerHTML = '<form><button type="button" id="g">Guardar cambios</button></form>'
    const onClick = vi.fn()
    document.getElementById('g')!.addEventListener('click', onClick)

    expect(clickButtonNamed('guardar cambios')).toBe(true)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('no pulsa nada si el nombre no coincide con ningún botón', () => {
    document.body.innerHTML = '<button>Guardar</button>'
    expect(clickButtonNamed('cancelar')).toBe(false)
  })

  it('no pulsa un botón deshabilitado', () => {
    document.body.innerHTML = '<button disabled>Guardar</button>'
    expect(clickButtonNamed('guardar')).toBe(false)
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
