import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { accreditationExplanation, weeklySummary } from './ai'

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

  it('pide la explicación de acreditación con el placement y el periodo', async () => {
    vi.mocked(api).mockResolvedValue({})
    await accreditationExplanation(7, '2026-2')
    expect(api).toHaveBeenCalledWith('/placements/7/accreditation-explanation?period=2026-2')
  })
})
