import { useId, useState } from 'react'
import { type WeeklySummary, weeklySummary } from '@/api/ai'
import { ApiError } from '@/api/client'
import { FormAlert } from '@/components/FormAlert'
import { EmptyState, Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/date'
import { mondayOf, todayIsoDate } from '@/lib/week'
import { useOnline } from '@/offline/hooks/useOnline'

type Status = 'idle' | 'loading' | 'done' | 'error'

function weekHint(online: boolean, weekStart: string): string {
  if (!online) return 'Sin conexión: el borrador necesita red.'
  if (!weekStart) return 'Elegí una fecha de la semana que querés resumir.'
  return `Semana del lunes ${formatDate(weekStart)}. El borrador usa solo tus jornadas de esa semana.`
}

const UNAVAILABLE_MESSAGE = 'La IA no está disponible en este momento. Podés escribir el informe a mano.'
const GENERIC_ERROR_MESSAGE = 'No se pudo generar el borrador. Probá de nuevo.'

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 503) return UNAVAILABLE_MESSAGE
  return GENERIC_ERROR_MESSAGE
}

interface WeeklySummaryPanelProps {
  placementId: number
}

/**
 * Borrador de informe semanal del estudiante. El texto lo genera la IA a partir de sus
 * jornadas; el estudiante lo edita o lo descarta. No se guarda en el sistema.
 */
export function WeeklySummaryPanel({ placementId }: WeeklySummaryPanelProps) {
  const online = useOnline()
  const inputId = useId()
  const draftId = useId()
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIsoDate()))
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setError(null)
    try {
      const result = await weeklySummary(placementId, weekStart)
      setSummary(result)
      setDraft(result.draft ?? '')
      setStatus('done')
    } catch (err) {
      setError(messageFor(err))
      setStatus('error')
    }
  }

  function discard() {
    setSummary(null)
    setDraft('')
    setError(null)
    setStatus('idle')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft)
    } catch {
      // Sin permiso del portapapeles: el texto sigue seleccionable en el cuadro.
    }
  }

  const busy = status === 'loading'

  return (
    <Section
      title="Borrador de informe semanal"
      aside={<span className="text-12 text-inkSoft">Generado con IA · revisalo antes de usarlo</span>}
    >
      <div className="flex flex-col gap-4 px-[18px] py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <Label htmlFor={inputId}>Semana</Label>
            <Input
              id={inputId}
              type="date"
              value={weekStart}
              disabled={busy}
              onChange={(event) => setWeekStart(mondayOf(event.target.value))}
            />
          </div>
          <Button onClick={generate} disabled={!online || busy || !weekStart}>
            {busy ? 'Generando…' : 'Generar borrador'}
          </Button>
        </div>

        <p className="text-12 text-inkSoft">{weekHint(online, weekStart)}</p>

        <p role="status" aria-live="polite" className="sr-only">
          {busy ? 'Generando borrador' : ''}
        </p>

        <FormAlert message={error} />

        {status === 'done' && summary?.draft === null ? (
          <EmptyState
            title="No hay jornadas en esa semana"
            description="Registrá tus horas y volvé a generar el borrador."
          />
        ) : null}

        {status === 'done' && summary?.draft ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={draftId}>Borrador (editable)</Label>
              <Textarea
                id={draftId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-[160px]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-data text-12 text-inkSoft">
                {summary.entries} jornadas · {summary.totalHours.toFixed(1)} h
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={discard}>
                  Descartar
                </Button>
                <Button variant="outline" size="sm" onClick={copy} disabled={draft.length === 0}>
                  Copiar
                </Button>
              </div>
            </div>
            <p className="text-12 text-inkSoft">Este borrador no se guarda en el sistema.</p>
          </div>
        ) : null}
      </div>
    </Section>
  )
}
