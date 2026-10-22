import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SyncGutter, type SyncState } from './SyncGutter'

interface LedgerRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  syncState: SyncState
  children: ReactNode
  className?: string
}

export function LedgerRow({ syncState, children, className, ...rest }: LedgerRowProps) {
  return (
    <div
      {...rest}
      className={cn(
        'flex min-h-row items-stretch gap-3 px-[18px] py-2.5 transition-colors hover:bg-well',
        className,
      )}
    >
      <SyncGutter state={syncState} />
      <div className="flex flex-1 flex-col justify-center gap-1 sm:flex-row sm:items-center sm:gap-3">
        {children}
      </div>
    </div>
  )
}
