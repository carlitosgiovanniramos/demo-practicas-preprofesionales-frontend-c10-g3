import { useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { VOICE_TOGGLE_EVENT } from './events'
import { Button } from '@/components/ui/button'
import type { VoiceCommand } from './commands'
import { useVoiceCommands } from './useVoiceCommands'

interface VoiceCommandButtonProps {
  /** Lee los comandos disponibles al momento de hablar (dependen de la pantalla abierta). */
  getCommands: () => VoiceCommand[]
}

/** Lo que se muestra junto al botón: si escucha, el error o lo último que se entendió. */
function statusText(voice: { listening: boolean; error: string | null; lastHeard: string | null }): string | null {
  if (voice.listening) return 'Escuchando…'
  if (voice.error) return voice.error
  return voice.lastHeard ? `Dijiste: "${voice.lastHeard}"` : null
}

/** Botón de micrófono del encabezado. Sin soporte del navegador se muestra apagado con la razón. */
export function VoiceCommandButton({ getCommands }: VoiceCommandButtonProps) {
  const voice = useVoiceCommands(getCommands)

  // El atajo de teclado (V) pide el mismo cambio que el botón.
  useEffect(() => {
    window.addEventListener(VOICE_TOGGLE_EVENT, voice.toggle)
    return () => window.removeEventListener(VOICE_TOGGLE_EVENT, voice.toggle)
  }, [voice.toggle])

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

  const status = statusText(voice)

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={voice.listening ? 'default' : 'outline'}
        aria-pressed={voice.listening}
        aria-label={voice.listening ? 'Dejar de escuchar' : 'Activar comandos de voz'}
        onClick={voice.toggle}
      >
        <Mic aria-hidden="true" className="size-4" />
        <span className="hidden lg:inline">Voz</span>
      </Button>
      <span role="status" className="hidden max-w-[220px] truncate text-12 text-inkSoft md:block">
        {status}
      </span>
    </div>
  )
}
