import type { Application } from '@/api/applications'

/**
 * Un estudiante puede postular a una oferta si no tiene postulación previa, o si la anterior
 * fue rechazada. `undefined` (todavía se comprueba) no permite postular: el backend igual lo bloquea.
 */
export function canApply(application: Application | null | undefined): boolean {
  if (application === undefined) return false
  return application === null || application.status === 'REJECTED'
}
