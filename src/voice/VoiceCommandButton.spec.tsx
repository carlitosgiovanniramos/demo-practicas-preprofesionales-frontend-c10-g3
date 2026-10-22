import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceCommandButton } from './VoiceCommandButton'

afterEach(() => {
  vi.unstubAllGlobals()
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
