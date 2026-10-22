import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Application, type ApplicationStatus, listMine } from '@/api/applications'
import { ApiError } from '@/api/client'
import { FilterTabs } from '@/components/FilterTabs'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  TableHeaderRow,
  rowClass,
} from '@/components/Panel'
import { SearchField, matchesSearch } from '@/components/SearchField'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Ledger } from '@/components/ledger/Ledger'
import { formatDate } from '@/lib/date'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'

const ALL_STATUSES = 'TODAS'
const PAGE_SIZE = 10

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: ALL_STATUSES, label: 'Todas' },
  { value: 'SUBMITTED', label: 'Enviadas' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'ACCEPTED', label: 'Aceptadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'WITHDRAWN', label: 'Retiradas' },
]

function ColumnHeader() {
  return (
    <TableHeaderRow>
      <span className="w-40">Empresa</span>
      <span className="flex-1">Oferta</span>
      <span className="w-32">Enviada</span>
      <span className="w-32 text-right">Estado</span>
    </TableHeaderRow>
  )
}

function ApplicationRows({ applications }: { applications: Application[] }) {
  return (
    <Ledger header={<ColumnHeader />}>
      {applications.map((application) => (
        <Link key={application.id} to={`/ofertas/${application.offerId}`} className={rowClass}>
          <span className="text-14 text-inkBody sm:w-40">{application.offer.company.name}</span>
          <span className="flex-1 text-14 font-semibold text-ink">{application.offer.title}</span>
          <span className="font-data text-13 text-inkSoft sm:w-32">{formatDate(application.submittedAt)}</span>
          <span className="sm:w-32 sm:text-right">
            <StatusBadge status={application.status} />
          </span>
        </Link>
      ))}
    </Ledger>
  )
}

function ApplicationsBody({ applications, error, filtered }: { applications: Application[] | undefined; error: string | null; filtered: boolean }) {
  if (error) return <ErrorState>{error}</ErrorState>
  if (applications === undefined) return <LoadingState>Cargando postulaciones…</LoadingState>
  if (applications.length === 0 && filtered) {
    return (
      <EmptyState
        title="Ninguna postulación coincide"
        description="Probá con otra búsqueda o cambiá el estado."
      />
    )
  }
  if (applications.length === 0) {
    return (
      <EmptyState
        title="Todavía no has postulado a ninguna oferta"
        description="Mirá las ofertas abiertas y postulá a la que te sirva."
        action={
          <Button asChild size="sm">
            <Link to="/ofertas">Ver ofertas</Link>
          </Button>
        }
      />
    )
  }
  return <ApplicationRows applications={applications} />
}

export function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)

  useEffect(() => {
    let cancelled = false
    listMine()
      .then((data) => {
        if (!cancelled) setApplications(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus postulaciones')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!applications) return undefined
    return applications.filter(
      (application) =>
        (statusFilter === ALL_STATUSES || application.status === (statusFilter as ApplicationStatus)) &&
        (matchesSearch(application.offer.title, query) || matchesSearch(application.offer.company.name, query)),
    )
  }, [applications, statusFilter, query])

  const paged = usePagedItems(filtered, PAGE_SIZE, `${statusFilter}|${query}`)
  const isFiltering = query !== '' || statusFilter !== ALL_STATUSES

  return (
    <>
      <PageHeader
        title="Mis postulaciones"
        subtitle="El estado de cada oferta a la que aplicaste, según respondan las empresas."
      />

      <Panel
        toolbar={
          applications && applications.length > 0 ? (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                label="Buscar postulaciones"
                placeholder="Buscar por oferta o empresa"
                className="sm:max-w-sm"
              />
              <FilterTabs
                label="Filtrar por estado"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS}
              />
              <span className="ml-auto font-data text-12 text-inkSoft" aria-live="polite">
                {plural(filtered?.length ?? 0, 'postulación', 'postulaciones')}
              </span>
            </>
          ) : undefined
        }
      >
        <ApplicationsBody applications={paged?.pageItems} error={error} filtered={isFiltering} />
        {paged && paged.totalPages > 1 ? (
          <Pagination
            page={paged.page}
            totalPages={paged.totalPages}
            totalItems={paged.totalItems}
            from={paged.from}
            to={paged.to}
            onPageChange={paged.setPage}
            itemLabel="postulaciones"
          />
        ) : null}
      </Panel>
    </>
  )
}
