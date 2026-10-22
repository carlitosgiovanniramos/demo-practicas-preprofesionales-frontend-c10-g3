import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { Chip, Tag } from '@/components/Chip'
import { Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'

const LIMIT = 3
/** Desplazamiento por flecha, en píxeles: una tarjeta más su separación. */
const CARD_STEP = 300

function percent(score: number): number {
  return Math.round(score * 100)
}

interface RecommendedCardProps {
  item: RecommendedOffer
  onExplain: () => void
  explaining: boolean
  explainError: string | null
}

function RecommendedCard({ item, onExplain, explaining, explainError }: RecommendedCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-paperRule bg-surface p-4">
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-14 font-semibold text-ink">{item.title}</h3>
        <div className="truncate text-12 text-inkSoft">{item.company.name}</div>
      </div>

      <Chip tone="stamp" className="self-start">
        Afinidad {percent(item.score)}%
      </Chip>

      {item.matchedTerms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {item.matchedTerms.map((term) => (
            <Tag key={term}>{term}</Tag>
          ))}
        </div>
      ) : null}

      {item.explanation ? <p className="text-13 leading-relaxed text-inkBody">{item.explanation}</p> : null}
      {explainError ? (
        <p role="alert" className="text-12 font-medium text-void">
          {explainError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" variant="outline" onClick={onExplain} disabled={explaining}>
          {explaining ? 'Consultando…' : 'Por qué'}
        </Button>
        <Button asChild size="sm">
          <Link to={`/ofertas/${item.id}`}>Ver y postular</Link>
        </Button>
      </div>
    </article>
  )
}

/**
 * Ofertas que el recomendador ordena por afinidad con lo que el estudiante ya postuló, en un
 * carrusel horizontal. Si todas las afinidades son 0 (sin postulaciones todavía) o la petición
 * falla, el bloque no se muestra: es una ayuda, no una pieza obligatoria de la página.
 */
export function RecommendedOffers() {
  const [items, setItems] = useState<RecommendedOffer[] | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    recommendedOffers(LIMIT)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function explain() {
    setExplaining(true)
    setExplainError(null)
    try {
      setItems(await recommendedOffers(LIMIT, true))
    } catch (err) {
      setExplainError(err instanceof ApiError ? err.message : 'No se pudo obtener la explicación')
    } finally {
      setExplaining(false)
    }
  }

  function scrollTrack(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * CARD_STEP, behavior: 'smooth' })
  }

  const hasSignal = items?.some((item) => item.score > 0) ?? false
  if (!items || !hasSignal) return null

  return (
    <Section
      title="Recomendadas para ti"
      aside={
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Recomendación anterior"
            onClick={() => scrollTrack(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Recomendación siguiente"
            onClick={() => scrollTrack(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div
        ref={trackRef}
        role="list"
        aria-label="Ofertas recomendadas"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-[18px] py-4 [scrollbar-width:none]"
      >
        {items.map((item) => (
          <div key={item.id} role="listitem" className="w-[min(100%,280px)] shrink-0 snap-start">
            <RecommendedCard
              item={item}
              onExplain={explain}
              explaining={explaining}
              explainError={explainError}
            />
          </div>
        ))}
      </div>
    </Section>
  )
}
