import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortcutsProvider, useScreenShortcuts } from './ShortcutsProvider'

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

function ScreenWithShortcuts({ onJ, onDigitTwo }: { onJ: () => void; onDigitTwo: () => boolean }) {
  useScreenShortcuts([
    { id: 'screen-j', label: 'Siguiente registro', key: 'j', run: () => (onJ(), true) },
    { id: 'screen-two', label: 'Solo si hay foco', key: '2', run: onDigitTwo },
  ])
  return <p>pantalla</p>
}

describe('focus after the shortcuts list', () => {
  it('closing the list returns the focus to the element that had it before', async () => {
    renderApp()
    const search = screen.getByLabelText('Buscar en la lista')
    search.focus()
    fireEvent.keyDown(document.body, { key: '?' })
    await screen.findByRole('dialog', { name: 'Atajos de teclado' })

    fireEvent.keyDown(document.body, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(search))
  })
})

describe('screen-scoped shortcuts', () => {
  it('a screen action runs for its key while that screen is mounted', () => {
    const onJ = vi.fn()
    render(
      <MemoryRouter initialEntries={['/practicantes']}>
        <ShortcutsProvider navPaths={['/practicantes']}>
          <ScreenWithShortcuts onJ={onJ} onDigitTwo={() => false} />
        </ShortcutsProvider>
      </MemoryRouter>,
    )

    fireEvent.keyDown(document.body, { key: 'j' })

    expect(onJ).toHaveBeenCalledOnce()
  })

  it('falls back to the global shortcut when the screen action does not handle the key', async () => {
    render(
      <MemoryRouter initialEntries={['/practicantes']}>
        <ShortcutsProvider navPaths={['/practicantes', '/horas']}>
          <ScreenWithShortcuts onJ={vi.fn()} onDigitTwo={() => false} />
          <LocationProbe />
        </ShortcutsProvider>
      </MemoryRouter>,
    )

    fireEvent.keyDown(document.body, { key: '2' })

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/horas'))
  })

  it('a screen action runs inside an open dialog only when it declares inDialog', async () => {
    const onJ = vi.fn()
    const onInDialog = vi.fn(() => true)
    function Screen() {
      useScreenShortcuts([
        { id: 'screen-j', label: 'Siguiente registro', key: 'j', run: () => (onJ(), true) },
        { id: 'screen-dialog-two', label: 'En el modal', key: '3', inDialog: true, run: onInDialog },
      ])
      return null
    }
    render(
      <MemoryRouter initialEntries={['/practicantes']}>
        <ShortcutsProvider navPaths={['/practicantes']}>
          <Screen />
          <div role="dialog" aria-label="Modal de prueba" />
        </ShortcutsProvider>
      </MemoryRouter>,
    )

    fireEvent.keyDown(document.body, { key: 'j' })
    fireEvent.keyDown(document.body, { key: '3' })

    expect(onJ).not.toHaveBeenCalled()
    expect(onInDialog).toHaveBeenCalledOnce()
  })

  it('a handled screen action keeps the global shortcut from firing', async () => {
    render(
      <MemoryRouter initialEntries={['/practicantes']}>
        <ShortcutsProvider navPaths={['/practicantes', '/horas']}>
          <ScreenWithShortcuts onJ={vi.fn()} onDigitTwo={() => true} />
          <LocationProbe />
        </ShortcutsProvider>
      </MemoryRouter>,
    )

    fireEvent.keyDown(document.body, { key: '2' })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByTestId('path').textContent).toBe('/practicantes')
  })
})
