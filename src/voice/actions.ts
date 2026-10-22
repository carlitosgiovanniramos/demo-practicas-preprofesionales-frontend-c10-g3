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
/** "ana arroba uta punto edu" → "ana@uta.edu": un correo no lleva espacios ni se dicta con símbolos. */
const SPOKEN_SYMBOLS: Record<string, string> = { arroba: '@', punto: '.' }

/** Números de 0 a 29 dichos en una palabra (sin tildes, como los devuelve normalizeSpeech). */
const SPOKEN_UNITS: Record<string, number> = {
  cero: 0, uno: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
}

/** Decenas de 30 a 90, que pueden llevar "y" y una unidad: "treinta y uno" es 31. */
const SPOKEN_TENS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
}

/** "cero uno dos" → "0 1 2"; "treinta y uno" → "31". Las palabras que no son números se dejan igual. */
function numberWordsToDigits(text: string): string {
  const words = text.split(/\s+/)
  const out: string[] = []
  for (let index = 0; index < words.length; index += 1) {
    const word = normalizeSpeech(words[index])
    const tens = SPOKEN_TENS[word]
    if (tens !== undefined) {
      const unit = SPOKEN_UNITS[normalizeSpeech(words[index + 2] ?? '')]
      const linked = normalizeSpeech(words[index + 1] ?? '') === 'y' && unit !== undefined && unit < 10
      if (linked) {
        out.push(String(tens + unit))
        index += 2
      } else {
        out.push(String(tens))
      }
      continue
    }
    const unit = SPOKEN_UNITS[word]
    out.push(unit !== undefined ? String(unit) : words[index])
  }
  return out.join(' ')
}

/** Une los dígitos dichos por separado: "0 1 2" → "012". */
const joinDigits = (text: string) => text.replace(/(\d) (?=\d)/g, '$1')

/** Una contraseña conserva sus espacios; solo los números dichos se vuelven cifras. */
function spokenPassword(text: string): string {
  return joinDigits(numberWordsToDigits(text))
}

function spokenEmail(text: string): string {
  return numberWordsToDigits(text)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => SPOKEN_SYMBOLS[word] ?? word)
    .join('')
}

function toFieldValue(field: TextField, spoken: string): string {
  const text = spoken.trim()
  if (!(field instanceof HTMLInputElement)) return text
  if (field.type === 'email') return spokenEmail(text)
  if (field.type === 'password') return spokenPassword(text)
  if (field.type === 'time') return toTime(text) ?? text
  if (field.type === 'date') return toIsoDate(text) ?? text
  if (field.type === 'number') return text.replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0] ?? text
  return text
}

/** Muestra u oculta la contraseña del login, pulsando su botón de ojo. */
export function togglePasswordVisibility(): boolean {
  return clickButtonNamed('mostrar contraseña') || clickButtonNamed('ocultar contraseña')
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
 * Pulsa el botón visible cuyo nombre se dice ("guardar cambios"). Busca dentro del diálogo abierto
 * si lo hay, y si no en toda la página. Los botones deshabilitados no se pulsan.
 */
export function clickButtonNamed(spoken: string): boolean {
  const heard = normalizeSpeech(spoken)
  if (!heard) return false
  const scope: ParentNode = document.querySelector('[role="dialog"]') ?? document.body
  const match = Array.from(scope.querySelectorAll<HTMLElement>('button, [role="button"]')).find((button) => {
    const disabled = (button as HTMLButtonElement).disabled === true
    const name = button.getAttribute('aria-label') ?? button.textContent ?? ''
    return !disabled && normalizeSpeech(name) === heard
  })
  if (!match) return false
  match.click()
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
 * Llena el campo cuya etiqueta contiene la pista dada ("correo", "contraseña"), aunque no esté en
 * un formulario. Sirve para pantallas de login, donde el nombre del campo es corto.
 */
export function fillFieldByHint(hint: string, spoken: string): boolean {
  const wanted = normalizeSpeech(hint)
  const field = formFields().find((candidate) => normalizeSpeech(fieldName(candidate)).includes(wanted))
  if (!field) return false
  field.focus()
  setFieldValue(field, toFieldValue(field, spoken))
  return true
}

/**
 * Lo que el micrófono no reconoce como comando: si es el nombre de un botón, lo pulsa; si no,
 * lo escribe en el campo enfocado. Es el mismo respaldo en toda la app, incluida la pantalla de login.
 */
export function voiceFallback(spoken: string): boolean {
  return clickButtonNamed(spoken) || dictateIntoFocused(spoken)
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
