/**
 * Lleva el foco al primer control marcado como inválido (aria-invalid="true") dentro
 * del formulario. Devuelve false si no hay ninguno, para que el llamador decida.
 */
export function focusFirstInvalid(form: HTMLFormElement): boolean {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!invalid) return false
  invalid.focus()
  return true
}
