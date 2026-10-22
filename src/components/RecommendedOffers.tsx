import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { Chip, Tag } from '@/components/Chip'
import { Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'

const LIMIT = 3

function percent(score: number): number {
  return Math.round(score * 100)
}

interface RecommendedRowProps {
  item: RecommendedOffer
  onExplain: () => void
  explaining: boolean
  explainError: string | null
}

function RecommendedRow({ item, onExplain, explaining, explainError }: RecommendedRowProps) {
  return (
    <div className="flex flex-col gap-2 px-[18px] py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-14 font-semibold text-ink">{item.title}</div>
          <div className="text-12 text-inkSoft">{item.company.name}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="stamp">Afinidad {percent(item.score)}%</Chip>
          <Button type="button" size="sm" variant="outline" onClick={onExplain} disabled={explaining}>
            {explaining ? 'Consultando…' : 'Por qué'}
          </Button>
          <Button asChild size="sm">
            <Link to={`/ofertas/${item.id}`}>Ver y postular</Link>
          </Button>
        </div>
      </div>

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
    </div>
  )
}

/**
 * Ofertas que el recomendador ordena por afinidad con lo que el estudiante ya postuló. Si todas
 * las afinidades son 0 (sin postulaciones todavía) o la petición falla, el bloque no se muestra:
 * es una ayuda, no una pieza obligatoria de la página.
 */
export function RecommendedOffers() {
  const [items, setItems] = useState<RecommendedOffer[] | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)

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

  const hasSignal = items?.some((item) => item.score > 0) ?? false
  if (!items || !hasSignal) return null

  return (
    <Section title="Recomendadas para ti">
      <div className="divide-y divide-paperRule">
        {items.map((item) => (
          <RecommendedRow
            key={item.id}
            item={item}
            onExplain={explain}
            explaining={explaining}
            explainError={explainError}
          />
        ))}
      </div>
    </Section>
  )
}
