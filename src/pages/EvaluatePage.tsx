import { type FormEvent, type KeyboardEvent, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { submitEvaluation } from '@/api/evaluations'
import { FormAlert } from '@/components/FormAlert'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel, Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseLocalDate } from '@/lib/date'
import { focusFirstInvalid } from '@/lib/form-focus'
import { cn } from '@/lib/utils'
import { usePlacementById } from '@/offline/hooks/usePlacementById'
import { ShortcutHint } from '@/shortcuts/ShortcutHint'
import { useScreenShortcuts } from '@/shortcuts/ShortcutsProvider'

type ScoreField = 'technical' | 'communication' | 'punctuality'

// Rúbrica fija (technical, communication, punctuality, 1 a 5): una épica
// posterior del backlog la reemplaza por criterios configurables — no se
// adelanta esa flexibilidad aquí.
const CRITERIA: { field: ScoreField; label: string }[] = [
  { field: 'technical', label: 'Desempeño técnico' },
  { field: 'communication', label: 'Comunicación' },
  { field: 'punctuality', label: 'Puntualidad' },
]

const SCORES = [1, 2, 3, 4, 5]

// Periodo académico AAAA-1 (enero-junio) o AAAA-2 (julio-diciembre), tal
// como lo espera el backend (ver AccreditationService.reportForPeriod). Se
// deriva de la fecha de inicio del placement: la rúbrica no le pide este
// dato al tutor.
function periodFromStartDate(startDate: string): string {
  const parsed = parseLocalDate(startDate)
  const year = parsed.getFullYear()
  const term = parsed.getMonth() < 6 ? 1 : 2
  return `${year}-${term}`
}

interface ScoreGroupProps {
  field: ScoreField
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}

/**
 * Puntaje de un criterio como botones 1–5 (patrón de radio): se marca con clic o con las
 * flechas, y el foco de la rejilla es el que usan los atajos numéricos.
 */
function ScoreGroup({ field, label, value, error, onChange }: ScoreGroupProps) {
  const labelId = `eval-${field}-label`
  const current = value ? Number(value) : 0

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    // Sin puntaje, la flecha arriba/derecha empieza en 1 y la de abajo/izquierda en 5.
    const base = current || (step > 0 ? 0 : SCORES.length + 1)
    const next = Math.min(SCORES.length, Math.max(1, base + step))
    onChange(String(next))
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={labelId} htmlFor={undefined}>
        {label}
      </Label>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={Boolean(error)}
        tabIndex={-1}
        data-criterion={field}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-5 gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-stamp focus-visible:ring-offset-2"
      >
        {SCORES.map((score) => {
          const checked = current === score
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={checked}
              data-value={score}
              tabIndex={checked || (current === 0 && score === 1) ? 0 : -1}
              onClick={() => onChange(String(score))}
              className={cn(
                'font-data flex h-10 items-center justify-center rounded-md border text-14 font-semibold transition-colors',
                checked
                  ? 'border-stamp bg-stamp text-surface'
                  : 'border-line bg-surface text-inkBody hover:border-stamp hover:text-ink',
              )}
            >
              {score}
            </button>
          )
        })}
      </div>
      {error ? (
        <p role="alert" className="text-12 font-medium text-void">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Evaluación del tutor sobre un placement: rúbrica fija + comentario. No sincronizable: siempre requiere red. */
export function EvaluatePage() {
  const { id } = useParams<{ id: string }>()
  const placementId = Number(id)

  const placement = usePlacementById(placementId)

  const [scores, setScores] = useState<Record<ScoreField, string>>({
    technical: '',
    communication: '',
    punctuality: '',
  })
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ScoreField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Con el foco en un criterio, 1–5 pone ese puntaje. Sin foco en un criterio la tecla
  // sigue siendo la del menú (1 = primera sección), porque run devuelve false.
  useScreenShortcuts(
    SCORES.map((score) => ({
      id: `score-${score}`,
      label: `Poner ${score} en el criterio enfocado`,
      key: String(score),
      run: () => {
        const field = document.activeElement?.closest<HTMLElement>('[data-criterion]')?.dataset.criterion as
          | ScoreField
          | undefined
        if (!field) return false
        setScores((prev) => ({ ...prev, [field]: String(score) }))
        setErrors((prev) => ({ ...prev, [field]: undefined }))
        return true
      },
    })),
  )

  if (placement === undefined) {
    return <LoadingState>Cargando practicante…</LoadingState>
  }

  if (placement === null) {
    return <EmptyState illustration="people" title="No se encontró este practicante" />
  }

  const period = periodFromStartDate(placement.startDate)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitError(null)

    const nextErrors: Partial<Record<ScoreField, string>> = {}
    for (const { field } of CRITERIA) {
      if (!scores[field]) nextErrors[field] = 'Selecciona un puntaje'
    }
    if (Object.keys(nextErrors).length > 0) {
      // flushSync: el error debe estar en el DOM antes de llevar el foco al primer criterio sin puntaje.
      flushSync(() => setErrors(nextErrors))
      focusFirstInvalid(form)
      return
    }
    setErrors({})

    setSubmitting(true)
    try {
      await submitEvaluation({
        placementId,
        kind: 'TUTOR',
        period,
        scores: {
          technical: Number(scores.technical),
          communication: Number(scores.communication),
          punctuality: Number(scores.punctuality),
        },
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo enviar la evaluación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Evaluar practicante"
        subtitle={`Estudiante #${placement.studentId} · Empresa #${placement.companyId} · periodo ${period}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/practicantes/${placementId}/horas`}>Ver libro de horas</Link>
          </Button>
        }
      />

      {submitted ? (
        <Panel>
          <EmptyState
            illustration="check"
            title="Evaluación enviada"
            description="La coordinación ya la puede ver en el acta del periodo."
            action={
              <Button asChild size="sm">
                <Link to="/practicantes">Volver a mis practicantes</Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <Section title="Rúbrica" aside={<ShortcutHint items={[{ keys: '1–5', label: 'puntaje del criterio con foco' }]} />}>
          <form className="flex flex-col gap-4 px-[18px] py-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              {CRITERIA.map(({ field, label }) => (
                <ScoreGroup
                  key={field}
                  field={field}
                  label={label}
                  value={scores[field]}
                  error={errors[field]}
                  onChange={(value) => {
                    setScores((prev) => ({ ...prev, [field]: value }))
                    setErrors((prev) => ({ ...prev, [field]: undefined }))
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eval-comment">Comentario</Label>
              <p className="text-12 text-inkSoft">Opcional. Queda en el acta junto con los puntajes.</p>
              <Textarea
                id="eval-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                placeholder="Observaciones sobre el desempeño del practicante"
              />
            </div>

            <FormAlert message={submitError} />

            <Button type="submit" disabled={submitting} className="self-start">
              {submitting ? 'Enviando…' : 'Enviar evaluación'}
            </Button>
          </form>
        </Section>
      )}
    </>
  )
}
