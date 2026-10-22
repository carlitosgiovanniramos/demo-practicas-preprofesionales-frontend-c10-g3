import { describe, expect, it } from 'vitest'
import { paginate } from './paginate'

const items = Array.from({ length: 23 }, (_, index) => index + 1)

describe('paginate', () => {
  it('returns the first page and its range', () => {
    const result = paginate(items, 1, 10)

    expect(result.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.totalPages).toBe(3)
    expect(result.totalItems).toBe(23)
    expect(result.from).toBe(1)
    expect(result.to).toBe(10)
  })

  it('returns the partial last page with the right range', () => {
    const result = paginate(items, 3, 10)

    expect(result.pageItems).toEqual([21, 22, 23])
    expect(result.from).toBe(21)
    expect(result.to).toBe(23)
  })

  it('clamps a page beyond the end to the last page', () => {
    const result = paginate(items, 9, 10)

    expect(result.page).toBe(3)
    expect(result.pageItems).toEqual([21, 22, 23])
  })

  it('clamps a page below one to the first page', () => {
    expect(paginate(items, 0, 10).page).toBe(1)
  })

  it('handles an empty list with one empty page and a zero range', () => {
    const result = paginate([], 1, 10)

    expect(result.pageItems).toEqual([])
    expect(result.totalPages).toBe(1)
    expect(result.totalItems).toBe(0)
    expect(result.from).toBe(0)
    expect(result.to).toBe(0)
  })
})
