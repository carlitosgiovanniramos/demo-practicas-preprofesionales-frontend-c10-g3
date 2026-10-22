import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlacementById } from '@/offline/hooks/usePlacementById'
import { ShortcutsProvider } from '@/shortcuts/ShortcutsProvider'
import { EvaluatePage } from './EvaluatePage'

vi.mock('@/offline/hooks/usePlacementById', () => ({ usePlacementById: vi.fn() }))
vi.mock('@/api/evaluations', () => ({ submitEvaluation: vi.fn() }))

const placement = {
  id: 1,
  studentId: 5,
  tutorId: 2,
  companyId: 1,
  startDate: '2026-03-01',
  endDate: '2026-07-31',
  requiredHours: 240,
  status: 'ACTIVE',
  version: 1,
  updatedAt: '',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/practicantes/1/evaluar']}>
      <ShortcutsProvider navPaths={['/practicantes', '/horas']}>
        <Routes>
          <Route path="/practicantes/:id/evaluar" element={<EvaluatePage />} />
        </Routes>
      </ShortcutsProvider>
    </MemoryRouter>,
  )
}

const criterion = (name: string) => screen.getByRole('radiogroup', { name })
const scoreIn = (name: string, value: number) =>
  criterion(name).querySelector<HTMLElement>(`[role="radio"][data-value="${value}"]`) as HTMLElement

beforeEach(() => {
  vi.mocked(usePlacementById).mockReturnValue(placement)
})

describe('EvaluatePage scoring', () => {
  it('sets a score by clicking the number of the criterion', () => {
    renderPage()

    fireEvent.click(scoreIn('Desempeño técnico', 4))

    expect(scoreIn('Desempeño técnico', 4).getAttribute('aria-checked')).toBe('true')
    expect(scoreIn('Desempeño técnico', 3).getAttribute('aria-checked')).toBe('false')
  })

  it('a digit sets the score of the criterion that has the focus, without leaving the page', () => {
    renderPage()
    scoreIn('Comunicación', 3).focus()

    fireEvent.keyDown(scoreIn('Comunicación', 3), { key: '5' })

    expect(scoreIn('Comunicación', 5).getAttribute('aria-checked')).toBe('true')
  })

  it('marks the criteria without a score as invalid and moves the focus to the first one', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar evaluación' }))

    expect(await screen.findAllByText('Selecciona un puntaje')).toHaveLength(3)
    await waitFor(() => expect(document.activeElement).toBe(criterion('Desempeño técnico')))
    expect(criterion('Desempeño técnico').getAttribute('aria-invalid')).toBe('true')
  })
})
