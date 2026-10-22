/**
 * Acciones de voz sobre el DOM de la pantalla actual. Se marcan con atributos que la app ya usa
 * para los atajos de teclado (`data-shortcut-search`, `data-shortcut-new`), así voz y teclado
 * hacen exactamente lo mismo.
 */
import { normalizeSpeech } from './commands'

type TextField = HTMLInputElement | HTMLTextAreaElement

const NON_TEXT_INPUT_TYPES = ['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'range', 'color']

/**
 * Asigna un valor a un campo controlado por React: hay que usar el setter nativo y disparar
 * `input`, si no React no se entera del cambio.
 */
function setFieldValue(field: TextField, value: string): void {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

function isTextField(element: Element | null): element is TextField {
  if (element instanceof HTMLTextAreaElement) return true
  return element instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.includes(element.type)
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "2:35", "2 35", "14h30", "2" → HH:mm. Null si no parece una hora. */
function toTime(text: string): string | null {
  const match = text.match(/^(\d{1,2})(?:[\s:h.]+(\d{2}))?$/i)
  if (!match) return null
  const hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : 0
  if (hour > 23 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}`
}

/** "2026-03-05", "5/3/2026" o "5-3-2026" → AAAA-MM-DD. Null si no parece una fecha. */
function toIsoDate(text: string): string | null {
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return text
  const dmy = text.match(/^(\d{1,2})[/\s-](\d{1,2})[/\s-](\d{4})$/)
  if (!dmy) return null
  return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`
}

/**
 * Convierte lo dictado al formato que espera el campo: la hora de un `type="time"` necesita HH:mm,
 * la fecha AAAA-MM-DD y un número solo dígitos. Lo demás se escribe tal cual.
 */
function toFieldValue(field: TextField, spoken: string): string {
  const text = spoken.trim()
  if (!(field instanceof HTMLInputElement)) return text
  if (field.type === 'time') return toTime(text) ?? text
  if (field.type === 'date') return toIsoDate(text) ?? text
  if (field.type === 'number') return text.replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0] ?? text
  return text
}

/** Escribe en el buscador de la pantalla y lo enfoca. */
export function searchFor(text: string): boolean {
  const field = document.querySelector<HTMLInputElement>('[data-shortcut-search]')
  if (!field) return false
  field.focus()
  setFieldValue(field, text)
  return true
}

/** Pulsa el botón de crear o registrar de la pantalla. */
export function createNew(): boolean {
  const button = document.querySelector<HTMLElement>('[data-shortcut-new]')
  if (!button) return false
  button.click()
  return true
}

/** Envía el formulario del campo enfocado, o el del diálogo abierto. */
export function submitForm(): boolean {
  const form =
    document.activeElement?.closest('form') ??
    document.querySelector<HTMLFormElement>('[role="dialog"] form') ??
    document.querySelector<HTMLFormElement>('form')
  const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!submit || submit.disabled) return false
  submit.click()
  return true
}

/**
 * Campos de texto donde se puede llenar por voz, en orden de pantalla: los del formulario o diálogo
 * que tiene el foco, y si no hay ninguno, los campos sueltos de la página (filtros, búsquedas…).
 */
function formFields(): TextField[] {
  const scope =
    document.activeElement?.closest('form') ??
    document.querySelector<HTMLFormElement>('[role="dialog"] form') ??
    document.querySelector<HTMLFormElement>('form')
  const root: ParentNode = scope ?? document
  return Array.from(root.querySelectorAll<HTMLElement>('input, textarea')).filter(
    (element): element is TextField => isTextField(element) && !element.disabled,
  )
}

/** Nombre visible del campo: su etiqueta, o si no tiene, su aria-label o su texto de ayuda. */
function fieldName(field: TextField): string {
  return field.labels?.[0]?.textContent ?? field.getAttribute('aria-label') ?? field.placeholder ?? ''
}

/**
 * Llena el campo cuyo nombre se dijo al principio: "comentario muy buen trabajo" escribe
 * "muy buen trabajo" en el campo Comentario. Gana el nombre más largo si hay coincidencias.
 */
export function fillField(spoken: string): boolean {
  const heard = normalizeSpeech(spoken)
  const candidates = formFields()
    .map((field) => ({ field, name: normalizeSpeech(fieldName(field)) }))
    .filter(({ name }) => name && (heard === name || heard.startsWith(`${name} `)))
    .sort((a, b) => b.name.length - a.name.length)
  const match = candidates[0]
  if (!match) return false

  const nameWords = match.name.split(' ').length
  const text = spoken.trim().split(/\s+/).slice(nameWords).join(' ')
  match.field.focus()
  setFieldValue(match.field, toFieldValue(match.field, text))
  return true
}

/**
 * Lo dicho, sin nombrar el campo, va al campo que tiene el foco y reemplaza su valor.
 * Es el dictado normal de un formulario: enfocas "Hora de inicio" y dices "2:35".
 */
export function dictateIntoFocused(spoken: string): boolean {
  const field = document.activeElement
  if (!isTextField(field)) return false
  setFieldValue(field, toFieldValue(field, spoken))
  return true
}

/** Pasa el foco al campo siguiente (1) o anterior (-1) del formulario. */
export function nextField(delta: 1 | -1): boolean {
  const fields = formFields()
  if (fields.length === 0) return false
  const current = fields.indexOf(document.activeElement as TextField)
  const next = current === -1 ? 0 : (current + delta + fields.length) % fields.length
  fields[next].focus()
  return true
}

/** Borra el texto del campo que tiene el foco. */
export function clearField(): boolean {
  const field = document.activeElement
  if (!isTextField(field)) return false
  setFieldValue(field, '')
  return true
}

/** Añade el texto dictado al final del campo que tiene el foco. */
export function writeText(text: string): boolean {
  const field = document.activeElement
  if (!isTextField(field)) return false
  setFieldValue(field, field.value ? `${field.value} ${text}` : text)
  return true
}
