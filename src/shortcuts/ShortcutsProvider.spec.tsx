import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortcutsProvider } from './ShortcutsProvider'

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="path">{location.pathname}</p>
}

const onNew = vi.fn()

function renderApp(initialPath = '/mi-practica') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ShortcutsProvider navPaths={['/mi-practica', '/horas']}>
        <input data-shortcut-search aria-label="Buscar en la lista" />
        <input aria-label="Nombre" />
        <button data-shortcut-new onClick={onNew}>
          Nuevo
        </button>
        <LocationProbe />
      </ShortcutsProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  onNew.mockReset()
})

afterEach(() => {
  localStorage.clear()
})

describe('ShortcutsProvider', () => {
  it('"/" moves the focus to the search field of the screen', () => {
    renderApp()

    fireEvent.keyDown(document.body, { key: '/' })

    expect(document.activeElement).toBe(screen.getByLabelText('Buscar en la lista'))
  })

  it('does not steal typed characters while the user is writing in a text field', () => {
    renderApp()
    const name = screen.getByLabelText('Nombre')
    name.focus()

    fireEvent.keyDown(name, { key: '/' })

    expect(document.activeElement).toBe(name)
  })

  it('"n" triggers the primary action of the screen', () => {
    renderApp()

    fireEvent.keyDown(document.body, { key: 'n' })

    expect(onNew).toHaveBeenCalledOnce()
  })

  it('"?" opens the shortcuts list', async () => {
    renderApp()

    fireEvent.keyDown(document.body, { key: '?' })

    expect(await screen.findByRole('dialog', { name: 'Atajos de teclado' })).toBeTruthy()
  })

  it('a number navigates to that item of the menu', async () => {
    renderApp('/mi-practica')

    fireEvent.keyDown(document.body, { key: '2' })

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/horas'))
  })

  it('ignores shortcuts while a dialog is open', async () => {
    renderApp()
    fireEvent.keyDown(document.body, { key: '?' })
    await screen.findByRole('dialog', { name: 'Atajos de teclado' })

    fireEvent.keyDown(document.body, { key: '2' })

    expect(screen.getByTestId('path').textContent).toBe('/mi-practica')
  })

  it('lets the user rebind an action and keeps the new keys after a reload', async () => {
    renderApp()
    fireEvent.keyDown(document.body, { key: '?' })
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar atajo: Ir al buscador de la pantalla' }))

    act(() => {
      fireEvent.keyDown(window, { key: 'k' })
    })

    await waitFor(() => expect(JSON.parse(localStorage.getItem('shortcuts:v1') ?? '{}').search).toEqual(['k']))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.keyDown(document.body, { key: 'k' })
    expect(document.activeElement).toBe(screen.getByLabelText('Buscar en la lista'))
  })

  it('refuses a new key that another action already uses', async () => {
    renderApp()
    fireEvent.keyDown(document.body, { key: '?' })
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar atajo: Ir al buscador de la pantalla' }))

    act(() => {
      fireEvent.keyDown(window, { key: 'n' })
    })

    expect(await screen.findByText(/Esa tecla ya está usada por/)).toBeTruthy()
    expect(localStorage.getItem('shortcuts:v1')).toBeNull()
  })
})
