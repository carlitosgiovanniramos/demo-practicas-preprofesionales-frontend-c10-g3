import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, type LocalDocument, type LocalPlacement } from '@/offline/db'
import { usePlacementById } from './usePlacementById'
import { usePlacementDocuments } from './usePlacementDocuments'

const placement = { id: 11, status: 'ACTIVE' } as unknown as LocalPlacement

describe('usePlacementById', () => {
  beforeEach(async () => {
    await db.placements.clear()
  })

  it('returns the stored placement', async () => {
    await db.placements.put(placement)

    const { result } = renderHook(() => usePlacementById(11))

    await waitFor(() => expect(result.current).toMatchObject({ id: 11 }))
  })

  it('returns null when the placement is not stored locally', async () => {
    const { result } = renderHook(() => usePlacementById(404))

    await waitFor(() => expect(result.current).toBeNull())
  })
})

describe('usePlacementDocuments', () => {
  beforeEach(async () => {
    await db.documents.clear()
  })

  it.each([undefined, null])('stays undefined while there is no placement (%s)', (missing) => {
    const { result } = renderHook(() => usePlacementDocuments(missing))

    expect(result.current).toBeUndefined()
  })

  it('returns the documents that belong to the placement', async () => {
    await db.documents.bulkPut([
      { id: 1, placementId: 11, kind: 'AGREEMENT' },
      { id: 2, placementId: 99, kind: 'INSURANCE' },
    ] as unknown as LocalDocument[])

    const { result } = renderHook(() => usePlacementDocuments(placement))

    await waitFor(() => expect(result.current?.map((doc) => doc.id)).toEqual([1]))
  })
})
