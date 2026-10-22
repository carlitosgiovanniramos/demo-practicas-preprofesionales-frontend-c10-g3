import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('resolves conflicting tailwind classes, keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('keeps a custom color next to a font size (text-surface + text-14)', () => {
    expect(cn('bg-stamp text-surface', 'h-control text-14')).toBe('bg-stamp text-surface h-control text-14')
  })

  it('still replaces a custom color with another custom color', () => {
    expect(cn('text-ink', 'text-inkSoft')).toBe('text-inkSoft')
  })

  it('drops falsy values and keeps the rest', () => {
    const hidden: string | undefined = undefined
    expect(cn('a', hidden, null, 'c')).toBe('a c')
  })
})
