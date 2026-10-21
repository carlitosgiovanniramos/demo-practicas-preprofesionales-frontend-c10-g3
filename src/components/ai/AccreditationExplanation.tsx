import { useId, useState } from 'react'
import { type AccreditationExplanation as Explanation, accreditationExplanation } from '@/api/ai'
import { ApiError } from '@/api/client'
import { FormAlert } from '@/components/FormAlert'
import { LoadingState } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { useOnline } from '@/offline/hooks/useOnline'

const UNAVAILABLE_MESSAGE = 'La IA no está disponible en este momento. Revisá los motivos de la fila.'
const GENERIC_ERROR_MESSAGE = 'No se pudo generar la explicación. Probá de nuevo.'

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 503) return UNAVAILABLE_MESSAGE
  return GENERIC_ERROR_MESSAGE
}

interface AccreditationExplanationProps {
  placementId: number
  period: string
}

/**
 * Explicación opcional, bajo demanda, del estado de una fila del acta. Se pide solo al abrirla
 * para no gastar llamadas a la IA en cada fila. El nivel y los motivos los decide la regla.
 */
export function AccreditationExplanation({ placementId, period }: AccreditationExplanationProps) {
  const online = useOnline()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setExplanation(await accreditationExplanation(placementId, period))
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !explanation && !loading) void load()
  }

  return (
    <div className="flex flex-col gap-2 px-[18px] pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          disabled={!online && !open}
        >
          {open ? 'Ocultar explicación' : 'Explicar con IA'}
        </Button>
        {!online ? <span className="text-12 text-inkSoft">Sin conexión: necesita red.</span> : null}
      </div>

      {open ? (
        <div id={panelId} className="rounded-md bg-well px-3 py-2.5">
          {loading ? <LoadingState>Generando explicación…</LoadingState> : null}

          <FormAlert message={error} />
          {error && !loading ? (
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={() => void load()} disabled={!online}>
                Reintentar
              </Button>
            </div>
          ) : null}

          {explanation && !loading ? (
            <div className="flex flex-col gap-2">
              <p className="text-13 leading-relaxed text-inkBody">{explanation.explanation}</p>
              <p className="text-12 text-inkSoft">
                Explicación generada con IA. El nivel y los motivos los decide la regla de acreditación.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
