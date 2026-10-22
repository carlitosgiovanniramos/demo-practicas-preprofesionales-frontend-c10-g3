import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './Panel'

describe('EmptyState', () => {
  it('shows the contextual illustration as a decorative svg next to the title', () => {
    const { container } = render(<EmptyState title="Nada por aquí" illustration="search" />)

    const illustration = container.querySelector('svg')
    expect(illustration).not.toBeNull()
    expect(illustration?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Nada por aquí')).toBeTruthy()
  })

  it('renders no illustration when none is given', () => {
    const { container } = render(<EmptyState title="Vacío" description="Sin datos" />)

    expect(container.querySelector('svg')).toBeNull()
  })
})
