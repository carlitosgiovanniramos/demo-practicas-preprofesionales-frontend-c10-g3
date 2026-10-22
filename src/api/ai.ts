import { api } from './client'

export interface WeeklySummary {
  placementId: number
  weekStart: string
  totalHours: number
  entries: number
  /** `null` cuando la semana no tiene jornadas: en ese caso no hubo llamada a la IA. */
  draft: string | null
}

export interface ActionPlan {
  placementId: number
  /** `null` cuando todavía no hay plan guardado (el backend nunca responde con cuerpo vacío). */
  content: string | null
  updatedAt: string | null
}

/** Borrador de informe semanal (IA). Requiere red; el backend responde 503 si la IA no está configurada. */
export function weeklySummary(placementId: number, weekStart: string): Promise<WeeklySummary> {
  return api<WeeklySummary>(
    `/placements/${placementId}/weekly-summary?weekStart=${encodeURIComponent(weekStart)}`,
  )
}

/** Plan de acción del placement; `content` es `null` si el coordinador aún no creó uno. */
export function getActionPlan(placementId: number): Promise<ActionPlan> {
  return api<ActionPlan>(`/placements/${placementId}/action-plan`)
}

/** Guarda (crea o reemplaza) el plan. Solo el coordinador puede hacerlo. */
export function saveActionPlan(placementId: number, content: string): Promise<ActionPlan> {
  return api<ActionPlan>(`/placements/${placementId}/action-plan`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

/** Borrador del plan con IA. No guarda nada: el coordinador lo revisa y lo guarda aparte. */
export function draftActionPlan(placementId: number, period: string): Promise<{ draft: string }> {
  return api<{ draft: string }>(
    `/placements/${placementId}/action-plan/draft?period=${encodeURIComponent(period)}`,
    { method: 'POST' },
  )
}
