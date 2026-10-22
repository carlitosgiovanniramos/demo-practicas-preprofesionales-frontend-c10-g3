/**
 * Atajos de teclado: definición de acciones, teclas por defecto y personalizadas, y
 * coincidencia de secuencias. Es lógica pura (sin DOM ni React) para poder probarla.
 *
 * Una combinación son uno o dos pasos de un solo carácter: "/", "n", "?" o "g o".
 */

export const STORAGE_KEY = 'shortcuts:v1'
export const SEQUENCE_TIMEOUT_MS = 1200
const MAX_STEPS = 2
const MAX_NAV_SHORTCUTS = 9

export type ShortcutGroup = 'Navegación' | 'Acciones' | 'Ayuda'

export interface ShortcutAction {
  id: string
  label: string
  group: ShortcutGroup
  defaultKeys: string
}

export type Bindings = Record<string, string[]>
export type Overrides = Record<string, string[]>

export type MatchResult = { kind: 'match'; id: string } | { kind: 'prefix' } | { kind: 'none' }

const BASE_ACTIONS: ShortcutAction[] = [
  { id: 'search', label: 'Ir al buscador de la pantalla', group: 'Acciones', defaultKeys: '/' },
  { id: 'new', label: 'Acción principal de la pantalla (crear o registrar)', group: 'Acciones', defaultKeys: 'n' },
  { id: 'help', label: 'Mostrar esta lista de atajos', group: 'Ayuda', defaultKeys: '?' },
]

/** Acciones disponibles: las generales más un atajo numérico por cada elemento del menú. */
export function buildActions(navCount: number): ShortcutAction[] {
  const navActions: ShortcutAction[] = Array.from({ length: Math.min(navCount, MAX_NAV_SHORTCUTS) }, (_, index) => ({
    id: `nav-${index + 1}`,
    label: `Ir a la sección ${index + 1} del menú`,
    group: 'Navegación',
    defaultKeys: String(index + 1),
  }))
  return [...BASE_ACTIONS, ...navActions]
}

/**
 * Convierte texto del usuario ("g o", "/", "N") en pasos normalizados (minúsculas).
 * Devuelve null si el texto no es una combinación válida.
 */
export function parseKeys(text: string): string[] | null {
  const steps = text.trim().split(/\s+/).filter(Boolean)
  if (steps.length === 0 || steps.length > MAX_STEPS) return null
  if (!steps.every((step) => step.length === 1)) return null
  return steps.map((step) => step.toLowerCase())
}

/** Tecla de un evento de teclado como paso de atajo; null para teclas que no son caracteres. */
export function normalizeEventKey(event: { key: string }): string | null {
  return event.key.length === 1 ? event.key.toLowerCase() : null
}

/** Combina los valores por defecto con las personalizaciones del usuario. */
export function resolveBindings(actions: ShortcutAction[], overrides: Overrides): Bindings {
  const bindings: Bindings = {}
  for (const action of actions) {
    bindings[action.id] = overrides[action.id] ?? parseKeys(action.defaultKeys) ?? []
  }
  return bindings
}

/** Coincidencia del buffer de teclas contra las combinaciones: completa, prefijo o ninguna. */
export function matchSequence(buffer: string[], bindings: Bindings): MatchResult {
  for (const [id, steps] of Object.entries(bindings)) {
    if (steps.length === buffer.length && steps.every((step, index) => step === buffer[index])) {
      return { kind: 'match', id }
    }
  }
  for (const steps of Object.values(bindings)) {
    if (steps.length > buffer.length && buffer.every((step, index) => steps[index] === step)) {
      return { kind: 'prefix' }
    }
  }
  return { kind: 'none' }
}

/** Etiqueta de otra acción que ya usa esas mismas teclas, o null si están libres. */
export function findConflict(
  actions: ShortcutAction[],
  bindings: Bindings,
  id: string,
  steps: string[],
): string | null {
  const other = actions.find(
    (action) =>
      action.id !== id &&
      bindings[action.id].length === steps.length &&
      bindings[action.id].every((step, index) => step === steps[index]),
  )
  return other ? other.label : null
}

function isValidSteps(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_STEPS &&
    value.every((step) => typeof step === 'string' && step.length === 1)
  )
}

/** Lee las personalizaciones guardadas; descarta lo que no sea una combinación válida. */
export function loadOverrides(): Overrides {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return {}
  }
  if (!raw || typeof raw !== 'object') return {}
  const overrides: Overrides = {}
  for (const [id, steps] of Object.entries(raw as Record<string, unknown>)) {
    if (isValidSteps(steps)) overrides[id] = steps
  }
  return overrides
}

export function saveOverrides(overrides: Overrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}
