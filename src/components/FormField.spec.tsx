import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('links the label, the hint and the error to the control', () => {
    render(
      <FormField label="Correo" hint="Usa tu correo institucional" error="El correo no es válido">
        {(props) => <input type="email" {...props} />}
      </FormField>,
    )

    const input = screen.getByLabelText('Correo')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby') ?? ''
    const described = describedBy.split(' ').map((id) => document.getElementById(id)?.textContent)
    expect(described).toContain('Usa tu correo institucional')
    expect(described).toContain('El correo no es válido')
  })

  it('marks required fields with a visible text, not only a color or asterisk', () => {
    render(
      <FormField label="Contraseña" required>
        {(props) => <input type="password" {...props} />}
      </FormField>,
    )

    expect(screen.getByText('(obligatorio)')).toBeTruthy()
    // El nombre accesible incluye "(obligatorio)": el lector de pantalla lo anuncia.
    expect(screen.getByLabelText(/Contraseña/).getAttribute('aria-required')).toBe('true')
  })

  it('keeps the control valid when there is no error', () => {
    render(<FormField label="Actividad">{(props) => <textarea {...props} />}</FormField>)

    const textarea = screen.getByLabelText('Actividad')
    expect(textarea.getAttribute('aria-invalid')).toBe('false')
    expect(textarea.getAttribute('aria-describedby')).toBeNull()
  })
})
