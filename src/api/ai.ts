import { api } from './client'

export interface WeeklySummary {
  placementId: number
  weekStart: string
  totalHours: number
  entries: number
  /** `null` cuando la semana no tiene jornadas: en ese caso no hubo llamada a la IA. */
  draft: string | null
}

/** Borrador de informe semanal (IA). Requiere red; el backend responde 503 si la IA no está configurada. */
export function weeklySummary(placementId: number, weekStart: string): Promise<WeeklySummary> {
  return api<WeeklySummary>(
    `/placements/${placementId}/weekly-summary?weekStart=${encodeURIComponent(weekStart)}`,
  )
}
