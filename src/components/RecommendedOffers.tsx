import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { Chip, Tag } from '@/components/Chip'
import { Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'

const LIMIT = 3

function percent(score: number): number {
  return Math.round(score * 100)
}

interface RecommendedCardProps {
  item: RecommendedOffer
  /** Explicación de esta oferta, solo si el estudiante la pidió en esta tarjeta. */
  explanation: string | null | undefined
  explaining: boolean
  explainError: string | null
  onExplain: () => void
}

function RecommendedCard({ item, explanation, explaining, explainError, onExplain }: RecommendedCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-paperRule bg-surface p-4">
      <div className="min-w-0">
        <h3 className="text-14 font-semibold text-ink">{item.title}</h3>
        <div className="text-12 text-inkSoft">{item.company.name}</div>
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

      {explanation ? <p className="text-13 leading-relaxed text-inkBody">{explanation}</p> : null}
      {explainError ? (
        <p role="alert" className="text-12 font-medium text-void">
          {explainError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
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
 * Ofertas que el recomendador ordena por afinidad con lo que el estudiante ya postuló. Se ven
 * de una en una con las flechas. "Por qué" pide la explicación una sola vez (el modelo responde
 * por el lote) y solo se muestra en la oferta donde se pulsó. Si todas las afinidades son 0 o la
 * petición falla, el bloque no se muestra.
 */
export function RecommendedOffers() {
  const [items, setItems] = useState<RecommendedOffer[] | null>(null)
  const [index, setIndex] = useState(0)
  const [explanations, setExplanations] = useState<Record<number, string | null>>({})
  const [shownId, setShownId] = useState<number | null>(null)
  const [explainingId, setExplainingId] = useState<number | null>(null)
  const [explainError, setExplainError] = useState<{ id: number; message: string } | null>(null)

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

  async function explain(id: number) {
    setExplainError(null)
    if (id in explanations) {
      setShownId(id)
      return
    }
    setExplainingId(id)
    try {
      const data = await recommendedOffers(LIMIT, true)
      setExplanations(Object.fromEntries(data.map((offer) => [offer.id, offer.explanation])))
      setShownId(id)
    } catch (err) {
      setExplainError({ id, message: err instanceof ApiError ? err.message : 'No se pudo obtener la explicación' })
    } finally {
      setExplainingId(null)
    }
  }

  const hasSignal = items?.some((item) => item.score > 0) ?? false
  if (!items || !hasSignal) return null

  const count = items.length
  const go = (delta: number) => setIndex((current) => Math.min(count - 1, Math.max(0, current + delta)))

  return (
    <Section
      title="Recomendadas para ti"
      aside={
        <div className="flex items-center gap-3">
          <span className="font-data text-12 text-inkSoft" aria-live="polite">
            {index + 1} de {count}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Recomendación anterior"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Recomendación siguiente"
            onClick={() => go(1)}
            disabled={index === count - 1}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div className="overflow-hidden px-[18px] py-4">
        <div
          role="list"
          aria-label="Ofertas recomendadas"
          className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item, position) => (
            <div
              key={item.id}
              role="listitem"
              aria-hidden={position !== index}
              className="w-full shrink-0"
            >
              <RecommendedCard
                item={item}
                explanation={shownId === item.id ? explanations[item.id] : undefined}
                explaining={explainingId === item.id}
                explainError={explainError?.id === item.id ? explainError.message : null}
                onExplain={() => explain(item.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
