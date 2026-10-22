import { Briefcase, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { type Offer, listOffers } from '@/api/offers'
import { FilterTabs } from '@/components/FilterTabs'
import { OfferCard, OfferGrid } from '@/components/OfferCard'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { AsyncSection, EmptyState } from '@/components/Panel'
import { SearchField, matchesSearch } from '@/components/SearchField'
import { Button } from '@/components/ui/button'
import { formatPeriod } from '@/lib/date'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'

const ALL_MODALITIES = 'TODAS'
const PAGE_SIZE = 9

interface ToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  modalities: string[]
  value: string
  onChange: (value: string) => void
  count: number
}

function OffersToolbar({ query, onQueryChange, modalities, value, onChange, count }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={onQueryChange}
          label="Buscar ofertas"
          placeholder="Buscar por cargo, empresa o descripción"
          className="sm:max-w-md"
        />
        <span className="ml-auto font-data text-12 text-inkSoft" aria-live="polite">
          {plural(count, 'oferta', 'ofertas')}
        </span>
      </div>
      <FilterTabs
        label="Filtrar por modalidad"
        value={value}
        onChange={onChange}
        options={[
          { value: ALL_MODALITIES, label: 'Todas' },
          ...modalities.map((modality) => ({ value: modality, label: modality })),
        ]}
      />
    </div>
  )
}

function OffersList({ offers }: { offers: Offer[] }) {
  return (
    <OfferGrid>
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          title={offer.title}
          subtitle={offer.company.name}
          tags={[
            offer.modality,
            plural(offer.seats, 'cupo', 'cupos'),
            `${offer.requiredHours} h`,
          ]}
          description={offer.description}
          meta={formatPeriod(offer.periodStart, offer.periodEnd)}
          actions={
            <Button asChild size="sm">
              <Link to={`/ofertas/${offer.id}`}>Ver y postular</Link>
            </Button>
          }
        />
      ))}
    </OfferGrid>
  )
}

function matchesOffer(offer: Offer, query: string): boolean {
  return (
    matchesSearch(offer.title, query) ||
    matchesSearch(offer.company.name, query) ||
    matchesSearch(offer.description, query)
  )
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [modalityFilter, setModalityFilter] = useState(ALL_MODALITIES)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setError(null)
    listOffers()
      .then((data) => {
        if (!cancelled) setOffers(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las ofertas')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const modalities = useMemo(() => {
    if (!offers) return []
    return Array.from(new Set(offers.map((offer) => offer.modality))).sort()
  }, [offers])

  const filtered = useMemo(() => {
    if (!offers) return undefined
    return offers.filter(
      (offer) =>
        (modalityFilter === ALL_MODALITIES || offer.modality === modalityFilter) &&
        matchesOffer(offer, query),
    )
  }, [offers, modalityFilter, query])

  const paged = usePagedItems(filtered, PAGE_SIZE, `${modalityFilter}|${query}`)

  return (
    <>
      <PageHeader
        title="Ofertas de práctica"
        subtitle="Publicadas por empresas con convenio y aprobadas por la coordinación."
      />

      {modalities.length > 0 ? (
        <OffersToolbar
          query={query}
          onQueryChange={setQuery}
          modalities={modalities}
          value={modalityFilter}
          onChange={setModalityFilter}
          count={filtered?.length ?? 0}
        />
      ) : null}

      <AsyncSection
        error={error}
        data={paged?.pageItems}
        loadingLabel="Cargando ofertas…"
        empty={
          query || modalityFilter !== ALL_MODALITIES ? (
            <EmptyState
              icon={SearchX}
              title="Ninguna oferta coincide con la búsqueda"
              description="Probá con otras palabras o quitá el filtro de modalidad."
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No hay ofertas publicadas para este periodo"
              description="Vuelve a revisar más adelante."
            />
          )
        }
      >
        {(items) => (
          <div className="flex flex-col gap-4">
            <OffersList offers={items} />
            {paged ? (
              <Pagination
                page={paged.page}
                totalPages={paged.totalPages}
                totalItems={paged.totalItems}
                from={paged.from}
                to={paged.to}
                onPageChange={paged.setPage}
                itemLabel="ofertas"
              />
            ) : null}
          </div>
        )}
      </AsyncSection>
    </>
  )
}
