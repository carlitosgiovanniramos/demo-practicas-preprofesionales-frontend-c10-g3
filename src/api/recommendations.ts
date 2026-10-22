import { api } from './client'
import type { Offer } from './offers'

/** Oferta recomendada al estudiante: afinidad 0..1 y los términos que la explican. */
export interface RecommendedOffer extends Offer {
  score: number
  matchedTerms: string[]
  /** Solo viene cuando se pidió la explicación del modelo. */
  explanation: string | null
}

/** Métrica de afinidad de los postulantes de una oferta propia. */
export interface OfferInsights {
  applicantCount: number
  withHistoryCount: number
  averageFit: number | null
  strongFitCount: number
  topTerms: string[]
}

/** Ofertas recomendadas para el estudiante. `explain` pide la razón del modelo (puede responder 503). */
export function recommendedOffers(limit: number, explain = false): Promise<RecommendedOffer[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (explain) params.set('explain', 'true')
  return api<RecommendedOffer[]>(`/recommendations/offers?${params.toString()}`)
}

/** Afinidad de los postulantes con una oferta. Solo la empresa dueña o la coordinación. */
export function offerInsights(offerId: number): Promise<OfferInsights> {
  return api<OfferInsights>(`/recommendations/offers/${offerId}/insights`)
}
