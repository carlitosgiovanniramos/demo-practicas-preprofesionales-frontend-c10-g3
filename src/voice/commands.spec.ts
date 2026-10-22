import { describe, expect, it, vi } from 'vitest'
import { buildLoginCommands, buildVoiceCommands, matchCommand, matchVoice, normalizeSpeech, type VoiceCommand } from './commands'

function makeActions() {
  return {
    navigate: vi.fn(),
    openHelp: vi.fn(),
    stepRecommendation: vi.fn(),
    search: vi.fn(() => true),
    create: vi.fn(() => true),
    submit: vi.fn(() => true),
    write: vi.fn(() => true),
    fill: vi.fn(() => true),
    nextField: vi.fn(() => true),
    clear: vi.fn(() => true),
    clickButton: vi.fn(() => true),
  }
}

describe('normalizeSpeech', () => {
  it('quita tildes, mayúsculas, signos y espacios sobrantes', () => {
    expect(normalizeSpeech('  ¡Mis Horas!  ')).toBe('mis horas')
    expect(normalizeSpeech('Acreditación')).toBe('acreditacion')
  })
})

describe('matchCommand', () => {
  const run = vi.fn()
  const commands: VoiceCommand[] = [{ id: 'ofertas', phrases: ['Ofertas'], run }]

  it('encuentra el comando por la frase dicha', () => {
    expect(matchCommand('ofertas', commands)?.id).toBe('ofertas')
  })

  it('acepta verbos de navegación delante de la frase', () => {
    expect(matchCommand('ir a ofertas', commands)?.id).toBe('ofertas')
    expect(matchCommand('abrir OFERTAS.', commands)?.id).toBe('ofertas')
  })

  it('no inventa coincidencias parciales', () => {
    expect(matchCommand('ofertas de trabajo', commands)).toBeNull()
    expect(matchCommand('', commands)).toBeNull()
  })
})

describe('matchVoice', () => {
  const search = vi.fn()
  const commands: VoiceCommand[] = [
    { id: 'search', phrases: [], prefixes: ['buscar', 'busca'], run: search },
    { id: 'ofertas', phrases: ['ofertas'], run: vi.fn() },
  ]

  it('separa la acción de su argumento respetando mayúsculas y tildes del texto dictado', () => {
    const match = matchVoice('Buscar Ana Pérez', commands)
    expect(match?.command.id).toBe('search')
    expect(match?.argument).toBe('Ana Pérez')
  })

  it('una frase con argumento sin argumento no coincide', () => {
    expect(matchVoice('buscar', commands)).toBeNull()
  })

  it('las frases exactas siguen funcionando', () => {
    expect(matchVoice('ofertas', commands)?.command.id).toBe('ofertas')
  })
})

describe('buildLoginCommands', () => {
  it('inicia sesión con voz y llena el correo y la contraseña por su nombre', () => {
    const actions = { submit: vi.fn(() => true), fillByHint: vi.fn(() => true) }
    const commands = buildLoginCommands(actions)

    matchVoice('iniciar sesion', commands)?.command.run()
    const email = matchVoice('correo ana arroba uta', commands)
    email?.command.run(email.argument)
    const password = matchVoice('contraseña secreta', commands)
    password?.command.run(password.argument)

    expect(actions.submit).toHaveBeenCalledOnce()
    expect(actions.fillByHint).toHaveBeenNthCalledWith(1, 'correo', 'ana arroba uta')
    expect(actions.fillByHint).toHaveBeenNthCalledWith(2, 'contraseña', 'secreta')
  })
})

describe('buildVoiceCommands', () => {
  const actions = makeActions()
  const commands = buildVoiceCommands(
    [
      { path: '/horas', label: 'Mis horas' },
      { path: '/ofertas', label: 'Ofertas' },
    ],
    actions,
  )

  it('navega a cada sección de la barra lateral por su nombre', () => {
    matchVoice('ir a mis horas', commands)?.command.run()
    expect(actions.navigate).toHaveBeenLastCalledWith('/horas')
  })

  it('abre la ayuda y mueve el carrusel de recomendaciones', () => {
    matchVoice('ayuda', commands)?.command.run()
    matchVoice('siguiente recomendacion', commands)?.command.run()
    matchVoice('anterior', commands)?.command.run()
    expect(actions.openHelp).toHaveBeenCalledOnce()
    expect(actions.stepRecommendation).toHaveBeenNthCalledWith(1, 1)
    expect(actions.stepRecommendation).toHaveBeenNthCalledWith(2, -1)
  })

  it('crea un registro nuevo con "nuevo"', () => {
    matchVoice('nuevo registro', commands)?.command.run()
    expect(actions.create).toHaveBeenCalledOnce()
  })

  it('reconoce las acciones de crear con el nombre que ve cada rol en pantalla', () => {
    actions.create.mockClear()
    matchVoice('registrar horas', commands)?.command.run()
    matchVoice('Registrar hora', commands)?.command.run()
    matchVoice('publicar oferta', commands)?.command.run()
    expect(actions.create).toHaveBeenCalledTimes(3)
  })

  it('busca con el texto dicho después de "buscar"', () => {
    const match = matchVoice('buscar practica de datos', commands)
    match?.command.run(match.argument)
    expect(actions.search).toHaveBeenCalledWith('practica de datos')
  })

  it('escribe en el campo enfocado con "escribir"', () => {
    const match = matchVoice('escribir Hola equipo', commands)
    match?.command.run(match.argument)
    expect(actions.write).toHaveBeenCalledWith('Hola equipo')
  })

  it('llena un campo nombrado, pasa de campo y lo borra con la voz', () => {
    matchVoice('llenar comentario buen trabajo', commands)?.command.run('comentario buen trabajo')
    matchVoice('siguiente campo', commands)?.command.run()
    matchVoice('campo anterior', commands)?.command.run()
    matchVoice('borrar campo', commands)?.command.run()
    expect(actions.fill).toHaveBeenCalledWith('comentario buen trabajo')
    expect(actions.nextField).toHaveBeenNthCalledWith(1, 1)
    expect(actions.nextField).toHaveBeenNthCalledWith(2, -1)
    expect(actions.clear).toHaveBeenCalledOnce()
  })

  it('pulsa un botón por su nombre con "clic en" o "pulsar"', () => {
    matchVoice('clic en guardar cambios', commands)?.command.run('guardar cambios')
    matchVoice('pulsar cancelar', commands)?.command.run('cancelar')
    expect(actions.clickButton).toHaveBeenNthCalledWith(1, 'guardar cambios')
    expect(actions.clickButton).toHaveBeenNthCalledWith(2, 'cancelar')
  })

  it('envía el formulario con "enviar" o "guardar"', () => {
    matchVoice('guardar', commands)?.command.run()
    matchVoice('enviar', commands)?.command.run()
    expect(actions.submit).toHaveBeenCalledTimes(2)
  })

  it('confirma con el nombre de la sección al navegar', () => {
    const match = matchVoice('ofertas', commands)
    expect(match?.command.feedback?.()).toBe('Abriendo Ofertas')
  })
})
