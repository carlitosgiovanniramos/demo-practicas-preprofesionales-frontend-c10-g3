/**
 * Acciones de voz sobre el DOM de la pantalla actual. Se marcan con atributos que la app ya usa
 * para los atajos de teclado (`data-shortcut-search`, `data-shortcut-new`), así voz y teclado
 * hacen exactamente lo mismo.
 */

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

/** Añade el texto dictado al final del campo que tiene el foco. */
export function writeText(text: string): boolean {
  const field = document.activeElement
  if (!isTextField(field)) return false
  setFieldValue(field, field.value ? `${field.value} ${text}` : text)
  return true
}
