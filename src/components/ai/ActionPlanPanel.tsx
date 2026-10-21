import { useEffect, useState } from 'react'
import { type ActionPlan, getActionPlan } from '@/api/ai'
import { FormAlert } from '@/components/FormAlert'
import { EmptyState, LoadingState, Section } from '@/components/Panel'
import { formatDate } from '@/lib/date'

/** Plan de acción en solo lectura para el estudiante: lo prepara el coordinador. */
export function ActionPlanPanel({ placementId }: { placementId: number }) {
  const [plan, setPlan] = useState<ActionPlan | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getActionPlan(placementId)
      .then((result) => {
        if (!cancelled) setPlan(result)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar tu plan de acción.')
      })
    return () => {
      cancelled = true
    }
  }, [placementId])

  return (
    <Section
      title="Plan de acción"
      aside={plan ? <span className="text-12 text-inkSoft">Actualizado el {formatDate(plan.updatedAt.slice(0, 10))}</span> : null}
    >
      <FormAlert message={error} />
      {plan === undefined && !error ? <LoadingState>Cargando tu plan…</LoadingState> : null}
      {plan === null ? (
        <EmptyState
          title="Todavía no hay un plan de acción"
          description="Tu coordinación lo preparará si tu estado de acreditación lo requiere."
        />
      ) : null}
      {plan ? <p className="whitespace-pre-line px-[18px] py-4 text-14 leading-relaxed text-inkBody">{plan.content}</p> : null}
    </Section>
  )
}
