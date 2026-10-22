import { Search, X } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Etiqueta accesible; no se muestra, el campo se describe por su placeholder. */
  label: string
  placeholder: string
  className?: string
}

/** Buscador de listados: icono, botón para limpiar y etiqueta accesible. */
export function SearchField({ value, onChange, label, placeholder, className }: SearchFieldProps) {
  const id = useId()
  return (
    <div className={cn('relative flex min-w-[220px] flex-1 items-center', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 size-4 text-inkSoft"
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        data-shortcut-search=""
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-control w-full rounded-md border border-line bg-surface pl-9 pr-9 text-14 text-ink placeholder:text-inkMute focus-visible:border-stamp focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          onClick={() => onChange('')}
          className="absolute right-2 flex size-6 items-center justify-center rounded text-inkSoft hover:bg-pillHover hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

/** Texto de la búsqueda normalizado para comparar: minúsculas y sin tildes. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** Indica si `text` contiene la búsqueda, ignorando mayúsculas y tildes. */
export function matchesSearch(text: string, query: string): boolean {
  const needle = normalizeSearch(query)
  return needle === '' || normalizeSearch(text).includes(needle)
}
