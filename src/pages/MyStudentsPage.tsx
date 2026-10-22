import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Chip } from '@/components/Chip'
import { FilterTabs } from '@/components/FilterTabs'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel, TableHeaderRow, rowClass } from '@/components/Panel'
import { ProgressBar } from '@/components/ProgressBar'
import { StatCard, StatGrid } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Ledger } from '@/components/ledger/Ledger'
import { db, type LocalHourLog, type LocalPlacement } from '@/offline/db'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'
import { moveItemFocus } from '@/shortcuts/listFocus'
import { ShortcutHint } from '@/shortcuts/ShortcutHint'
import { useScreenShortcuts } from '@/shortcuts/ShortcutsProvider'

interface StudentRow {
  placement: LocalPlacement
  approvedHours: number
  submittedHours: number
}

type QueueFilter = 'TODOS' | 'ESPERANDO' | 'AL_DIA'

const PAGE_SIZE = 10

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ESPERANDO', label: 'Esperando revisión' },
  { value: 'AL_DIA', label: 'Al día' },
]

function ColumnHeader() {
  return (
    <TableHeaderRow>
      <span className="w-32">Estudiante</span>
      <span className="flex-1">Empresa</span>
      <span className="w-44">Horas aprobadas</span>
      <span className="w-40">Estado</span>
      <span className="w-24 text-right">Revisión</span>
    </TableHeaderRow>
  )
}

function sumHoursByStatus(logs: LocalHourLog[]): { approvedHours: number; submittedHours: number } {
  const totals = { approvedHours: 0, submittedHours: 0 }
  for (const log of logs) {
    if (log.status === 'APPROVED') totals.approvedHours += log.hours
    if (log.status === 'SUBMITTED') totals.submittedHours += log.hours
  }
  return totals
}

const QUEUE_PREDICATES: Record<QueueFilter, (row: StudentRow) => boolean> = {
  TODOS: () => true,
  ESPERANDO: (row) => row.submittedHours > 0,
  AL_DIA: (row) => row.submittedHours === 0,
}

function filterQueue(rows: StudentRow[], queue: QueueFilter): StudentRow[] {
  return rows.filter(QUEUE_PREDICATES[queue])
}

function StudentQueueRow({ placement, approvedHours, submittedHours }: StudentRow) {
  const requiredHours = placement.requiredHours
  const approvedPct = requiredHours > 0 ? Math.min(100, (approvedHours / requiredHours) * 100) : 0
  return (
    <div className={rowClass} data-shortcut-item="">
      <span className="text-14 font-semibold text-ink sm:w-32">Estudiante #{placement.studentId}</span>
      <span className="flex-1 text-14 text-inkBody">Empresa #{placement.companyId}</span>
      <span className="flex items-center gap-2.5 sm:w-44">
        <ProgressBar
          size="sm"
          value={approvedPct}
          label={`Progreso del estudiante ${placement.studentId}`}
          className="flex-1"
        />
        <span className="font-data text-12 text-inkSoft">
          {approvedHours.toFixed(1)}/{requiredHours}
        </span>
      </span>
      <span className="sm:w-40">
        <Chip tone={submittedHours > 0 ? 'pending' : 'stamp'}>
          {submittedHours > 0 ? `${submittedHours.toFixed(1)} h sin revisar` : 'Al día'}
        </Chip>
      </span>
      <span className="sm:w-24 sm:text-right">
        <Button asChild size="sm" variant="outline">
          <Link to={`/practicantes/${placement.id}/horas`}>Revisar</Link>
        </Button>
      </span>
    </div>
  )
}

/**
 * Cola de trabajo del tutor: sus placements con el conteo de horas
 * pendientes de revisión por estudiante. Lee de Dexie, no de la red — tiene
 * que funcionar sin señal, igual que el resto de la app.
 */
