import { useCallback, useEffect } from 'react'
import { Ear, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VoiceCommand } from './commands'
import { VOICE_TOGGLE_EVENT } from './events'
import { showVoiceTutorial, shouldShowVoiceTutorial } from './tutorial'
import { useVoiceCommands } from './useVoiceCommands'

interface VoiceCommandButtonProps {
  /** Lee los comandos disponibles al momento de hablar (dependen de la pantalla abierta). */
  getCommands: () => VoiceCommand[]
  /** Lo que no es un comando: nombre de botón o texto para el campo enfocado. Devuelve false si no pudo. */
  fallback?: (spoken: string) => boolean
  /**
   * `inline` va dentro de la barra del encabezado (con texto). `floating` es un control circular solo
   * con iconos, fijo en la esquina superior izquierda, que muestra su acción al pasar el cursor.
   */
  variant?: 'inline' | 'floating'
}

/** Lo que se muestra junto al botón: si escucha, el error o lo último que se entendió. */
function statusText(voice: { listening: boolean; error: string | null; lastHeard: string | null }): string | null {
  if (voice.listening) return 'Escuchando…'
  if (voice.error) return voice.error
  return voice.lastHeard ? `Dijiste: "${voice.lastHeard}"` : null
}

/** Botón circular con su acción en una etiqueta que aparece al pasar el cursor o al enfocarlo. */
function FloatingControl({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="group relative">
      <Button
        type="button"
        size="icon"
        variant={pressed ? 'default' : 'outline'}
        className="size-11 rounded-full shadow-md"
        aria-pressed={pressed}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[110] mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-12 font-medium text-surface opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Controles de voz: micrófono por pulsación y modo manos libres. La primera vez que se enciende en
 * una sesión se explica cómo funcionan los comandos. Sin soporte del navegador se muestra apagado.
 */
export function VoiceCommandButton({ getCommands, fallback, variant = 'inline' }: VoiceCommandButtonProps) {
  const voice = useVoiceCommands(getCommands, { fallback })
  const { listening, toggle, toggleHandsFree } = voice

  // Antes de encender el micrófono por primera vez en la sesión, se muestra el tutorial.
  const startWithTutorial = useCallback((start: () => void) => {
    if (shouldShowVoiceTutorial()) showVoiceTutorial().then(start)
    else start()
  }, [])

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

  const floating = variant === 'floating'

  if (!voice.supported) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label="Comandos de voz no disponibles"
        title="Tu navegador no tiene reconocimiento de voz. Prueba con Chrome o Edge."
        className={cn(floating && 'size-11 rounded-full')}
      >
        <MicOff aria-hidden="true" className="size-4" />
      </Button>
    )
  }

  const status = voice.handsFree ? 'Manos libres: escuchando' : statusText(voice)
  const micLabel = listening ? 'Dejar de escuchar' : 'Activar micrófono'
  const handsFreeLabel = voice.handsFree ? 'Apagar manos libres' : 'Activar manos libres'

  if (floating) {
    return (
      <div className="fixed left-4 top-4 z-[100] flex items-center gap-2">
        <FloatingControl label={micLabel} pressed={listening} onClick={onMicClick}>
          <Mic aria-hidden="true" className="size-5" />
        </FloatingControl>
        <FloatingControl label={handsFreeLabel} pressed={voice.handsFree} onClick={onHandsFreeClick}>
          <Ear aria-hidden="true" className="size-5" />
        </FloatingControl>
        <span role="status" className="sr-only">
          {status}
        </span>
      </div>
    )
  }

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
