import { useEffect, useState } from 'react'
import { type OfferInsights, offerInsights } from '@/api/recommendations'
import { Tag } from '@/components/Chip'
import { Section } from '@/components/Panel'
import { StatCard, StatGrid } from '@/components/StatCard'

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

interface OfferAffinityPanelProps {
  offerId: number
}

/**
 * Métrica del recomendador para la empresa: qué tanto se parecen los postulantes a la oferta,
 * medido con la misma similitud TF-IDF que usa el estudiante. Es informativa: no cambia nada.
 */
export function OfferAffinityPanel({ offerId }: OfferAffinityPanelProps) {
  const [insights, setInsights] = useState<OfferInsights | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    offerInsights(offerId)
      .then((data) => {
        if (!cancelled) setInsights(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [offerId])

  return (
    <Section title="Afinidad de postulantes">
      <div className="flex flex-col gap-4 px-[18px] py-4">
        {failed ? (
          <p role="alert" className="text-13 text-void">
            No se pudo calcular la afinidad de los postulantes
          </p>
        ) : null}
        {!failed && insights === undefined ? <p className="text-13 text-inkSoft">Calculando afinidad…</p> : null}
        {insights && insights.withHistoryCount === 0 ? (
          <p className="text-13 text-inkSoft">Sin datos suficientes para medir afinidad</p>
        ) : null}
        {insights && insights.withHistoryCount > 0 ? (
          <>
            <StatGrid>
              <StatCard label="Postulantes" value={insights.applicantCount} />
              <StatCard
                label="Con historial"
                value={insights.withHistoryCount}
                note={`de ${insights.applicantCount}`}
              />
              <StatCard
                label="Afinidad promedio"
                value={percent(insights.averageFit ?? 0)}
                note="similitud con la oferta"
                noteTone="stamp"
              />
              <StatCard
                label="Afinidad alta"
                value={insights.strongFitCount}
                note={`de ${insights.withHistoryCount} con historial`}
              />
            </StatGrid>
            {insights.topTerms.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-12 text-inkSoft">Términos en común:</span>
                {insights.topTerms.map((term) => (
                  <Tag key={term}>{term}</Tag>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Section>
  )
}
