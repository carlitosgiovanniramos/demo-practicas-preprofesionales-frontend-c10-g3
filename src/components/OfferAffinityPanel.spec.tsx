import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { type OfferInsights, offerInsights } from '@/api/recommendations'
import { OfferAffinityPanel } from './OfferAffinityPanel'

vi.mock('@/api/recommendations', () => ({ offerInsights: vi.fn() }))

const insights: OfferInsights = {
  applicantCount: 4,
  withHistoryCount: 3,
  averageFit: 0.5,
  strongFitCount: 1,
  topTerms: ['react', 'web'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OfferAffinityPanel', () => {
  it('muestra la afinidad promedio, la afinidad alta y los términos en común', async () => {
    vi.mocked(offerInsights).mockResolvedValue(insights)

    render(<OfferAffinityPanel offerId={7} />)

    expect(await screen.findByText('Afinidad de postulantes')).toBeTruthy()
    expect(screen.getByText('50%')).toBeTruthy()
    expect(screen.getByText('Afinidad alta')).toBeTruthy()
    expect(screen.getByText('react')).toBeTruthy()
    expect(offerInsights).toHaveBeenCalledWith(7)
  })

  it('sin postulantes con historial avisa que no hay datos suficientes', async () => {
    vi.mocked(offerInsights).mockResolvedValue({
      applicantCount: 2,
      withHistoryCount: 0,
      averageFit: null,
      strongFitCount: 0,
      topTerms: [],
    })

    render(<OfferAffinityPanel offerId={7} />)

    expect(await screen.findByText('Sin datos suficientes para medir afinidad')).toBeTruthy()
  })

  it('si la métrica no carga muestra un aviso sin romper la página', async () => {
    vi.mocked(offerInsights).mockRejectedValue(new ApiError(503, 'servicio no disponible'))

    render(<OfferAffinityPanel offerId={7} />)

    expect(await screen.findByText('No se pudo calcular la afinidad de los postulantes')).toBeTruthy()
  })
})
