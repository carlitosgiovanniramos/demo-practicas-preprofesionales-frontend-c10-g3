import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getActionPlan } from '@/api/ai'
import { ActionPlanPanel } from './ActionPlanPanel'

vi.mock('@/api/ai', () => ({ getActionPlan: vi.fn() }))

afterEach(() => vi.clearAllMocks())

describe('ActionPlanPanel', () => {
  it('muestra el plan guardado en solo lectura', async () => {
    vi.mocked(getActionPlan).mockResolvedValue({ placementId: 3, content: '1. Entregar informe (estudiante)', updatedAt: '2026-10-21T10:00:00.000Z' })
    render(<ActionPlanPanel placementId={3} />)

    expect(await screen.findByText('1. Entregar informe (estudiante)')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('explica cuando todavía no hay plan', async () => {
    vi.mocked(getActionPlan).mockResolvedValue(null)
    render(<ActionPlanPanel placementId={3} />)

    expect(await screen.findByText('Todavía no hay un plan de acción')).toBeTruthy()
  })
})
