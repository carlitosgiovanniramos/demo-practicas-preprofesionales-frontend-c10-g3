import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { LoginPage } from './LoginPage'

vi.mock('@/auth/AuthContext', () => ({ useAuth: vi.fn() }))

const login = vi.fn()

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  login.mockReset()
  vi.mocked(useAuth).mockReturnValue({ user: null, role: null, login, logout: vi.fn() })
})

afterEach(() => {
  sessionStorage.clear()
})

describe('LoginPage usability', () => {
  it('focuses the email field when the page opens', () => {
    renderPage()

    expect(document.activeElement).toBe(screen.getByLabelText(/Correo institucional/))
  })

  it('lets the user reveal the password while typing it', () => {
    renderPage()
    const password = screen.getByLabelText(/Contraseña/) as HTMLInputElement

    expect(password.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))

    expect(password.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('explains an invalid email inline and does not send the request', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/Correo institucional/), { target: { value: 'sin-arroba' } })
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'secreto' } })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Escribí un correo válido, por ejemplo nombre@institucion.edu')).toBeTruthy()
    expect(login).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText(/Correo institucional/))
  })

  it('shows a readable message when the credentials are rejected', async () => {
    login.mockRejectedValue(new ApiError(401, 'credenciales inválidas'))
    renderPage()
    fireEvent.change(screen.getByLabelText(/Correo institucional/), { target: { value: 'ana@uta.edu.ec' } })
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'mal' } })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Credenciales inválidas'))
  })
})
