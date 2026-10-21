import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormAlert } from './FormAlert'
import { OfferLoadError } from './OfferLoadError'

describe('FormAlert', () => {
  it('renders the message as an alert', () => {
    render(<FormAlert message="No se pudo enviar" />)

    expect(screen.getByRole('alert').textContent).toBe('No se pudo enviar')
  })

  it('renders nothing without a message', () => {
    const { container } = render(<FormAlert message={null} />)

    expect(container.firstChild).toBeNull()
  })
})

describe('OfferLoadError', () => {
  it('shows the message next to the back link of its page', () => {
    render(<OfferLoadError message="Oferta no encontrada" backLink={<a href="/ofertas">Volver</a>} />)

    expect(screen.getByRole('alert').textContent).toBe('Oferta no encontrada')
    expect(screen.getByRole('link', { name: 'Volver' })).toBeTruthy()
  })
})
