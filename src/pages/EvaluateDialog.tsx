import { type FormEvent, type KeyboardEvent, useState } from 'react'
import { flushSync } from 'react-dom'
import { ApiError } from '@/api/client'
import { submitEvaluation } from '@/api/evaluations'
import { showErrorAlert } from '@/lib/alert'
import { EmptyState } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseLocalDate } from '@/lib/date'
import { focusFirstInvalid } from '@/lib/form-focus'
import { cn } from '@/lib/utils'
import type { LocalPlacement } from '@/offline/db'
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

interface EvaluateFormProps {
  placement: LocalPlacement
  period: string
  onDone: () => void
}

/**
 * Formulario de la rúbrica. Vive dentro del contenido del modal: al cerrarse se desmonta
 * y su estado (puntajes, comentario) se reinicia, y sus atajos 1–5 solo existen mientras
 * el modal está abierto.
 */
function EvaluateForm({ placement, period, onDone }: EvaluateFormProps) {
  const [scores, setScores] = useState<Record<ScoreField, string>>({
    technical: '',
    communication: '',
    punctuality: '',
  })
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ScoreField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Con el foco en un criterio, 1–5 pone ese puntaje. Sin foco en un criterio devuelve
  // false y la tecla sigue su camino (dentro del modal, la app no reacciona a ella).
  useScreenShortcuts(
    SCORES.map((score) => ({
      id: `score-${score}`,
      label: `Poner ${score} en el criterio enfocado`,
      key: String(score),
      inDialog: true,
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

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
        placementId: placement.id,
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
      showErrorAlert(err instanceof ApiError ? err.message : 'No se pudo enviar la evaluación')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <DialogBody>
        <EmptyState
          illustration="check"
          title="Evaluación enviada"
          description="La coordinación ya la puede ver en el acta del periodo."
          action={<Button onClick={onDone}>Listo</Button>}
        />
      </DialogBody>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogBody>
        <ShortcutHint items={[{ keys: '1–5', label: 'puntaje del criterio con foco' }]} />

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
            rows={3}
            placeholder="Observaciones sobre el desempeño del practicante"
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar evaluación'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface EvaluateDialogProps {
  placement: LocalPlacement
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Evaluación del tutor sobre un placement, en un modal (animación de entrada y salida
 * del propio DialogContent). Rúbrica fija + comentario. No sincronizable: requiere red.
 */
export function EvaluateDialog({ placement, open, onOpenChange }: EvaluateDialogProps) {
  const period = periodFromStartDate(placement.startDate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluar practicante</DialogTitle>
          <DialogDescription>
            {`Estudiante #${placement.studentId} · Empresa #${placement.companyId} · periodo ${period}`}
          </DialogDescription>
        </DialogHeader>
        <EvaluateForm placement={placement} period={period} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
