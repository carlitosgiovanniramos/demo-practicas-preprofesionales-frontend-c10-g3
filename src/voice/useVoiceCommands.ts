import { useCallback, useEffect, useRef, useState } from 'react'
import { showErrorAlert } from '@/lib/alert'
import { matchCommand, type VoiceCommand } from './commands'

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
  network: 'El reconocimiento de voz necesita conexión a internet',
}

export function getRecognizerConstructor(): RecognizerConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognizerConstructor
    webkitSpeechRecognition?: RecognizerConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Micrófono por pulsación: el botón escucha una frase, ejecuta el comando que coincida y se apaga.
 * Lo que no coincide queda en `error` para que el usuario vea qué entendió el reconocedor.
 */
export function useVoiceCommands(commands: VoiceCommand[]) {
  const Constructor = getRecognizerConstructor()
  const supported = Constructor !== null
  const [listening, setListening] = useState(false)
  const [lastHeard, setLastHeard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognizer = useRef<Recognizer | null>(null)
  const commandsRef = useRef(commands)

  useEffect(() => {
    commandsRef.current = commands
  })

  const stop = useCallback(() => {
    recognizer.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!Constructor) return
    const instance = new Constructor()
    instance.lang = VOICE_LANG
    instance.continuous = false
    instance.interimResults = false
    instance.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      setLastHeard(transcript)
      const command = matchCommand(transcript, commandsRef.current)
      if (command) {
        setError(null)
        command.run()
      } else {
        const message = `No reconocí "${transcript}". Di, por ejemplo, "ofertas" o "ayuda".`
        setError(message)
        showErrorAlert(message, 'No reconocí ese comando')
      }
    }
    instance.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error] ?? 'No se pudo usar el micrófono'
      setError(message)
      showErrorAlert(message, 'Problema con el micrófono')
      setListening(false)
    }
    instance.onend = () => setListening(false)
    recognizer.current = instance
    setError(null)
    setListening(true)
    instance.start()
  }, [Constructor])

  useEffect(() => () => recognizer.current?.abort(), [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, lastHeard, error, toggle }
}
