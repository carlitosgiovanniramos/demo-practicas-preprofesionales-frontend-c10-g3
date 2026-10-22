/** Marca de los elementos de una lista que los atajos pueden recorrer (una fila por registro). */
export const ITEM_SELECTOR = '[data-shortcut-item]'

/** Elemento al que va el foco al entrar a una fila: su primer control, o la fila misma. */
function focusTargetOf(item: HTMLElement): HTMLElement {
  return item.querySelector<HTMLElement>('button, a[href], input, select, textarea') ?? item
}

// Última fila que tuvo el foco. Al aprobar o devolver, el botón se deshabilita y el
// navegador le quita el foco; sin esta memoria, la siguiente "j" volvería a empezar.
let lastItem: HTMLElement | null = null

/**
 * Fila de la lista que tiene el foco o, si el foco se perdió dentro de la lista, la última
 * fila que lo tuvo (siempre que siga en pantalla). Null si nunca hubo fila de referencia.
 */
export function currentItem(): HTMLElement | null {
  const active = document.activeElement
  const focused = active instanceof HTMLElement ? active.closest<HTMLElement>(ITEM_SELECTOR) : null
  if (focused) {
    lastItem = focused
    return focused
  }
  return lastItem?.isConnected ? lastItem : null
}

/**
 * Mueve el foco a la fila siguiente (+1) o anterior (-1) de la lista. Sin foco en la lista,
 * +1 va a la primera fila. No da la vuelta al llegar al final. Devuelve false si no hay filas.
 */
export function moveItemFocus(direction: 1 | -1): boolean {
  const items = Array.from(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
  if (items.length === 0) return false
  const current = currentItem()
  const index = current ? items.indexOf(current) : -1
  const next = Math.min(items.length - 1, Math.max(0, index + direction))
  const target = items[next]
  lastItem = target
  focusTargetOf(target).focus()
  // jsdom no implementa scrollIntoView; en el navegador sí, y mantiene la fila a la vista.
  target.scrollIntoView?.({ block: 'nearest' })
  return true
}

/**
 * Pulsa el control de la fila actual que coincide con `selector` (por ejemplo
 * `[data-action="approve"]`). Devuelve false si no hay fila actual o no tiene ese control.
 */
export function activateInCurrentItem(selector: string): boolean {
  const control = currentItem()?.querySelector<HTMLButtonElement>(selector)
  if (!control || control.disabled) return false
  control.click()
  return true
}
