import { describe, expect, it } from 'vitest'
import type { Application, ApplicationStatus } from '@/api/applications'
import { canApply } from './application-rules'

function application(status: ApplicationStatus): Application {
  return { id: 1, offerId: 1, studentId: 1, status, motivation: '', submittedAt: '', decidedAt: null } as Application
}

describe('canApply', () => {
  it('no permite postular mientras se comprueba si ya hay una postulación', () => {
    expect(canApply(undefined)).toBe(false)
  })

  it('permite postular cuando no hay postulación previa', () => {
    expect(canApply(null)).toBe(true)
  })

  it('permite volver a postular solo después de un rechazo', () => {
    expect(canApply(application('REJECTED'))).toBe(true)
  })

  it.each(['SUBMITTED', 'INTERVIEW', 'ACCEPTED', 'WITHDRAWN'] as const)(
    'no permite postular de nuevo con una postulación en estado %s',
    (status) => {
      expect(canApply(application(status))).toBe(false)
    },
  )
})
