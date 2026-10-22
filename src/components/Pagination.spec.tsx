import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'
import { SearchField } from './SearchField'

describe('Pagination', () => {
  it('shows nothing when every item fits in one page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} totalItems={4} from={1} to={4} onPageChange={vi.fn()} itemLabel="ofertas" />,
    )

    expect(container.querySelector('nav')).toBeNull()
  })

  it('moves to the next and previous pages and shows the visible range', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination page={2} totalPages={3} totalItems={23} from={11} to={20} onPageChange={onPageChange} itemLabel="ofertas" />,
    )

    expect(screen.getByText('11–20 de 23')).toBeTruthy()
    expect(screen.getByText('Página 2 de 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1)
  })

  it('disables the controls at the edges', () => {
    render(
      <Pagination page={3} totalPages={3} totalItems={23} from={21} to={23} onPageChange={vi.fn()} itemLabel="ofertas" />,
    )

    expect((screen.getByRole('button', { name: 'Página siguiente' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Página anterior' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('SearchField', () => {
  it('reports typed text and clears it with the clear button', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <SearchField value="" onChange={onChange} label="Buscar ofertas" placeholder="Buscar" />,
    )

    fireEvent.change(screen.getByLabelText('Buscar ofertas'), { target: { value: 'soporte' } })
    expect(onChange).toHaveBeenLastCalledWith('soporte')

    rerender(<SearchField value="soporte" onChange={onChange} label="Buscar ofertas" placeholder="Buscar" />)
    fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
