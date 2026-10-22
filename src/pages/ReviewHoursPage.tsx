import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '@/api/client'
import { HoursProgressPanel } from '@/components/HoursProgressPanel'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel } from '@/components/Panel'
import { StatusBadge } from '@/components/StatusBadge'
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
import { formatDate } from '@/lib/date'
import { showErrorAlert } from '@/lib/alert'
import { summarizeHours } from '@/lib/hours'
import { plural } from '@/lib/utils'
import { db, type LocalHourLog } from '@/offline/db'
import { syncNow } from '@/offline/sync/scheduler'
import { usePlacementById } from '@/offline/hooks/usePlacementById'
import { HourLedger } from '@/components/ledger/HourLedgerParts'
import { EvaluateDialog } from './EvaluateDialog'
import { activateInCurrentItem, moveItemFocus } from '@/shortcuts/listFocus'
import { ShortcutHint } from '@/shortcuts/ShortcutHint'
import { useScreenShortcuts } from '@/shortcuts/ShortcutsProvider'

type ActionState = 'approving' | 'rejecting' | 'approved' | 'rejected' | null

// Los motivos que más se repiten al devolver un registro: se pegan al final
// de la nota para que el tutor no escriba lo mismo cada vez.
const COMMON_REASONS = [
  'Las horas no coinciden con el sitio',
  'Falta detalle de la actividad',
  'La fecha no corresponde',
]

interface ReviewActionsProps {
  log: LocalHourLog
  state: ActionState
  onApprove: (logId: number) => void
  onReject: (log: LocalHourLog) => void
}

function ReviewActions({ log, state, onApprove, onReject }: ReviewActionsProps) {
  if (state === 'approved') {
    return <span className="text-13 font-semibold text-stamp">Aprobada</span>
  }
  if (state === 'rejected') {
    return <span className="text-13 font-semibold text-void">Rechazada</span>
  }
  if (log.status !== 'SUBMITTED') return null

  const busy = state === 'approving' || state === 'rejecting'
  return (
    <>
      <Button type="button" size="sm" data-action="approve" onClick={() => onApprove(log.id)} disabled={busy}>
        {state === 'approving' ? 'Aprobando…' : 'Aprobar'}
      </Button>
      <Button type="button" size="sm" variant="outline" data-action="reject" onClick={() => onReject(log)} disabled={busy}>
        Devolver
      </Button>
    </>
  )
}

interface ReviewListProps {
  logs: LocalHourLog[]
  actionState: Record<number, ActionState>
  onApprove: (logId: number) => void
  onReject: (log: LocalHourLog) => void
}

function ReviewList({ logs, actionState, onApprove, onReject }: ReviewListProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        illustration="check"
        title="No tienes horas pendientes de revisar"
        description="Cuando tu practicante envíe horas nuevas, aparecen acá."
      />
    )
  }

  return (
    <HourLedger logs={logs} actionsLabel="Revisión" navigable renderRest={(log) => (
      <>
            <span className="flex-1 text-14 text-inkBody">{log.activity}</span>
            <span className="sm:w-32">
              <StatusBadge status={log.status} />
            </span>
            <span className="flex flex-wrap justify-end gap-1.5 sm:w-44">
              <ReviewActions
                log={log}
                state={actionState[log.id] ?? null}
                onApprove={onApprove}
                onReject={onReject}
              />
            </span>
      </>
    )} />
  )
}

interface RejectDialogProps {
  /** Registro a devolver, o `null` con el modal cerrado. */
  log: LocalHourLog | null
  onCancel: () => void
  onConfirm: (logId: number, note: string) => void
}

