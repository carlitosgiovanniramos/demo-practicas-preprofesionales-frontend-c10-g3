import { cn } from '@/lib/utils'

/**
 * Marca de la aplicación: tres renglones de un registro de práctica, con el último
 * marcado como registro pendiente. Usa los tokens de color del sistema.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('size-7 flex-none', className)}
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--stamp))" />
      <rect x="7" y="8" width="18" height="3.2" rx="1.6" fill="hsl(var(--surface))" />
      <rect x="7" y="14.4" width="13" height="3.2" rx="1.6" fill="hsl(var(--surface))" />
      <rect x="7" y="20.8" width="8" height="3.2" rx="1.6" fill="hsl(var(--chip-pending))" />
    </svg>
  )
}

/** Logotipo completo: marca y nombre de la aplicación. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-17 font-bold tracking-[-0.02em] text-ink">prácticas.</span>
    </span>
  )
}
