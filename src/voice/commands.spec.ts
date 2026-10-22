import { describe, expect, it, vi } from 'vitest'
import { buildVoiceCommands, matchCommand, normalizeSpeech, type VoiceCommand } from './commands'

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

describe('buildVoiceCommands', () => {
  const actions = {
    navigate: vi.fn(),
    openHelp: vi.fn(),
    stepRecommendation: vi.fn(),
  }
  const commands = buildVoiceCommands(
    [
      { path: '/horas', label: 'Mis horas' },
      { path: '/ofertas', label: 'Ofertas' },
    ],
    actions,
  )

  it('navega a cada sección de la barra lateral por su nombre', () => {
    matchCommand('ir a mis horas', commands)?.run()
    expect(actions.navigate).toHaveBeenLastCalledWith('/horas')
  })

  it('abre la ayuda de atajos y mueve el carrusel de recomendaciones', () => {
    matchCommand('ayuda', commands)?.run()
    matchCommand('siguiente recomendacion', commands)?.run()
    matchCommand('anterior', commands)?.run()
    expect(actions.openHelp).toHaveBeenCalledOnce()
    expect(actions.stepRecommendation).toHaveBeenNthCalledWith(1, 1)
    expect(actions.stepRecommendation).toHaveBeenNthCalledWith(2, -1)
  })
})
