interface ShortcutHintItem {
  /** Teclas tal como se leen: "j / k", "a", "1–5". */
  keys: string
  label: string
}

/**
 * Pista visible de los atajos que sirven en esta pantalla, para descubrirlos sin abrir la
 * lista. Se muestra en texto y no solo al pasar el mouse, porque el teclado no lo ve.
 */
export function ShortcutHint({ items }: { items: ShortcutHintItem[] }) {
  return (
    <ul aria-label="Atajos de esta pantalla" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-inkSoft">
      {items.map((item) => (
        <li key={`${item.keys}-${item.label}`} className="flex items-center gap-1.5">
          <kbd className="rounded border border-line bg-well px-1.5 font-data text-11 font-semibold text-ink">
            {item.keys}
          </kbd>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
