import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  type ApplicationDecision,
  type OfferApplication,
  decideApplication,
  listApplicationsForOffer,
} from '@/api/companies'
import { ApiError } from '@/api/client'
import { type Offer } from '@/api/offers'
import { FilterTabs } from '@/components/FilterTabs'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel, TableHeaderRow, rowClass } from '@/components/Panel'
import { SearchField, matchesSearch } from '@/components/SearchField'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Ledger } from '@/components/ledger/Ledger'
import { formatDate } from '@/lib/date'
import { loadOfferInto } from '@/lib/offer-loader'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'
import { OfferLoadError } from '@/components/OfferLoadError'

type DecisionState = 'interviewing' | 'accepting' | 'rejecting' | null

const ALL_STATUSES = 'TODAS'
const PAGE_SIZE = 10

const STATUS_FILTERS = [
  { value: ALL_STATUSES, label: 'Todas' },
  { value: 'SUBMITTED', label: 'Enviadas' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'ACCEPTED', label: 'Aceptadas' },
  { value: 'REJECTED', label: 'Descartadas' },
]

function acceptedCount(applications: OfferApplication[]): number {
  return applications.filter((application) => application.status === 'ACCEPTED').length
}

function ColumnHeader() {
  return (
    <TableHeaderRow>
      <span className="w-40">Estudiante</span>
      <span className="flex-1">Motivación</span>
      <span className="w-28">Enviada</span>
      <span className="w-32">Estado</span>
      <span className="w-60 text-right">Acciones</span>
    </TableHeaderRow>
  )
}

function BackLink() {
  return (
    <Link
      to="/ofertas-empresa"
      className="self-start text-13 font-semibold text-stamp hover:underline"
    >
      ← Volver a mis ofertas
    </Link>
  )
}

/**
 * Ledger de postulaciones de una oferta. A propósito no deshabilita
 * "Aceptar" al llegar al tope de cupos: el backend es la autoridad y
 * devuelve el error si dos aceptaciones simultáneas pasan la verificación
 * de cupos — ocultar el botón en el cliente escondería esa condición de
 * carrera real que el equipo debe poder encontrar.
 */
export function OfferApplicationsPage() {
  const { id } = useParams<{ id: string }>()
  const offerId = Number(id)

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined)
  const [applications, setApplications] = useState<OfferApplication[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [decisionState, setDecisionState] = useState<Record<number, DecisionState>>({})
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
  const filtered = useMemo(() => {
    if (!applications) return undefined
    return applications.filter(
      (application) =>
        (statusFilter === ALL_STATUSES || application.status === statusFilter) &&
        matchesSearch(application.student.fullName, query),
    )
  }, [applications, statusFilter, query])
  const paged = usePagedItems(filtered, PAGE_SIZE, `${statusFilter}|${query}`)
  const noneInFilter = paged !== undefined && paged.pageItems.length === 0 && (applications?.length ?? 0) > 0

  function refetchApplications() {
    return listApplicationsForOffer(offerId)
      .then((data) => setApplications(data))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar las postulaciones'))
  }

  useEffect(() => {
    let cancelled = false
    loadOfferInto(offerId, () => cancelled, setOffer, setLoadError)
    listApplicationsForOffer(offerId)
      .then((data) => {
        if (!cancelled) setApplications(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar las postulaciones')
        }
      })
    return () => {
      cancelled = true
    }
  }, [offerId])

  async function decide(applicationId: number, status: ApplicationDecision, state: DecisionState) {
    setDecisionError(null)
    setDecisionState((prev) => ({ ...prev, [applicationId]: state }))
    try {
      await decideApplication(applicationId, status)
      await refetchApplications()
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : 'No se pudo enviar la decisión')
    } finally {
      setDecisionState((prev) => ({ ...prev, [applicationId]: null }))
    }
  }

  if (loadError) {
    return <OfferLoadError message={loadError} backLink={<BackLink />} />
  }

  if (offer === undefined || applications === undefined) {
    return <LoadingState>Cargando postulaciones…</LoadingState>
  }

  if (offer === null) {
    return null
  }

  const occupied = acceptedCount(applications)
  const remaining = offer.seats - occupied

  return (
    <>
      <BackLink />

      <PageHeader
        title={offer.title}
        subtitle={
          remaining > 0
            ? `${remaining} de ${offer.seats} cupos restantes`
            : `${offer.seats} de ${offer.seats} cupos ocupados`
        }
      />

      {decisionError ? (
        <p role="alert" className="rounded-lg bg-chipVoid px-4 py-3 text-13 text-void">
          {decisionError}
        </p>
      ) : null}

      <Panel
        toolbar={
          applications.length > 0 ? (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                label="Buscar estudiante"
                placeholder="Buscar por nombre del estudiante"
                className="sm:max-w-xs"
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
        {applications.length === 0 ? (
          <EmptyState
            title="Todavía nadie postuló"
            description="Cuando la oferta esté publicada, los estudiantes pueden aplicar."
          />
        ) : null}
        {noneInFilter ? (
          <EmptyState
            title="Ninguna postulación coincide"
            description="Probá con otro nombre o cambiá el estado."
          />
        ) : null}
        {!noneInFilter && applications.length > 0 ? (
          <Ledger header={<ColumnHeader />}>
            {(paged?.pageItems ?? []).map((application) => {
              const state = decisionState[application.id] ?? null
              const busy = state !== null
              const decidable =
                application.status === 'SUBMITTED' || application.status === 'INTERVIEW'
              return (
                <div key={application.id} className={rowClass}>
                  <span className="text-14 font-semibold text-ink sm:w-40">
                    {application.student.fullName}
                  </span>
                  <span className="flex-1">
                    <span className="block max-w-[520px] rounded-md bg-soft px-3 py-2.5 text-13 leading-relaxed text-inkDeep">
                      {application.motivation}
                    </span>
                  </span>
                  <span className="font-data text-13 text-inkSoft sm:w-28">
                    {formatDate(application.submittedAt)}
                  </span>
                  <span className="sm:w-32">
                    <StatusBadge status={application.status} />
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-1.5 sm:w-60">
                    {decidable ? (
                      <>
                        {application.status === 'SUBMITTED' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => decide(application.id, 'INTERVIEW', 'interviewing')}
                            disabled={busy}
                          >
                            {state === 'interviewing' ? 'Enviando…' : 'Entrevista'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => decide(application.id, 'ACCEPTED', 'accepting')}
                          disabled={busy}
                        >
                          {state === 'accepting' ? 'Aceptando…' : 'Aceptar'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => decide(application.id, 'REJECTED', 'rejecting')}
                          disabled={busy}
                        >
                          {state === 'rejecting' ? 'Descartando…' : 'Descartar'}
                        </Button>
                      </>
                    ) : null}
                  </span>
                </div>
              )
            })}
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
            itemLabel="postulaciones"
          />
        ) : null}
      </Panel>
    </>
  )
}
