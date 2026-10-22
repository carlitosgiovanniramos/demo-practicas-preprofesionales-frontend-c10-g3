import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './Panel'
import { SearchX } from 'lucide-react'

describe('EmptyState', () => {
  it('shows the contextual icon as a decorative svg next to the title', () => {
    const { container } = render(<EmptyState title="Nada por aquí" icon={SearchX} />)

    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Nada por aquí')).toBeTruthy()
  })

  it('renders no icon tile when no icon is given', () => {
    const { container } = render(<EmptyState title="Vacío" description="Sin datos" />)

    expect(container.querySelector('svg')).toBeNull()
  })
})
