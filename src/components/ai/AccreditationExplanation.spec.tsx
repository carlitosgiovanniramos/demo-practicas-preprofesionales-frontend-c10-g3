import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { accreditationExplanation } from '@/api/ai'
import { ApiError } from '@/api/client'
import { AccreditationExplanation } from './AccreditationExplanation'

vi.mock('@/api/ai', () => ({ accreditationExplanation: vi.fn() }))
vi.mock('@/offline/hooks/useOnline', () => ({ useOnline: vi.fn(() => true) }))

afterEach(() => vi.clearAllMocks())

const explainButton = () => screen.getByRole('button', { name: 'Explicar con IA' })

describe('AccreditationExplanation', () => {
  it('no llama a la IA hasta que el coordinador abre la explicación', () => {
    render(<AccreditationExplanation placementId={3} period="2026-1" />)

    expect(accreditationExplanation).not.toHaveBeenCalled()
    expect(explainButton().getAttribute('aria-expanded')).toBe('false')
  })

  it('muestra la explicación con su aviso de origen', async () => {
    vi.mocked(accreditationExplanation).mockResolvedValue({
      placementId: 3,
      period: '2026-1',
      level: 'PENDIENTE',
      reasons: ['falta informe final'],
      explanation: 'Le falta subir el informe final.',
    })
    render(<AccreditationExplanation placementId={3} period="2026-1" />)

    fireEvent.click(explainButton())

    expect(await screen.findByText('Le falta subir el informe final.')).toBeTruthy()
    expect(accreditationExplanation).toHaveBeenCalledWith(3, '2026-1')
    expect(screen.getByText(/El nivel y los motivos los decide la regla/)).toBeTruthy()
  })

  it('ofrece reintentar cuando la IA falla', async () => {
    vi.mocked(accreditationExplanation).mockRejectedValue(new ApiError(503, 'x'))
    render(<AccreditationExplanation placementId={3} period="2026-1" />)

    fireEvent.click(explainButton())

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
