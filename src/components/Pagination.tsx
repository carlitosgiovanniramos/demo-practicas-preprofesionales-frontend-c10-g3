import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  from: number
  to: number
  onPageChange: (page: number) => void
  /** Nombre de lo que se pagina, para lectores de pantalla: "ofertas", "postulaciones". */
  itemLabel: string
}

/** Controles de página con el rango visible. No se muestra si la lista cabe en una página. */
export function Pagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  onPageChange,
  itemLabel,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={`Paginación de ${itemLabel}`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-paperRule px-[18px] py-3"
    >
      <p className="font-data text-12 text-inkSoft" aria-live="polite">
        {from}–{to} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <span className="min-w-[88px] text-center text-13 text-inkMid">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
