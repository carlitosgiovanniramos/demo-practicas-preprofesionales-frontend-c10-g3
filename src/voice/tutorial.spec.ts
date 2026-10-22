import Swal from 'sweetalert2'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markVoiceTutorialShown, showVoiceTutorial, shouldShowVoiceTutorial } from './tutorial'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(() => Promise.resolve({ isConfirmed: true })) } }))

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('voice tutorial', () => {
  it('se muestra la primera vez que se usa el micrófono en la sesión', () => {
    expect(shouldShowVoiceTutorial()).toBe(true)
    markVoiceTutorialShown()
    expect(shouldShowVoiceTutorial()).toBe(false)
  })

  it('explica con ejemplos cómo navegar, crear, llenar, pulsar botones y usar manos libres', async () => {
    await showVoiceTutorial()

    const options = vi.mocked(Swal.fire).mock.calls[0][0] as unknown as { html: string; title: string }
    expect(options.title).toContain('comandos de voz')
    for (const example of ['ofertas', 'registrar horas', 'llenar', 'clic en', 'manos libres', 'F2']) {
      expect(options.html).toContain(example)
    }
  })

  it('al mostrarse queda marcado para no repetirse en la sesión', async () => {
    await showVoiceTutorial()
    expect(shouldShowVoiceTutorial()).toBe(false)
  })
})
