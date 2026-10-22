import { act, renderHook } from '@testing-library/react'
import Swal from 'sweetalert2'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VoiceCommand } from './commands'
import { speak } from '@/lib/speech'
import { useVoiceCommands } from './useVoiceCommands'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }))
vi.mock('@/lib/speech', () => ({ speak: vi.fn() }))

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
const getCommands = () => commands

beforeEach(async () => {
  localStorage.clear()
  FakeRecognition.instances.length = 0
  run.mockReset()
  run.mockReturnValue(undefined)
  vi.clearAllMocks()
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useVoiceCommands', () => {
  it('se marca como no soportado cuando el navegador no tiene reconocimiento de voz', () => {
    vi.unstubAllGlobals()
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    expect(result.current.supported).toBe(false)
  })

  it('escucha en español y ejecuta el comando que se reconoce', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))

    act(() => result.current.toggle())
    expect(result.current.listening).toBe(true)
    expect(FakeRecognition.instances.at(-1)!.lang).toBe('es-MX')

    heard('Ir a ofertas')
    expect(run).toHaveBeenCalledOnce()
    expect(result.current.lastHeard).toBe('Ir a ofertas')
  })

  it('pasa el argumento dictado al comando', () => {
    const search = vi.fn()
    const withSearch: VoiceCommand[] = [{ id: 'search', phrases: [], prefixes: ['buscar'], run: search }]
    const { result } = renderHook(() => useVoiceCommands(() => withSearch))
    act(() => result.current.toggle())

    heard('buscar Ana Pérez')

    expect(search).toHaveBeenCalledWith('Ana Pérez')
  })

  it('confirma en voz cuando el comando funciona, sin mostrar aviso visual', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggle())

    heard('ofertas')

    expect(speak).toHaveBeenCalledWith('Listo')
    expect(Swal.fire).not.toHaveBeenCalled()
  })

  it('avisa en un toast cuando la acción no se puede hacer en la pantalla', () => {
    run.mockReturnValue(false)
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggle())

    heard('ofertas')

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', toast: true, html: expect.stringContaining('No se pudo') }),
    )
    expect(speak).toHaveBeenCalledWith(expect.stringContaining('No se pudo'))
  })

  it('avisa cuando lo que se dijo no es un comando', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggle())

    heard('hola mundo')

    expect(run).not.toHaveBeenCalled()
    expect(result.current.error).toContain('hola mundo')
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', title: 'No reconocí ese comando', html: expect.stringContaining('hola mundo') }),
    )
  })

  it('lo que no es un comando se escribe en el campo enfocado (dictado)', () => {
    const fallback = vi.fn(() => true)
    const { result } = renderHook(() => useVoiceCommands(getCommands, { fallback }))
    act(() => result.current.toggle())

    heard('hora de inicio 2:35')

    expect(fallback).toHaveBeenCalledWith('hora de inicio 2:35')
    expect(Swal.fire).not.toHaveBeenCalled()
  })

  it('en modo manos libres actúa igual que el micrófono normal, sin palabra de activación', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggleHandsFree())

    heard('ofertas')
    expect(run).toHaveBeenCalledOnce()

    heard('asistente ofertas')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('en modo manos libres el silencio no genera alertas: solo vuelve a escuchar', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggleHandsFree())

    act(() => FakeRecognition.instances[0].onerror?.({ error: 'no-speech' }))
    act(() => FakeRecognition.instances[0].onend?.())

    expect(Swal.fire).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(500))
    expect(FakeRecognition.instances).toHaveLength(2)
    vi.useRealTimers()
  })

  it('en modo manos libres vuelve a escuchar cuando el reconocimiento termina', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggleHandsFree())
    expect(FakeRecognition.instances).toHaveLength(1)

    act(() => FakeRecognition.instances[0].onend?.())
    act(() => vi.advanceTimersByTime(500))

    expect(FakeRecognition.instances).toHaveLength(2)
    vi.useRealTimers()
  })

  it('al cargar la página el modo manos libres empieza apagado, aunque se haya usado antes', () => {
    localStorage.setItem('voice:handsFree', 'true')
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    expect(result.current.handsFree).toBe(false)
  })

  it('cerrar el micrófono al cambiar de pantalla no muestra ningún aviso', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggle())

    act(() => FakeRecognition.instances.at(-1)!.onerror?.({ error: 'aborted' }))

    expect(Swal.fire).not.toHaveBeenCalled()
  })

  it('muestra el error del micrófono en una alerta completa, sin truncar', () => {
    const { result } = renderHook(() => useVoiceCommands(getCommands))
    act(() => result.current.toggle())

    act(() => FakeRecognition.instances.at(-1)!.onerror?.({ error: 'not-allowed' }))

    expect(result.current.error).toBe('Permite el uso del micrófono en el navegador')
    expect(result.current.listening).toBe(false)
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        title: 'Problema con el micrófono',
        html: 'Permite el uso del micrófono en el navegador',
      }),
    )
  })
})
