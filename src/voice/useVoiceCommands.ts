import { useCallback, useEffect, useRef, useState } from 'react'
import { showErrorAlert, showSuccessToast } from '@/lib/alert'
import { speak } from '@/lib/speech'
import { matchVoice, type VoiceCommand } from './commands'

/** Idioma del reconocimiento. Cambiar aquí si el usuario habla otra variante del español. */
export const VOICE_LANG = 'es-MX'

interface SpeechResultLike {
  results: { 0: { transcript: string } }[]
}

interface Recognizer {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognizerConstructor = new () => Recognizer

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permite el uso del micrófono en el navegador',
  'service-not-allowed': 'Permite el uso del micrófono en el navegador',
  'no-speech': 'No escuché nada, intenta de nuevo',
  'audio-capture': 'No encontré un micrófono disponible',
  network: 'El navegador no pudo conectarse al servicio de voz. Prueba con Chrome o Edge.',
}

const ACTION_FAILED = 'No se pudo completar esa acción en esta pantalla'

export function getRecognizerConstructor(): RecognizerConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognizerConstructor
    webkitSpeechRecognition?: RecognizerConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Avisa del problema: en pantalla (toast) y en voz, para quien no puede leer la pantalla. */
function reportFailure(message: string, title: string) {
  showErrorAlert(message, title)
  speak(message)
}

/**
 * Micrófono por pulsación: el botón escucha una frase, ejecuta el comando que coincida (con su
 * argumento si lo tiene) y se apaga. Confirma en voz y en pantalla, y avisa cuando algo falla.
 * `getCommands` se lee al hablar, así las acciones de la pantalla actual siempre están al día.
 */
export function useVoiceCommands(getCommands: () => VoiceCommand[]) {
  const Constructor = getRecognizerConstructor()
  const supported = Constructor !== null
  const [listening, setListening] = useState(false)
  const [lastHeard, setLastHeard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognizer = useRef<Recognizer | null>(null)
  const getCommandsRef = useRef(getCommands)

  useEffect(() => {
    getCommandsRef.current = getCommands
  })

  const stop = useCallback(() => {
    recognizer.current?.stop()
  }, [])

  const handleTranscript = useCallback((transcript: string) => {
    setLastHeard(transcript)
    const match = matchVoice(transcript, getCommandsRef.current())
    if (!match) {
      const message = `No reconocí "${transcript}". Di, por ejemplo, "ofertas" o "ayuda".`
      setError(message)
      reportFailure(message, 'No reconocí ese comando')
      return
    }

    if (match.command.run(match.argument) === false) {
      setError(ACTION_FAILED)
      reportFailure(ACTION_FAILED, 'No se pudo completar')
      return
    }

    const confirmation = match.command.feedback?.(match.argument) ?? 'Listo'
    setError(null)
    showSuccessToast(confirmation)
    speak(confirmation)
  }, [])

  const start = useCallback(() => {
    if (!Constructor) return
    const instance = new Constructor()
    instance.lang = VOICE_LANG
    instance.continuous = false
    instance.interimResults = false
    instance.onresult = (event) => handleTranscript(event.results[event.results.length - 1][0].transcript)
    instance.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error] ?? 'No se pudo usar el micrófono'
      setError(message)
      reportFailure(message, 'Problema con el micrófono')
      setListening(false)
    }
    instance.onend = () => setListening(false)
    recognizer.current = instance
    setError(null)
    setListening(true)
    instance.start()
  }, [Constructor, handleTranscript])

  useEffect(() => () => recognizer.current?.abort(), [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, lastHeard, error, toggle }
}
