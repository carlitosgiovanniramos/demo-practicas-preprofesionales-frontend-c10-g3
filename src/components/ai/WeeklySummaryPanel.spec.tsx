import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { weeklySummary } from '@/api/ai'
import { ApiError } from '@/api/client'
import { useOnline } from '@/offline/hooks/useOnline'
import { WeeklySummaryPanel } from './WeeklySummaryPanel'

vi.mock('@/api/ai', () => ({ weeklySummary: vi.fn() }))
vi.mock('@/offline/hooks/useOnline', () => ({ useOnline: vi.fn(() => true) }))

afterEach(() => {
  vi.clearAllMocks()
  vi.mocked(useOnline).mockReturnValue(true)
})

const generateButton = () => screen.getByRole('button', { name: 'Generar borrador' })

describe('WeeklySummaryPanel', () => {
  it('genera el borrador y lo muestra editable', async () => {
    vi.mocked(weeklySummary).mockResolvedValue({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 6.5,
      entries: 2,
      draft: 'Esta semana hice soporte.',
    })
    render(<WeeklySummaryPanel placementId={7} />)

    fireEvent.click(generateButton())

    const draft = await screen.findByLabelText('Borrador (editable)')
    expect((draft as HTMLTextAreaElement).value).toBe('Esta semana hice soporte.')
    expect(screen.getByText('Jornadas')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Horas')).toBeTruthy()
    expect(screen.getByText('6.5')).toBeTruthy()
    expect(weeklySummary).toHaveBeenCalledWith(7, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('regenera el borrador sin tener que descartarlo', async () => {
    vi.mocked(weeklySummary)
      .mockResolvedValueOnce({ placementId: 7, weekStart: '2026-04-06', totalHours: 4, entries: 1, draft: 'Primera' })
      .mockResolvedValueOnce({ placementId: 7, weekStart: '2026-04-06', totalHours: 4, entries: 1, draft: 'Segunda' })
    render(<WeeklySummaryPanel placementId={7} />)
    fireEvent.click(generateButton())
    await screen.findByLabelText('Borrador (editable)')

    fireEvent.click(screen.getByRole('button', { name: 'Regenerar' }))

    await waitFor(() =>
      expect((screen.getByLabelText('Borrador (editable)') as HTMLTextAreaElement).value).toBe('Segunda'),
    )
    expect(weeklySummary).toHaveBeenCalledTimes(2)
  })

  it('confirma en texto visible que el borrador se copió', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    vi.mocked(weeklySummary).mockResolvedValue({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 4,
      entries: 1,
      draft: 'Texto',
    })
    render(<WeeklySummaryPanel placementId={7} />)
    fireEvent.click(generateButton())
    await screen.findByLabelText('Borrador (editable)')

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(await screen.findByText('Borrador copiado')).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith('Texto')
  })

  it('muestra cuántos caracteres tiene el borrador', async () => {
    vi.mocked(weeklySummary).mockResolvedValue({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 4,
      entries: 1,
      draft: 'Hola mundo',
    })
    render(<WeeklySummaryPanel placementId={7} />)
    fireEvent.click(generateButton())

    expect(await screen.findByText('10 caracteres')).toBeTruthy()
  })

  it('ofrece reintentar tras un error que no es de disponibilidad', async () => {
    vi.mocked(weeklySummary).mockRejectedValueOnce(new Error('red caída')).mockResolvedValueOnce({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 4,
      entries: 1,
      draft: 'Listo',
    })
    render(<WeeklySummaryPanel placementId={7} />)
    fireEvent.click(generateButton())

    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Borrador (editable)')).toBeTruthy()
  })

  it('no ofrece borrador cuando la semana no tiene jornadas', async () => {
    vi.mocked(weeklySummary).mockResolvedValue({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 0,
      entries: 0,
      draft: null,
    })
    render(<WeeklySummaryPanel placementId={7} />)

    fireEvent.click(generateButton())

    expect(await screen.findByText('No hay jornadas en esa semana')).toBeTruthy()
    expect(screen.queryByLabelText('Borrador (editable)')).toBeNull()
  })

  it('explica en lenguaje claro cuando la IA no está disponible (503)', async () => {
    vi.mocked(weeklySummary).mockRejectedValue(new ApiError(503, 'GEMINI_API_KEY no está configurada'))
    render(<WeeklySummaryPanel placementId={7} />)

    fireEvent.click(generateButton())

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('La IA no está disponible')
  })

  it('deshabilita la generación sin conexión', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    render(<WeeklySummaryPanel placementId={7} />)

    expect((generateButton() as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Sin conexión: el borrador necesita red.')).toBeTruthy()
  })

  it('descarta el borrador sin guardarlo', async () => {
    vi.mocked(weeklySummary).mockResolvedValue({
      placementId: 7,
      weekStart: '2026-04-06',
      totalHours: 4,
      entries: 1,
      draft: 'Texto',
    })
    render(<WeeklySummaryPanel placementId={7} />)
    fireEvent.click(generateButton())
    await screen.findByLabelText('Borrador (editable)')

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    await waitFor(() => expect(screen.queryByLabelText('Borrador (editable)')).toBeNull())
  })
})
