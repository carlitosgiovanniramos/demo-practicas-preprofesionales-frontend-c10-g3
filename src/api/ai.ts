import { api } from './client'

export interface WeeklySummary {
  placementId: number
  weekStart: string
  totalHours: number
  entries: number
  /** `null` cuando la semana no tiene jornadas: en ese caso no hubo llamada a la IA. */
  draft: string | null
}

export interface AccreditationExplanation {
  placementId: number
  period: string
  level: string
  reasons: string[]
  explanation: string
}

/** Borrador de informe semanal (IA). Requiere red; el backend responde 503 si la IA no está configurada. */
export function weeklySummary(placementId: number, weekStart: string): Promise<WeeklySummary> {
  return api<WeeklySummary>(
    `/placements/${placementId}/weekly-summary?weekStart=${encodeURIComponent(weekStart)}`,
  )
}

/** Explicación (IA) del estado de acreditación de un placement. El nivel lo decide la regla, no la IA. */
export function accreditationExplanation(placementId: number, period: string): Promise<AccreditationExplanation> {
  return api<AccreditationExplanation>(
    `/placements/${placementId}/accreditation-explanation?period=${encodeURIComponent(period)}`,
  )
}
