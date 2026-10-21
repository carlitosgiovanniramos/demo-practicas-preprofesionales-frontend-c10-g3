import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { draftActionPlan, getActionPlan, saveActionPlan } from '@/api/ai'
import { ApiError } from '@/api/client'
import { ActionPlanEditor } from './ActionPlanEditor'

vi.mock('@/api/ai', () => ({ getActionPlan: vi.fn(), saveActionPlan: vi.fn(), draftActionPlan: vi.fn() }))
vi.mock('@/offline/hooks/useOnline', () => ({ useOnline: vi.fn(() => true) }))

afterEach(() => vi.clearAllMocks())

const openEditor = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Plan de acción' }))
  return (await screen.findByLabelText('Plan de acción (editable)')) as HTMLTextAreaElement
}

describe('ActionPlanEditor', () => {
  it('carga el plan guardado al abrir', async () => {
    vi.mocked(getActionPlan).mockResolvedValue({ placementId: 3, content: '1. Entregar informe', updatedAt: '2026-10-21T10:00:00.000Z' })
    render(<ActionPlanEditor placementId={3} period="2026-1" />)

    expect((await openEditor()).value).toBe('1. Entregar informe')
    expect(getActionPlan).toHaveBeenCalledWith(3)
  })

  it('el borrador reemplaza el texto pero no se guarda hasta pulsar Guardar', async () => {
    vi.mocked(getActionPlan).mockResolvedValue(null)
    vi.mocked(draftActionPlan).mockResolvedValue({ draft: '1. Revisar horas (tutor)' })
    render(<ActionPlanEditor placementId={3} period="2026-1" />)

    const area = await openEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Generar borrador (reemplaza el texto)' }))

    await waitFor(() => expect(area.value).toBe('1. Revisar horas (tutor)'))
    expect(draftActionPlan).toHaveBeenCalledWith(3, '2026-1')
    expect(saveActionPlan).not.toHaveBeenCalled()
  })

  it('guarda el texto editado', async () => {
    vi.mocked(getActionPlan).mockResolvedValue(null)
    vi.mocked(saveActionPlan).mockResolvedValue({ placementId: 3, content: 'Final', updatedAt: '2026-10-21T11:00:00.000Z' })
    render(<ActionPlanEditor placementId={3} period="2026-1" />)

    const area = await openEditor()
    fireEvent.change(area, { target: { value: 'Final' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(saveActionPlan).toHaveBeenCalledWith(3, 'Final'))
  })

  it('explica en lenguaje claro cuando la IA no responde', async () => {
    vi.mocked(getActionPlan).mockResolvedValue(null)
    vi.mocked(draftActionPlan).mockRejectedValue(new ApiError(503, 'x'))
    render(<ActionPlanEditor placementId={3} period="2026-1" />)

    await openEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Generar borrador (reemplaza el texto)' }))

    expect((await screen.findByRole('alert')).textContent).toContain('La IA no está disponible')
  })
})
