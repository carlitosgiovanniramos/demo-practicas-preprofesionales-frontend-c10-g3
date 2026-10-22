import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { RecommendedOffers } from './RecommendedOffers'

vi.mock('@/api/recommendations', () => ({ recommendedOffers: vi.fn() }))

const ROTATE_MS = 6000

function offer(overrides: Partial<RecommendedOffer>): RecommendedOffer {
  return {
    id: 1,
    companyId: 1,
    title: 'Desarrollador React',
    description: 'Interfaces web con React',
    modality: 'remoto',
    seats: 2,
    requiredHours: 240,
    periodStart: '2026-03-01',
    periodEnd: '2026-07-31',
    status: 'PUBLISHED',
    publishedAt: null,
    company: { id: 1, name: 'Acme' },
    score: 0.42,
    matchedTerms: ['react'],
    explanation: null,
    ...overrides,
  }
}

function threeOffers(): RecommendedOffer[] {
  return [
    offer({ id: 1, title: 'Desarrollador React' }),
    offer({ id: 2, title: 'Analista de datos' }),
    offer({ id: 3, title: 'Auxiliar de soporte' }),
  ]
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <RecommendedOffers />
    </MemoryRouter>,
  )
}

const nextButton = () => screen.getByRole('button', { name: 'Recomendación siguiente' })
const prevButton = () => screen.getByRole('button', { name: 'Recomendación anterior' })
const explainButton = () => screen.getByRole('button', { name: 'Por qué' })
const region = () => screen.getByRole('region', { name: 'Recomendadas para ti' })

/** Deja que las promesas pendientes (la carga inicial) se resuelvan dentro de act. */
async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

/**
 * Simula un navegador con media queries: `wide` decide si la pantalla es ancha y `reduced` si el
 * sistema pide reducir animaciones (Windows con "Efectos de animación" desactivados).
 */
