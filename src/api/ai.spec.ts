import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { draftActionPlan, getActionPlan, saveActionPlan, weeklySummary } from './ai'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, api: vi.fn() }
})

afterEach(() => vi.clearAllMocks())

describe('ai api', () => {
  it('pide el borrador semanal con el placement y la semana', async () => {
    vi.mocked(api).mockResolvedValue({})
    await weeklySummary(7, '2026-04-06')
    expect(api).toHaveBeenCalledWith('/placements/7/weekly-summary?weekStart=2026-04-06')
  })

  it('lee el plan de acción del placement', async () => {
    vi.mocked(api).mockResolvedValue(null)
    await getActionPlan(7)
    expect(api).toHaveBeenCalledWith('/placements/7/action-plan')
  })

  it('guarda el plan con PUT y el contenido en el cuerpo', async () => {
    vi.mocked(api).mockResolvedValue({})
    await saveActionPlan(7, 'Plan')
    expect(api).toHaveBeenCalledWith('/placements/7/action-plan', {
      method: 'PUT',
      body: JSON.stringify({ content: 'Plan' }),
    })
  })

  it('pide el borrador del plan con POST y el periodo', async () => {
    vi.mocked(api).mockResolvedValue({ draft: '' })
    await draftActionPlan(7, '2026-2')
    expect(api).toHaveBeenCalledWith('/placements/7/action-plan/draft?period=2026-2', { method: 'POST' })
  })
})