export function MyStudentsPage() {
  const { user } = useAuth()

  const rows = useLiveQuery<StudentRow[] | undefined>(async () => {
    if (!user) return undefined
    const placements = await db.placements.where('tutorId').equals(user.id).toArray()
    return Promise.all(
      placements.map(async (placement) => {
        const logs = await db.hourLogs.where('placementId').equals(placement.id).toArray()
        return { placement, ...sumHoursByStatus(logs) }
      }),
    )
  }, [user?.id])

  if (rows === undefined) {
    return <LoadingState>Cargando tus practicantes…</LoadingState>
  }

  return <StudentsView rows={rows} />
}

function StudentsStats({ rows }: { rows: StudentRow[] }) {
  const waiting = rows.filter((row) => row.submittedHours > 0).length
  const pendingHours = rows.reduce((total, row) => total + row.submittedHours, 0)
  return (
    <StatGrid>
      <StatCard label="Practicantes" value={String(rows.length)} note="activos" />
      <StatCard
        label="Esperando revisión"
        value={String(waiting)}
        note={waiting === 1 ? 'practicante' : 'practicantes'}
        noteTone={waiting > 0 ? 'pending' : 'neutral'}
      />
      <StatCard
        label="Horas sin revisar"
        value={pendingHours.toFixed(1)}
        note="tu decisión"
        noteTone={pendingHours > 0 ? 'pending' : 'neutral'}
      />
    </StatGrid>
  )
}

function StudentsView({ rows }: { rows: StudentRow[] }) {
  const [queue, setQueue] = useState<QueueFilter>('TODOS')
  const filtered = useMemo(() => filterQueue(rows, queue), [rows, queue])
  const paged = usePagedItems(filtered, PAGE_SIZE, queue)
  const noneInQueue = paged !== undefined && paged.pageItems.length === 0

  // j/k recorren a los practicantes de la cola; Enter abre el enfocado (el enlace "Revisar").
  useScreenShortcuts([
    { id: 'students-next', label: 'Siguiente practicante', key: 'j', run: () => moveItemFocus(1) },
    { id: 'students-prev', label: 'Practicante anterior', key: 'k', run: () => moveItemFocus(-1) },
  ])

  return (
    <>
      <PageHeader
        title="Mis practicantes"
        subtitle="Ordenados como los devuelve tu cola: revisá primero lo que está esperando."
      />

      {rows.length > 0 ? <StudentsStats rows={rows} /> : null}

      <Panel
        toolbar={
          rows.length > 0 ? (
            <>
              <FilterTabs
                label="Filtrar practicantes"
                value={queue}
                onChange={(value) => setQueue(value as QueueFilter)}
                options={QUEUE_FILTERS}
              />
              <ShortcutHint items={[{ keys: 'j / k', label: 'practicante' }, { keys: 'Enter', label: 'revisar' }]} />
              <span className="ml-auto font-data text-12 text-inkSoft" aria-live="polite">
                {plural(filtered?.length ?? 0, 'practicante', 'practicantes')}
              </span>
            </>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            illustration="people"
            title="Todavía no tienes practicantes asignados"
            description="Cuando la coordinación te asigne uno, aparece acá."
          />
        ) : null}
        {rows.length > 0 && noneInQueue ? (
          <EmptyState
            illustration="check"
            title="Ningún practicante en esta cola"
            description="Cambiá el filtro para ver al resto."
          />
        ) : null}
        {rows.length > 0 && !noneInQueue ? (
          <Ledger header={<ColumnHeader />}>
            {(paged?.pageItems ?? []).map((row) => (
              <StudentQueueRow key={row.placement.id} {...row} />
            ))}
          </Ledger>
        ) : null}
        {paged && paged.pageItems.length > 0 ? (
          <Pagination
            page={paged.page}
            totalPages={paged.totalPages}
            totalItems={paged.totalItems}
            from={paged.from}
            to={paged.to}
            onPageChange={paged.setPage}
            itemLabel="practicantes"
          />
        ) : null}
      </Panel>
    </>
  )
}
