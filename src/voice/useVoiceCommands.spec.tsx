import { act, renderHook } from '@testing-library/react'
import Swal from 'sweetalert2'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VoiceCommand } from './commands'
import { useVoiceCommands } from './useVoiceCommands'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }))

class FakeRecognition {
  static readonly instances: FakeRecognition[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    FakeRecognition.instances.push(this)
  }
}

function heard(transcript: string) {
  const recognizer = FakeRecognition.instances.at(-1)!
  act(() => recognizer.onresult?.({ results: [[{ transcript }]] }))
}

const run = vi.fn()
const commands: VoiceCommand[] = [{ id: 'ofertas', phrases: ['ofertas'], run }]

beforeEach(() => {
  FakeRecognition.instances.length = 0
  run.mockClear()
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useVoiceCommands', () => {
  it('se marca como no soportado cuando el navegador no tiene reconocimiento de voz', () => {
    vi.unstubAllGlobals()
    const { result } = renderHook(() => useVoiceCommands(commands))
    expect(result.current.supported).toBe(false)
  })

  it('escucha en español y ejecuta el comando que se reconoce', () => {
    const { result } = renderHook(() => useVoiceCommands(commands))

    act(() => result.current.toggle())
    expect(result.current.listening).toBe(true)
    expect(FakeRecognition.instances.at(-1)!.lang).toBe('es-MX')
    expect(FakeRecognition.instances.at(-1)!.start).toHaveBeenCalledOnce()

    heard('Ir a ofertas')
    expect(run).toHaveBeenCalledOnce()
    expect(result.current.lastHeard).toBe('Ir a ofertas')
  })

  it('avisa cuando lo que se dijo no es un comando', () => {
    const { result } = renderHook(() => useVoiceCommands(commands))
    act(() => result.current.toggle())

    heard('hola mundo')

    expect(run).not.toHaveBeenCalled()
    expect(result.current.error).toContain('hola mundo')
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', title: 'No reconocí ese comando', html: expect.stringContaining('hola mundo') }),
    )
  })

  it('muestra el error del micrófono en una alerta completa, sin truncar', () => {
    const { result } = renderHook(() => useVoiceCommands(commands))
    act(() => result.current.toggle())

    act(() => FakeRecognition.instances.at(-1)!.onerror?.({ error: 'not-allowed' }))

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        title: 'Problema con el micrófono',
        html: 'Permite el uso del micrófono en el navegador',
      }),
    )
  })

  it('traduce el error de permiso del micrófono a un mensaje útil', () => {
    const { result } = renderHook(() => useVoiceCommands(commands))
    act(() => result.current.toggle())

    act(() => FakeRecognition.instances.at(-1)!.onerror?.({ error: 'not-allowed' }))

    expect(result.current.error).toBe('Permite el uso del micrófono en el navegador')
    expect(result.current.listening).toBe(false)
  })
})