function stubMatchMedia(wide: boolean, reduced = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width') ? wide : query.includes('reduce') ? reduced : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  stubMatchMedia(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RecommendedOffers', () => {
  it('muestra la afinidad en porcentaje y los términos que la explican', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue([offer({ score: 0.42, matchedTerms: ['react', 'web'] })])

    renderPanel()

    expect(await screen.findByText('Recomendadas para ti')).toBeTruthy()
    expect(screen.getByText('42%')).toBeTruthy()
    expect(screen.getByText('react')).toBeTruthy()
    expect(recommendedOffers).toHaveBeenCalledWith(5)
  })

  it('no muestra nada cuando todas las afinidades son 0 (sin postulaciones)', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue([offer({ score: 0, matchedTerms: [] })])

    renderPanel()

    await waitFor(() => expect(recommendedOffers).toHaveBeenCalled())
    expect(screen.queryByText('Recomendadas para ti')).toBeNull()
  })

  it('si la petición falla no muestra el bloque ni rompe la página', async () => {
    vi.mocked(recommendedOffers).mockRejectedValue(new ApiError(500, 'error'))

    renderPanel()

    await waitFor(() => expect(recommendedOffers).toHaveBeenCalled())
    expect(screen.queryByText('Recomendadas para ti')).toBeNull()
  })

  it('en pantallas anchas muestra la activa al centro con sus vecinas', async () => {
    stubMatchMedia(true)
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await screen.findByText('1 de 3')

    const slides = within(region()).getAllByRole('group')
    expect(slides).toHaveLength(3)
    expect(slides[1].textContent).toContain('Desarrollador React')
    expect(slides[0].textContent).toContain('Auxiliar de soporte')
    expect(slides[2].textContent).toContain('Analista de datos')
  })

  it('las flechas avanzan y retroceden dando la vuelta a la lista', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await screen.findByText('1 de 3')

    fireEvent.click(prevButton())
    expect(screen.getByText('3 de 3')).toBeTruthy()
    fireEvent.click(nextButton())
    fireEvent.click(nextButton())
    expect(screen.getByText('2 de 3')).toBeTruthy()
  })

  it('rota sola cada pocos segundos y vuelve al inicio al final', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await flush()
    expect(screen.getByText('1 de 3')).toBeTruthy()

    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('2 de 3')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2 * ROTATE_MS))
    expect(screen.getByText('1 de 3')).toBeTruthy()
  })

  it('rota sola aunque el sistema pida reducir animaciones; esa preferencia solo quita el movimiento', async () => {
    vi.useFakeTimers()
    stubMatchMedia(false, true)
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await flush()
    act(() => vi.advanceTimersByTime(ROTATE_MS))

    expect(screen.getByText('2 de 3')).toBeTruthy()
  })

  it('una flecha no detiene la rotación: la tarjeta elegida dura su tiempo y luego sigue', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await flush()
    fireEvent.click(nextButton())
    expect(screen.getByText('2 de 3')).toBeTruthy()

    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('3 de 3')).toBeTruthy()
  })

  it('la explicación de la tarjeta activa pausa la rotación y se reanuda al cambiar de tarjeta', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers)
      .mockResolvedValueOnce(threeOffers())
      .mockResolvedValueOnce(threeOffers().map((o) => ({ ...o, explanation: 'Texto de prueba.' })))

    renderPanel()
    await flush()
    fireEvent.click(explainButton())
    await flush()
    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('1 de 3')).toBeTruthy()

    fireEvent.click(nextButton())
    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('3 de 3')).toBeTruthy()
  })

  it('la diapositiva que entra se anima en la dirección del movimiento', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await screen.findByText('1 de 3')
    fireEvent.click(nextButton())
    expect(screen.getByRole('group', { name: '2 de 3' }).className).toContain('slide-in-from-right-16')

    fireEvent.click(prevButton())
    expect(screen.getByRole('group', { name: '1 de 3' }).className).toContain('slide-in-from-left-16')
  })

  it('se detiene al pasar el ratón y reanuda al salir', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await flush()
    fireEvent.mouseEnter(region())
    act(() => vi.advanceTimersByTime(2 * ROTATE_MS))
    expect(screen.getByText('1 de 3')).toBeTruthy()

    fireEvent.mouseLeave(region())
    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('2 de 3')).toBeTruthy()
  })

  it('el botón de pausa detiene la rotación y su etiqueta cambia', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers).mockResolvedValue(threeOffers())

    renderPanel()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar rotación' }))
    act(() => vi.advanceTimersByTime(2 * ROTATE_MS))
    expect(screen.getByText('1 de 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar rotación' }))
    act(() => vi.advanceTimersByTime(ROTATE_MS))
    expect(screen.getByText('2 de 3')).toBeTruthy()
  })

  it('"Por qué" muestra la explicación solo de la oferta donde se pulsó', async () => {
    vi.mocked(recommendedOffers)
      .mockResolvedValueOnce([offer({ id: 1 }), offer({ id: 2, title: 'Analista de datos' })])
      .mockResolvedValueOnce([
        offer({ id: 1, explanation: 'Comparte React con tu experiencia.' }),
        offer({ id: 2, title: 'Analista de datos', explanation: 'Comparte datos con tu experiencia.' }),
      ])

    renderPanel()
    await screen.findByText('1 de 2')
    fireEvent.click(explainButton())

    expect(await screen.findByText('Comparte React con tu experiencia.')).toBeTruthy()

    fireEvent.click(nextButton())
    expect(screen.queryByText('Comparte React con tu experiencia.')).toBeNull()
    expect(screen.queryByText('Comparte datos con tu experiencia.')).toBeNull()

    fireEvent.click(explainButton())
    expect(await screen.findByText('Comparte datos con tu experiencia.')).toBeTruthy()
    expect(recommendedOffers).toHaveBeenCalledTimes(2)
  })

  it('mientras se lee una explicación la rotación no avanza', async () => {
    vi.useFakeTimers()
    vi.mocked(recommendedOffers)
      .mockResolvedValueOnce(threeOffers())
      .mockResolvedValueOnce(threeOffers().map((o) => ({ ...o, explanation: 'Texto de prueba.' })))

    renderPanel()
    await flush()
    fireEvent.click(explainButton())
    await flush()
    expect(screen.getByText('Texto de prueba.')).toBeTruthy()

    act(() => vi.advanceTimersByTime(2 * ROTATE_MS))
    expect(screen.getByText('1 de 3')).toBeTruthy()
  })

  it('si el modelo no responde muestra el mensaje del proveedor', async () => {
    vi.mocked(recommendedOffers)
      .mockResolvedValueOnce([offer({})])
      .mockRejectedValueOnce(new ApiError(503, 'MiniMax respondió 429'))

    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Por qué' }))

    expect(await screen.findByText('MiniMax respondió 429')).toBeTruthy()
  })
})