function RejectDialog({ log, onCancel, onConfirm }: RejectDialogProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (open) return
    setNote('')
    setError(null)
    onCancel()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!log) return
    const trimmed = note.trim()
    if (!trimmed) {
      setError('Escribe una nota para el rechazo')
      return
    }
    setNote('')
    setError(null)
    onConfirm(log.id, trimmed)
  }

  function appendReason(reason: string) {
    setNote((prev) => (prev ? `${prev.trimEnd()} ${reason}. ` : `${reason}. `))
    setError(null)
  }

  return (
    <Dialog open={log !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Devolver el registro</DialogTitle>
          <DialogDescription>
            {log ? `${formatDate(log.date)} · ${log.activity} · ${log.hours} h` : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reject-note">¿Qué tiene que corregir?</Label>
              <p className="text-12 text-inkSoft">
                Lo lee tal cual lo escribas, con tu nombre y la fecha.
              </p>
              <Textarea
                id="reject-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Escribe qué falta o qué está mal"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'reject-note-error' : undefined}
              />
              {error ? (
                <p id="reject-note-error" role="alert" className="text-12 text-void">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-12 uppercase tracking-[0.06em] text-inkMute">
                Motivos frecuentes
              </span>
              <div className="flex flex-wrap gap-2">
                {COMMON_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => appendReason(reason)}
                    className="inline-flex h-8 items-center rounded-full border border-line px-3 text-13 text-inkBody transition-colors hover:border-stamp hover:bg-soft hover:text-ink"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit">Devolver el registro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function pendingNote(pendingCount: number) {
  if (pendingCount === 0) return null
  return (
    <span className="text-pending">
      {' '}
      · {plural(pendingCount, 'registro', 'registros')} sin revisar
    </span>
  )
}

/**
 * Cola de aprobación de un placement. Las horas viven en Dexie (sincronizadas
 * por pull/push); aprobar o rechazar llama al backend y luego re-sincroniza
 * para traer el estado nuevo — el servidor es la autoridad, nunca se escribe
 * el resultado de la revisión a mano en Dexie.
 *
 * Nota: el backend no valida que quien revisa sea el tutor asignado a este
 * placement (deuda del backend). Esta pantalla no lo compensa ocultando ni
 * deshabilitando nada.
 */
export function ReviewHoursPage() {
  const { id } = useParams<{ id: string }>()
  const placementId = Number(id)

  const placement = usePlacementById(placementId)

  const logs = useLiveQuery<LocalHourLog[] | undefined>(
    () => db.hourLogs.where('placementId').equals(placementId).sortBy('date'),
    [placementId],
  )

  const [actionState, setActionState] = useState<Record<number, ActionState>>({})
  const [rejectingLog, setRejectingLog] = useState<LocalHourLog | null>(null)

  // La evaluación vive en un modal. ?evaluar=1 lo abre al llegar (enlace directo o redirección).
  const [searchParams, setSearchParams] = useSearchParams()
  const [evaluateOpen, setEvaluateOpen] = useState(() => searchParams.get('evaluar') === '1')

  function changeEvaluateOpen(open: boolean) {
    setEvaluateOpen(open)
    if (!open && searchParams.has('evaluar')) setSearchParams({}, { replace: true })
  }

  // Atajos del tutor en la revisión: j/k recorren los registros, a aprueba el enfocado y
  // r lo devuelve (abre el motivo). Sin registro enfocado, a y r no hacen nada.
  // e abre la evaluación del practicante sin tocar el ratón.
  useScreenShortcuts([
    {
      id: 'review-evaluate',
      label: 'Evaluar practicante',
      key: 'e',
      voice: ['evaluar', 'evaluar practicante'],
      run: () => {
        setEvaluateOpen(true)
        return true
      },
    },
    {
      id: 'review-next',
      label: 'Siguiente registro',
      key: 'j',
      voice: ['siguiente registro', 'registro siguiente'],
      run: () => moveItemFocus(1),
    },
    {
      id: 'review-prev',
      label: 'Registro anterior',
      key: 'k',
      voice: ['registro anterior'],
      run: () => moveItemFocus(-1),
    },
    {
      id: 'review-approve',
      label: 'Aprobar el registro enfocado',
      key: 'a',
      voice: ['aprobar', 'aprobar registro'],
      run: () => activateInCurrentItem('[data-action="approve"]'),
    },
    {
      id: 'review-reject',
      label: 'Devolver el registro enfocado',
      key: 'r',
      voice: ['devolver', 'devolver registro'],
      run: () => activateInCurrentItem('[data-action="reject"]'),
    },
  ])

  async function reviewLog(logId: number, status: 'APPROVED' | 'REJECTED', note?: string) {
    setActionState((prev) => ({ ...prev, [logId]: status === 'APPROVED' ? 'approving' : 'rejecting' }))
    try {
      await api(`/hour-logs/${logId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      })
      await syncNow()
      setActionState((prev) => ({ ...prev, [logId]: status === 'APPROVED' ? 'approved' : 'rejected' }))
    } catch (err) {
      showErrorAlert(err instanceof ApiError ? err.message : 'No se pudo enviar la revisión')
      setActionState((prev) => ({ ...prev, [logId]: null }))
    }
  }

  function confirmReject(logId: number, note: string) {
    setRejectingLog(null)
    void reviewLog(logId, 'REJECTED', note)
  }

  if (placement === undefined || logs === undefined) {
    return <LoadingState>Cargando libro de horas…</LoadingState>
  }

  if (placement === null) {
    return <EmptyState illustration="people" title="No se encontró este practicante" />
  }

  const hours = summarizeHours(logs, placement.requiredHours)
  const pendingCount = logs.filter((log) => log.status === 'SUBMITTED').length

  return (
    <>
      <PageHeader
        title="Horas del practicante"
        subtitle={`Estudiante #${placement.studentId} · Empresa #${placement.companyId}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/practicantes">Volver a la lista</Link>
            </Button>
            <Button type="button" onClick={() => setEvaluateOpen(true)}>
              Evaluar practicante
            </Button>
          </>
        }
      />

      <HoursProgressPanel hours={hours} note={pendingNote(pendingCount)} />

      <Panel
        toolbar={
          <>
            <ShortcutHint
              items={[
                { keys: 'j / k', label: 'registro' },
                { keys: 'a', label: 'aprobar' },
                { keys: 'r', label: 'devolver' },
                { keys: 'e', label: 'evaluar' },
              ]}
            />
            <span className="ml-auto font-data text-12 text-inkSoft">
              {plural(pendingCount, 'registro', 'registros')} sin revisar
            </span>
          </>
        }
      >
        <ReviewList
          logs={logs}
          actionState={actionState}
          onApprove={(logId) => reviewLog(logId, 'APPROVED')}
          onReject={setRejectingLog}
        />
      </Panel>

      <RejectDialog
        log={rejectingLog}
        onCancel={() => setRejectingLog(null)}
        onConfirm={confirmReject}
      />

      <EvaluateDialog placement={placement} open={evaluateOpen} onOpenChange={changeEvaluateOpen} />
    </>
  )
}
