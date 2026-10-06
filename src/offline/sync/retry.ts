/**
 * Política de reintento del envío de la cola.
 *
 * Vive aparte del scheduler porque es aritmética pura: así se puede probar sin
 * montar la sincronización entera, y los tests del scheduler pueden anular la
 * espera sin tocar el tope de intentos.
 */

const DEFAULT_MAX_ATTEMPTS = 4
const BASE_DELAY_MS = 1_000

/** Tope de la espera. Más allá, reintentar deja de parecer que la app responde. */
export const MAX_DELAY_MS = 30_000

function positiveIntOr(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 1 ? parsed : fallback
}

/**
 * Cuántos intentos hace una corrida antes de rendirse. Configurable con
 * `VITE_SYNC_MAX_ATTEMPTS` para poder bajarlo en una demo o subirlo en campo,
 * donde la señal tarda más en volver.
 */
export const maxPushAttempts = positiveIntOr(
  import.meta.env?.VITE_SYNC_MAX_ATTEMPTS,
  DEFAULT_MAX_ATTEMPTS,
)

/**
 * Espera antes del intento `attempt + 1`, en milisegundos: 1s, 2s, 4s, 8s…
 *
 * Crece al doble para no insistir contra una red que acaba de fallar — cada
 * intento inmediato gasta batería y casi nunca encuentra la red de vuelta — y
 * se topa en `MAX_DELAY_MS` para que una caída larga no deje al estudiante
 * esperando minutos entre intentos.
 */
export function backoffDelayMs(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS)
}
