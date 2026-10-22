import { useCallback, useEffect } from 'react'
import { Ear, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VoiceCommand } from './commands'
import { VOICE_TOGGLE_EVENT } from './events'
import { showVoiceTutorial, shouldShowVoiceTutorial } from './tutorial'
import { useVoiceCommands } from './useVoiceCommands'

interface VoiceCommandButtonProps {
  /** Lee los comandos disponibles al momento de hablar (dependen de la pantalla abierta). */
  getCommands: () => VoiceCommand[]
  /** Lo que no es un comando: nombre de botón o texto para el campo enfocado. Devuelve false si no pudo. */
  fallback?: (spoken: string) => boolean
}

/** Lo que se muestra junto al botón: si escucha, el error o lo último que se entendió. */
function statusText(voice: { listening: boolean; error: string | null; lastHeard: string | null }): string | null {
  if (voice.listening) return 'Escuchando…'
  if (voice.error) return voice.error
  return voice.lastHeard ? `Dijiste: "${voice.lastHeard}"` : null
}

/**
 * Controles de voz del encabezado: micrófono por pulsación y modo manos libres. La primera vez que
 * se enciende en una sesión se explica cómo funcionan los comandos. Sin soporte del navegador se
 * muestra apagado con la razón.
 */
export function VoiceCommandButton({ getCommands, fallback }: VoiceCommandButtonProps) {
  const voice = useVoiceCommands(getCommands, { fallback })
  const { listening, toggle, toggleHandsFree } = voice

  // Antes de encender el micrófono por primera vez en la sesión, se muestra el tutorial.
  const startWithTutorial = useCallback(
    (start: () => void) => {
      if (shouldShowVoiceTutorial()) showVoiceTutorial().then(start)
      else start()
    },
    [],
  )

  const onMicClick = useCallback(() => {
    if (listening) toggle()
    else startWithTutorial(toggle)
  }, [listening, toggle, startWithTutorial])

  const onHandsFreeClick = useCallback(() => {
    if (voice.handsFree) toggleHandsFree()
    else startWithTutorial(toggleHandsFree)
  }, [voice.handsFree, toggleHandsFree, startWithTutorial])

  // La tecla (F2, o V fuera de campos) pide el mismo cambio que el botón.
  useEffect(() => {
    window.addEventListener(VOICE_TOGGLE_EVENT, onMicClick)
    return () => window.removeEventListener(VOICE_TOGGLE_EVENT, onMicClick)
  }, [onMicClick])

  if (!voice.supported) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label="Comandos de voz no disponibles"
        title="Tu navegador no tiene reconocimiento de voz. Prueba con Chrome o Edge."
      >
        <MicOff aria-hidden="true" className="size-4" />
      </Button>
    )
  }

  const status = voice.handsFree ? 'Manos libres: escuchando' : statusText(voice)

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={listening ? 'default' : 'outline'}
        aria-pressed={listening}
        aria-label={listening ? 'Dejar de escuchar' : 'Activar comandos de voz'}
        onClick={onMicClick}
      >
        <Mic aria-hidden="true" className="size-4" />
        <span className="hidden lg:inline">Voz</span>
      </Button>
      <Button
        type="button"
        variant={voice.handsFree ? 'default' : 'outline'}
        aria-pressed={voice.handsFree}
        aria-label={voice.handsFree ? 'Apagar modo manos libres' : 'Activar modo manos libres'}
        title="Manos libres: el micrófono escucha sin que lo toques"
        onClick={onHandsFreeClick}
      >
        <Ear aria-hidden="true" className="size-4" />
        <span className="hidden lg:inline">Manos libres</span>
      </Button>
      <span role="status" className="hidden max-w-[220px] truncate text-12 text-inkSoft md:block">
        {status}
      </span>
    </div>
  )
}
