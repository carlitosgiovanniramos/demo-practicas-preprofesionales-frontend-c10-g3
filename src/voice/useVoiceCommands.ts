import { useCallback, useEffect, useRef, useState } from 'react'
import { showErrorAlert } from '@/lib/alert'
import { speak } from '@/lib/speech'
import { matchVoice, normalizeSpeech, type VoiceCommand } from './commands'

/** Idioma del reconocimiento. Cambiar aquí si el usuario habla otra variante del español. */
export const VOICE_LANG = 'es-MX'

/** En modo manos libres, cada orden empieza con esta palabra; lo demás se ignora. */
export const WAKE_WORD = 'asistente'
const HANDS_FREE_KEY = 'voice:handsFree'
/** Pausa antes de volver a escuchar, para no reiniciar el micrófono en bucle. */
const RESTART_DELAY_MS = 300

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

/** Errores que impiden seguir escuchando: el modo manos libres se apaga en vez de reintentar. */
const FATAL_ERRORS = ['not-allowed', 'service-not-allowed', 'audio-capture']

const ACTION_FAILED = 'No se pudo completar esa acción en esta pantalla'

export interface VoiceOptions {
  /** Lo que no es un comando: se intenta escribirlo en el campo enfocado. Devuelve false si no hay campo. */
  fallback?: (spoken: string) => boolean
}

export function getRecognizerConstructor(): RecognizerConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognizerConstructor
    webkitSpeechRecognition?: RecognizerConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function readHandsFree(): boolean {
  try {
    return localStorage.getItem(HANDS_FREE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveHandsFree(value: boolean) {
  try {
    localStorage.setItem(HANDS_FREE_KEY, String(value))
  } catch {
    // Sin almacenamiento, la preferencia dura solo mientras la página está abierta.
  }
}

/** Avisa del problema: en pantalla (toast) y en voz, para quien no puede leer la pantalla. */
function reportFailure(message: string, title: string) {
  showErrorAlert(message, title)
  speak(message)
}

/**
 * Micrófono por pulsación o manos libres. Por pulsación: escucha una frase, la ejecuta y se apaga.
 * En manos libres sigue escuchando, pero solo actúa con órdenes que empiezan por "asistente".
 * Lo que no es un comando se escribe en el campo enfocado (`fallback`). Confirma en voz y avisa
 * con un toast cuando algo falla. `getCommands` se lee al hablar, así las acciones están al día.
 */
export function useVoiceCommands(getCommands: () => VoiceCommand[], options: VoiceOptions = {}) {
  const Constructor = getRecognizerConstructor()
  const supported = Constructor !== null
  const [listening, setListening] = useState(false)
  const [lastHeard, setLastHeard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [handsFree, setHandsFree] = useState(readHandsFree)
  const recognizer = useRef<Recognizer | null>(null)
  const handsFreeRef = useRef(handsFree)
  const getCommandsRef = useRef(getCommands)
  const optionsRef = useRef(options)
  const startRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    getCommandsRef.current = getCommands
    optionsRef.current = options
  })

  const stop = useCallback(() => {
    recognizer.current?.stop()
  }, [])

  const setHandsFreeValue = useCallback((value: boolean) => {
    handsFreeRef.current = value
    setHandsFree(value)
    saveHandsFree(value)
  }, [])

  const handleTranscript = useCallback(
    (transcript: string) => {
      // En manos libres, solo las órdenes que empiezan por la palabra de activación cuentan.
      let spoken = transcript.trim()
      if (handsFreeRef.current) {
        if (!normalizeSpeech(spoken).startsWith(`${WAKE_WORD} `)) return
        spoken = spoken.split(/\s+/).slice(1).join(' ')
        if (!spoken) return
      }

      setLastHeard(spoken)
      const match = matchVoice(spoken, getCommandsRef.current())
      if (!match) {
        if (optionsRef.current.fallback?.(spoken)) {
          setError(null)
          speak('Escrito')
          return
        }
        const message = `No reconocí "${spoken}". Di, por ejemplo, "ofertas" o "ayuda".`
        setError(message)
        reportFailure(message, 'No reconocí ese comando')
        return
      }

      if (match.command.run(match.argument) === false) {
        setError(ACTION_FAILED)
        reportFailure(ACTION_FAILED, 'No se pudo completar')
        return
      }

      // Éxito: solo se confirma en voz. Los avisos visuales son para los errores.
      setError(null)
      speak(match.command.feedback?.(match.argument) ?? 'Listo')
    },
    [],
  )

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
      if (FATAL_ERRORS.includes(event.error)) setHandsFreeValue(false)
      setListening(false)
    }
    instance.onend = () => {
      setListening(false)
      // Manos libres: el reconocimiento se corta solo; se vuelve a abrir mientras siga activo.
      if (handsFreeRef.current) window.setTimeout(() => startRef.current(), RESTART_DELAY_MS)
    }
    recognizer.current = instance
    setError(null)
    setListening(true)
    instance.start()
  }, [Constructor, handleTranscript, setHandsFreeValue])

  useEffect(() => {
    startRef.current = start
  }, [start])

  useEffect(() => () => recognizer.current?.abort(), [])

  /** Tecla o botón: enciende, o apaga y también sale del modo manos libres. */
  const toggle = useCallback(() => {
    if (listening) {
      setHandsFreeValue(false)
      stop()
    } else {
      start()
    }
  }, [listening, start, stop, setHandsFreeValue])

  /** Botón de manos libres: escucha de forma continua hasta que se apague. */
  const toggleHandsFree = useCallback(() => {
    if (handsFreeRef.current) {
      setHandsFreeValue(false)
      stop()
      return
    }
    setHandsFreeValue(true)
    if (!listening) start()
  }, [listening, start, stop, setHandsFreeValue])

  return { supported, listening, lastHeard, error, handsFree, toggle, toggleHandsFree }
}
