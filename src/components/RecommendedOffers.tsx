import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { Tag } from '@/components/Chip'
import { Section } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Top de recomendaciones: coincide con el máximo que explica el backend (MAX_EXPLAINED). */
const LIMIT = 5
/** Tiempo que cada recomendación permanece al centro antes de rotar. */
const ROTATE_MS = 6000
const WIDE_QUERY = '(min-width: 768px)'

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

/** El foco cuenta como interacción de teclado solo si el navegador lo marca como visible (no con clic). */
function isKeyboardFocus(target: EventTarget): boolean {
  try {
    return (target as HTMLElement).matches(':focus-visible')
  } catch {
    return true
  }
}

function percent(score: number): number {
  return Math.round(score * 100)
}

/**
 * Posiciones de la lista que se ven a la vez, centradas en la activa. En pantalla ancha son
 * tres (anterior, activa, siguiente) y en móvil solo la activa. Con dos ofertas se muestran ambas.
 */
function visibleIndexes(active: number, count: number, wide: boolean): number[] {
  if (!wide || count === 1) return [active]
  if (count === 2) return [0, 1]
  return [(active - 1 + count) % count, active, (active + 1) % count]
}

interface RecommendedCardProps {
  item: RecommendedOffer
  active: boolean
  explanation: string | null | undefined
  explaining: boolean
  explainError: string | null
  onExplain: () => void
}

function RecommendedCard({ item, active, explanation, explaining, explainError, onExplain }: RecommendedCardProps) {
  return (
    <article
      className={cn(
        'flex h-full min-h-[300px] flex-col gap-4 rounded-2xl border bg-surface p-5 transition-all duration-500 motion-reduce:transition-none',
        active
          ? 'scale-100 border-stamp/40 opacity-100 shadow-[0_12px_32px_-12px_hsl(var(--scrim)/0.35)]'
          : 'scale-[0.96] border-paperRule opacity-60',
      )}
    >
      <div className="flex items-end justify-between gap-3 rounded-xl bg-soft px-4 py-4">
        <div>
          <div className="font-display text-28 font-semibold leading-none tabular-nums text-stamp">
            {percent(item.score)}%
          </div>
          <div className="mt-1 text-12 uppercase tracking-[0.06em] text-inkMute">afinidad</div>
        </div>
        <span className="max-w-[50%] truncate text-right text-12 text-inkSoft">{item.company.name}</span>
      </div>

      <h3 className="line-clamp-2 font-display text-19 font-bold leading-tight text-ink">{item.title}</h3>

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

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
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
 * Carrusel de las ofertas que el recomendador ordena por afinidad. La recomendación activa queda
 * al centro, rota sola cada pocos segundos y entra con una animación según el sentido del movimiento.
 * Se pausa con el botón, con el ratón encima, con el foco por teclado dentro, o mientras se lee la
 * explicación de la tarjeta activa. Cualquier clic o flecha reinicia el tiempo de la tarjeta elegida.
 * Si todas las afinidades son 0 o la petición falla, el bloque no se muestra.
 */
export function RecommendedOffers() {
  const [items, setItems] = useState<RecommendedOffer[] | null>(null)
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [wide, setWide] = useState(() => matches(WIDE_QUERY))
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(WIDE_QUERY)
    const onChange = () => setWide(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const count = items?.length ?? 0
  // Se lee la explicación de la tarjeta que está al centro: no rota hasta que el usuario cambie de tarjeta.
  const readingActive = shownId !== null && items?.[active]?.id === shownId
  const rotating = !paused && !hovered && !keyboardFocus && !readingActive && count > 1

  // El temporizador se reinicia en cada cambio de tarjeta: cada una dura ROTATE_MS completos.
  useEffect(() => {
    if (!rotating) return
    const id = window.setInterval(() => {
      setDirection(1)
      setActive((current) => (current + 1) % count)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [rotating, active, count])

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

  const go = (delta: 1 | -1) => {
    setDirection(delta)
    setActive((current) => (current + delta + count) % count)
  }
  const goTo = (position: number) => {
    if (position === active) return
    setDirection(position > active ? 1 : -1)
    setActive(position)
  }
  const shownIndexes = visibleIndexes(active, count, wide)
  const slideEnter = direction > 0 ? 'slide-in-from-right-16' : 'slide-in-from-left-16'

  return (
    <Section
      title="Recomendadas para ti"
      aside={
        <div className="flex items-center gap-3">
          <span className="font-data text-12 text-inkSoft" aria-live="polite">
            {active + 1} de {count}
          </span>
          {count > 1 ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={paused ? 'Reanudar rotación' : 'Pausar rotación'}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Button>
          ) : null}
        </div>
      }
    >
      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label="Recomendadas para ti"
        className="flex flex-col gap-5 px-[18px] py-5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={(event) => {
          if (isKeyboardFocus(event.target)) setKeyboardFocus(true)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false)
        }}
      >
        <div
          aria-live={rotating ? 'off' : 'polite'}
          aria-atomic="false"
          className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3"
        >
          {shownIndexes.map((position) => {
            const item = items[position]
            const isActive = position === active
            // La clave incluye la tarjeta activa: cada cambio monta de nuevo las diapositivas y
            // así la animación de entrada se ve en todas, no solo en la que aparece por primera vez.
            return (
              <div
                key={`${active}-${position}-${item.id}`}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${position + 1} de ${count}`}
                className={cn(
                  'animate-in fade-in-0 duration-500 ease-out motion-reduce:animate-none',
                  isActive ? cn(slideEnter, 'zoom-in-95') : 'zoom-in-95',
                )}
              >
                <RecommendedCard
                  item={item}
                  active={isActive}
                  explanation={shownId === item.id ? explanations[item.id] : undefined}
                  explaining={explainingId === item.id}
                  explainError={explainError?.id === item.id ? explainError.message : null}
                  onExplain={() => explain(item.id)}
                />
              </div>
            )
          })}
        </div>

        {count > 1 ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label="Recomendación anterior"
              onClick={() => go(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-1.5">
              {items.map((item, position) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Ir a la recomendación ${position + 1}`}
                  aria-disabled={position === active}
                  onClick={() => goTo(position)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    position === active ? 'w-8 bg-ink' : 'w-4 bg-line hover:bg-inkMute',
                  )}
                />
              ))}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label="Recomendación siguiente"
              onClick={() => go(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </Section>
  )
}
