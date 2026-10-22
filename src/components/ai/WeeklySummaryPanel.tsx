import { CalendarX } from 'lucide-react'
import { useId, useState } from 'react'
import { type WeeklySummary, weeklySummary } from '@/api/ai'
import { ApiError } from '@/api/client'
import { FormAlert } from '@/components/FormAlert'
import { Tag } from '@/components/Chip'
import { EmptyState, Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/date'
import { mondayOf, todayIsoDate } from '@/lib/week'
import { useOnline } from '@/offline/hooks/useOnline'

type Status = 'idle' | 'loading' | 'done' | 'error'
type ErrorKind = 'unavailable' | 'generic'
type CopyState = 'idle' | 'copied' | 'failed'

const ERROR_MESSAGES: Record<ErrorKind, string> = {
  unavailable: 'La IA no está disponible en este momento. Podés escribir el informe a mano.',
  generic: 'No se pudo generar el borrador. Probá de nuevo.',
}

const COPY_MESSAGES: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'Borrador copiado',
  failed: 'No se pudo copiar. Seleccioná el texto y copialo a mano.',
}

function errorKindFor(error: unknown): ErrorKind {
  return error instanceof ApiError && error.statusCode === 503 ? 'unavailable' : 'generic'
}

function weekHint(online: boolean, weekStart: string): string {
  if (!online) return 'Sin conexión: el borrador necesita red.'
  if (!weekStart) return 'Elegí una fecha de la semana que querés resumir.'
  return `Semana del lunes ${formatDate(weekStart)}. El borrador usa solo tus jornadas de esa semana.`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-well px-3.5 py-2.5">
      <dt className="text-12 text-inkSoft">{label}</dt>
      <dd className="font-data text-16 font-semibold text-ink">{value}</dd>
    </div>
  )
}

interface DraftEditorProps {
  summary: WeeklySummary
  draft: string
  draftId: string
  copyState: CopyState
  online: boolean
  onDraftChange: (text: string) => void
  onCopy: () => void
  onDiscard: () => void
  onRegenerate: () => void
}

/** Resultado del borrador: totales, texto editable y acciones del estudiante. */
function DraftEditor({
  summary,
  draft,
  draftId,
  copyState,
  online,
  onDraftChange,
  onCopy,
  onDiscard,
  onRegenerate,
}: DraftEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:w-72">
        <Stat label="Jornadas" value={String(summary.entries)} />
        <Stat label="Horas" value={summary.totalHours.toFixed(1)} />
      </dl>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={draftId}>Borrador (editable)</Label>
        <Textarea
          id={draftId}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          className="min-h-[160px] leading-relaxed"
        />
        <span className="font-data text-12 text-inkSoft">{draft.length} caracteres</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCopy} disabled={draft.length === 0}>
            Copiar
          </Button>
          <p role="status" className="text-12 text-inkSoft">
            {copyState === 'idle' ? null : COPY_MESSAGES[copyState]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Descartar
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={!online}>
            Regenerar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-12 text-inkSoft">
        <p>Revisalo antes de usarlo: la IA puede equivocarse.</p>
        <p>Regenerar reemplaza el texto que editaste. Este borrador no se guarda en el sistema.</p>
      </div>
    </div>
  )
}

interface ResultAreaProps {
  status: Status
  errorKind: ErrorKind | null
  summary: WeeklySummary | null
  draft: string
  draftId: string
  copyState: CopyState
  online: boolean
  onDraftChange: (text: string) => void
  onCopy: () => void
  onDiscard: () => void
  onRetry: () => void
}

interface ErrorNoticeProps {
  errorKind: ErrorKind | null
  online: boolean
  onRetry: () => void
}

/** Explica el fallo de generación; solo un error genérico ofrece reintentar. */
function ErrorNotice({ errorKind, online, onRetry }: ErrorNoticeProps) {
  return (
    <>
      <FormAlert message={errorKind ? ERROR_MESSAGES[errorKind] : null} />
      {errorKind === 'generic' ? (
        <div>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={!online}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </>
  )
}

/** Muestra, en un solo lugar, el estado de la generación: cargando, error, vacío o borrador. */
function ResultArea({ status, errorKind, summary, ...handlers }: ResultAreaProps) {
  const { online, onRetry, draftId, draft, copyState, onDraftChange, onCopy, onDiscard } = handlers
  if (status === 'loading') {
    return (
      <p role="status" className="text-14 text-inkSoft">
        Generando borrador con IA. Puede tardar unos segundos.
      </p>
    )
  }
  if (status === 'error') return <ErrorNotice errorKind={errorKind} online={online} onRetry={onRetry} />
  if (status !== 'done' || summary === null) return null
  if (summary.draft === null) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No hay jornadas en esa semana"
        description="Registrá tus horas y volvé a generar el borrador."
      />
    )
  }
  return (
    <DraftEditor
      summary={summary}
      draft={draft}
      draftId={draftId}
      copyState={copyState}
      online={online}
      onDraftChange={onDraftChange}
      onCopy={onCopy}
      onDiscard={onDiscard}
      onRegenerate={onRetry}
    />
  )
}

interface WeeklySummaryPanelProps {
  placementId: number
}

/**
 * Borrador de informe semanal del estudiante. El texto lo genera la IA a partir de sus
 * jornadas; el estudiante lo edita, lo regenera o lo descarta. No se guarda en el sistema.
 */
export function WeeklySummaryPanel({ placementId }: WeeklySummaryPanelProps) {
  const online = useOnline()
  const inputId = useId()
  const draftId = useId()
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIsoDate()))
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [draft, setDraft] = useState('')
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')

  async function generate() {
    setStatus('loading')
    setErrorKind(null)
    setCopyState('idle')
    try {
      const result = await weeklySummary(placementId, weekStart)
      setSummary(result)
      setDraft(result.draft ?? '')
      setStatus('done')
    } catch (err) {
      setErrorKind(errorKindFor(err))
      setStatus('error')
    }
  }

  function discard() {
    setSummary(null)
    setDraft('')
    setErrorKind(null)
    setCopyState('idle')
    setStatus('idle')
  }

  function editDraft(text: string) {
    setDraft(text)
    setCopyState('idle')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const busy = status === 'loading'

  return (
    <Section
      title="Borrador de informe semanal"
      aside={<Tag>Generado con IA</Tag>}
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

        <ResultArea
          status={status}
          errorKind={errorKind}
          summary={summary}
          draft={draft}
          draftId={draftId}
          copyState={copyState}
          online={online}
          onDraftChange={editDraft}
          onCopy={copy}
          onDiscard={discard}
          onRetry={generate}
        />
      </div>
    </Section>
  )
}
