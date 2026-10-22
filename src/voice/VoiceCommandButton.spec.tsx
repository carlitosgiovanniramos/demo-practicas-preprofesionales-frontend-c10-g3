import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VOICE_TOGGLE_EVENT } from './events'
import { VoiceCommandButton } from './VoiceCommandButton'
import { showVoiceTutorial, shouldShowVoiceTutorial } from './tutorial'

vi.mock('./tutorial', () => ({
  shouldShowVoiceTutorial: vi.fn(() => false),
  showVoiceTutorial: vi.fn(() => Promise.resolve()),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VoiceCommandButton with the voice shortcut', () => {
  it('la tecla de voz enciende y apaga el micrófono sin tocar el ratón', () => {
    vi.stubGlobal('SpeechRecognition', class {
      lang = ''
      continuous = false
      interimResults = false
      onresult = null
      onerror = null
      onend = null
      start = vi.fn()
      stop = vi.fn()
      abort = vi.fn()
    })
    render(<VoiceCommandButton getCommands={() => []} />)

    act(() => {
      window.dispatchEvent(new Event(VOICE_TOGGLE_EVENT))
    })
    expect(screen.getByRole('button', { name: 'Dejar de escuchar' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('VoiceCommandButton first-use tutorial', () => {
  it('la primera vez que se enciende en la sesión explica los comandos antes de escuchar', async () => {
    vi.stubGlobal('SpeechRecognition', class {
      lang = ''
      continuous = false
      interimResults = false
      onresult = null
      onerror = null
      onend = null
      start = vi.fn()
      stop = vi.fn()
      abort = vi.fn()
    })
    vi.mocked(shouldShowVoiceTutorial).mockReturnValueOnce(true)
    render(<VoiceCommandButton getCommands={() => []} />)

    await act(async () => {
      screen.getByRole('button', { name: 'Activar comandos de voz' }).click()
    })

    expect(showVoiceTutorial).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Dejar de escuchar' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('VoiceCommandButton hands-free mode', () => {
  it('ofrece el modo manos libres como botón que se puede encender', () => {
    vi.stubGlobal('SpeechRecognition', class {
      lang = ''
      continuous = false
      interimResults = false
      onresult = null
      onerror = null
      onend = null
      start = vi.fn()
      stop = vi.fn()
      abort = vi.fn()
    })
    localStorage.clear()
    render(<VoiceCommandButton getCommands={() => []} />)

    const button = screen.getByRole('button', { name: 'Activar modo manos libres' })
    act(() => button.click())

    expect(screen.getByRole('button', { name: 'Apagar modo manos libres' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('VoiceCommandButton', () => {
  it('se muestra apagado y explica la razón cuando el navegador no tiene reconocimiento de voz', () => {
    render(<VoiceCommandButton getCommands={() => []} />)

    const button = screen.getByRole('button', { name: 'Comandos de voz no disponibles' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('title')).toContain('Chrome o Edge')
  })

  it('ofrece activar el micrófono cuando el navegador lo soporta', () => {
    vi.stubGlobal('SpeechRecognition', class {})

    render(<VoiceCommandButton getCommands={() => []} />)

    expect(screen.getByRole('button', { name: 'Activar comandos de voz' }).getAttribute('aria-pressed')).toBe('false')
  })
})
