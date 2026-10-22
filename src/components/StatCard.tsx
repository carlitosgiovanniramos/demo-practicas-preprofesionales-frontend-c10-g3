import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type NoteTone = 'neutral' | 'pending' | 'void' | 'stamp'

const NOTE_CLASSES: Record<NoteTone, string> = {
  neutral: 'text-inkSoft',
  pending: 'text-pending',
  void: 'text-void',
  stamp: 'text-stamp',
}

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  /** Glosa breve junto al número: "de 240", "sin aprobar". */
  note?: ReactNode
  noteTone?: NoteTone
  className?: string
}

export function StatCard({ label, value, note, noteTone = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn('flex min-h-[104px] flex-col justify-between gap-3 rounded-xl bg-surface px-[18px] py-4', className)}>
      <div className="text-13 font-medium text-inkSoft">{label}</div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-28 font-semibold leading-none tabular-nums text-ink">{value}</span>
        {note ? <span className={cn('text-12 font-medium', NOTE_CLASSES[noteTone])}>{note}</span> : null}
      </div>
    </div>
  )
}

/** Rejilla de KPIs: se adapta al ancho sin romper la altura de las tarjetas. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">{children}</div>
  )
}
