import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HOUR_LOG_HOURS_MESSAGE, HOUR_LOG_LIMITS } from '@/lib/hour-log-rules'
import { HourLogForm } from './HourLogForm'

function fillWindowAndHours(hours: string) {
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '08:00' } })
  fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '20:00' } })
  fireEvent.change(screen.getByLabelText('Horas'), { target: { value: hours } })
}

// D-06: el formulario aplica la misma regla en el aviso en vivo y al enviar, con un solo mensaje.
describe('HourLogForm · límite de horas por registro (D-06)', () => {
  it('muestra el mensaje único en el aviso en vivo cuando se pasa del máximo', () => {
    render(<HourLogForm placementId={1} />)

    fillWindowAndHours(String(HOUR_LOG_LIMITS.maxHours + 1))

    expect(screen.getByText(HOUR_LOG_HOURS_MESSAGE)).toBeTruthy()
  })

  it('no avisa cuando la hora está exactamente en el máximo', () => {
    render(<HourLogForm placementId={1} />)

    fillWindowAndHours(String(HOUR_LOG_LIMITS.maxHours))

    expect(screen.queryByText(HOUR_LOG_HOURS_MESSAGE)).toBeNull()
  })

  it('al enviar, muestra el mismo mensaje bajo el campo Horas', () => {
    render(<HourLogForm placementId={1} />)

    fillWindowAndHours(String(HOUR_LOG_LIMITS.maxHours + 1))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horas' }))

    expect(document.getElementById('hourlog-hours-error')?.textContent).toBe(HOUR_LOG_HOURS_MESSAGE)
  })

  it('al enviar con errores, lleva el foco al primer campo inválido', () => {
    render(<HourLogForm placementId={1} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar horas' }))

    expect(document.activeElement?.id).toBe('hourlog-start')
  })

  it('Ctrl+Enter en la actividad envía el formulario', () => {
    render(<HourLogForm placementId={1} />)
    const activity = screen.getByLabelText('Actividad')

    fireEvent.keyDown(activity, { key: 'Enter', ctrlKey: true })

    expect(document.getElementById('hourlog-activity-error')?.textContent).toBe('Describe la actividad realizada')
  })

  it('ofrece usar la duración calculada cuando el campo Horas está vacío', () => {
    render(<HourLogForm placementId={1} />)
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '12:30' } })

    fireEvent.click(screen.getByRole('button', { name: 'Usar 4.5 h' }))

    expect((screen.getByLabelText('Horas') as HTMLInputElement).value).toBe('4.5')
  })
})
