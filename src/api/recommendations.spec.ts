import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { offerInsights, recommendedOffers } from './recommendations'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, api: vi.fn() }
})

afterEach(() => vi.clearAllMocks())

describe('recommendations api', () => {
  it('pide las ofertas recomendadas con el límite', async () => {
    vi.mocked(api).mockResolvedValue([])
    await recommendedOffers(3)
    expect(api).toHaveBeenCalledWith('/recommendations/offers?limit=3')
  })

  it('pide la explicación del modelo cuando se solicita', async () => {
    vi.mocked(api).mockResolvedValue([])
    await recommendedOffers(3, true)
    expect(api).toHaveBeenCalledWith('/recommendations/offers?limit=3&explain=true')
  })

  it('pide la afinidad de postulantes de una oferta', async () => {
    vi.mocked(api).mockResolvedValue({})
    await offerInsights(7)
    expect(api).toHaveBeenCalledWith('/recommendations/offers/7/insights')
  })
})
