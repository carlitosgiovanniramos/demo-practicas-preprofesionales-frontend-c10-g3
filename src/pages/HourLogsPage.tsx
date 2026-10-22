import { useState } from 'react'
import { HourLogForm } from '@/components/HourLogForm'
import { HoursProgressPanel } from '@/components/HoursProgressPanel'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel } from '@/components/Panel'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { type HoursSummary, summarizeHours } from '@/lib/hours'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'
import type { LocalHourLog } from '@/offline/db'
import { useHourLogs } from '@/offline/hooks/useHourLogs'
import { usePlacement } from '@/offline/hooks/usePlacement'
import { HourLedger } from '@/components/ledger/HourLedgerParts'

const HOURS_PAGE_SIZE = 10

function submittedNote(hours: HoursSummary) {
  if (hours.submittedHours <= 0) return null
  return <span className="text-pending"> · {hours.submittedHours.toFixed(1)} sin aprobar</span>
}

// Cuando un envío no salió como el estudiante esperaba, la fila se lo dice en
// la misma línea, con palabras. El indicador del margen solo puede dar el
// titular; el porqué va acá.
function SyncNote({ note }: { note?: string | null }) {
  if (!note) return null
  return <span className="mt-0.5 block text-13 text-pending">{note}</span>
}

function HourLogsList({ logs }: { logs: LocalHourLog[] }) {
  const paged = usePagedItems(logs, HOURS_PAGE_SIZE, 'hour-logs')

  if (logs.length === 0 || !paged) {
    return (
      <Panel>
        <EmptyState
          title="Todavía no has registrado horas"
          description="Puedes hacerlo sin conexión: se sincroniza cuando vuelva la señal."
        />
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <HourLedger logs={paged.pageItems} statusRight renderRest={(log) => (
        <>
              <span className="flex-1 text-14 text-inkBody">
                {log.activity}
                <SyncNote note={log.syncNote} />
              </span>
              <span className="sm:w-32 sm:text-right">
                <StatusBadge status={log.status} />
              </span>
        </>
      )} />
      {paged.totalPages > 1 ? (
        <Panel>
          <Pagination
            page={paged.page}
            totalPages={paged.totalPages}
            totalItems={paged.totalItems}
            from={paged.from}
            to={paged.to}
            onPageChange={paged.setPage}
            itemLabel="registros de horas"
          />
        </Panel>
      ) : null}
    </div>
  )
}

function NewHourLogDialog({ placementId }: { placementId: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Registrar horas</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar horas</DialogTitle>
          <DialogDescription>
            Se guardan en este dispositivo y se sincronizan cuando haya conexión
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <HourLogForm placementId={placementId} onSaved={() => setOpen(false)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export function HourLogsPage() {
  const placement = usePlacement()
  const logs = useHourLogs(placement?.id ?? -1)

  if (placement === undefined) {
    return <LoadingState>Cargando tu práctica…</LoadingState>
  }

  if (placement === null) {
    return (
      <Panel>
        <EmptyState
          title="No tienes una práctica activa todavía"
          description="Cuando la coordinación active tu plaza, vas a poder registrar horas."
        />
      </Panel>
    )
  }

  if (logs === undefined) {
    return <LoadingState>Cargando registros de horas…</LoadingState>
  }

  // Totales recalculados en cada render a propósito: con esta pantalla no
  // hace falta más que sumar un arreglo, así que no se envuelve en useMemo.
  const hours = summarizeHours(logs, placement.requiredHours)

  return (
    <>
      <PageHeader
        title="Libro de horas"
        subtitle="Todo lo que registraste este período. Se guarda en este dispositivo aunque no haya señal."
        actions={<NewHourLogDialog placementId={placement.id} />}
      />

      <HoursProgressPanel hours={hours} note={submittedNote(hours)} />

      <Panel
        toolbar={
          <span className="ml-auto font-data text-12 text-inkSoft">
            {plural(logs.length, 'registro', 'registros')}
          </span>
        }
      >
        <HourLogsList logs={logs} />
      </Panel>
    </>
  )
}
