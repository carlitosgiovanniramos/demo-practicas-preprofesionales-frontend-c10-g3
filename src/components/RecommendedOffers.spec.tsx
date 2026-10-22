import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { type RecommendedOffer, recommendedOffers } from '@/api/recommendations'
import { RecommendedOffers } from './RecommendedOffers'

vi.mock('@/api/recommendations', () => ({ recommendedOffers: vi.fn() }))

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecommendedOffers', () => {
  it('muestra la afinidad en porcentaje y los términos que la explican', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue([offer({ score: 0.42, matchedTerms: ['react', 'web'] })])

    renderPanel()

    expect(await screen.findByText('Recomendadas para ti')).toBeTruthy()
    expect(screen.getByText('Afinidad 42%')).toBeTruthy()
    expect(screen.getByText('react')).toBeTruthy()
    expect(recommendedOffers).toHaveBeenCalledWith(3)
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

  it('muestra una recomendación a la vez y las flechas pasan a la siguiente o anterior', async () => {
    vi.mocked(recommendedOffers).mockResolvedValue([
      offer({ id: 1, title: 'Desarrollador React' }),
      offer({ id: 2, title: 'Analista de datos' }),
    ])

    renderPanel()
    expect(await screen.findByText('1 de 2')).toBeTruthy()
    expect(prevButton().hasAttribute('disabled')).toBe(true)

    fireEvent.click(nextButton())
    expect(screen.getByText('2 de 2')).toBeTruthy()
    expect(nextButton().hasAttribute('disabled')).toBe(true)

    fireEvent.click(prevButton())
    expect(screen.getByText('1 de 2')).toBeTruthy()
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
    expect(screen.queryByText('Comparte datos con tu experiencia.')).toBeNull()

    fireEvent.click(nextButton())
    // La explicación de la primera tarjeta queda oculta, no visible en la segunda.
    expect(screen.getByText('Comparte React con tu experiencia.').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByText('Comparte datos con tu experiencia.')).toBeNull()
    fireEvent.click(explainButton())
    expect(await screen.findByText('Comparte datos con tu experiencia.')).toBeTruthy()
    expect(recommendedOffers).toHaveBeenCalledTimes(2)
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
