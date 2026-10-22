import type { ReactNode } from 'react'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Atributos que FormField entrega al control para quedar ligado a su etiqueta, ayuda y error. */
export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: ReactNode
  /** Ayuda permanente bajo la etiqueta: formato esperado, para qué sirve el dato. */
  hint?: ReactNode
  /** Mensaje de error; mientras exista, el control queda marcado como inválido. */
  error?: string | null
  required?: boolean
  className?: string
  children: (props: FieldControlProps) => ReactNode
}

/**
 * Campo de formulario accesible: etiqueta, ayuda y error ligados al control con
 * aria-describedby, aria-invalid y aria-required. El obligatorio se dice con texto,
 * no solo con un asterisco o un color.
 */
export function FormField({ label, hint, error, required = false, className, children }: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="flex items-baseline gap-1.5">
        {label}
        {required ? <span className="text-12 font-medium text-inkSoft">(obligatorio)</span> : null}
      </Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-required': required || undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-12 text-inkSoft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-12 font-medium text-void">
          {error}
        </p>
      ) : null}
    </div>
  )
}
