import { ApiError } from '@/api/client'
import { getOffer } from '@/api/offers'

type LoadedOffer = Awaited<ReturnType<typeof getOffer>>

/**
 * Carga una oferta para una página y reporta el resultado, salvo que la página ya
 * se haya desmontado (`isCancelled`). Un fallo deja la oferta en `null` con el motivo.
 */
export function loadOfferInto(
  offerId: number,
  isCancelled: () => boolean,
  setOffer: (offer: LoadedOffer | null) => void,
  setLoadError: (message: string) => void,
): void {
  getOffer(offerId)
    .then((data) => {
      if (!isCancelled()) setOffer(data)
    })
    .catch((err) => {
      if (!isCancelled()) {
        setOffer(null)
        setLoadError(err instanceof ApiError ? err.message : 'No se pudo cargar la oferta')
      }
    })
}
