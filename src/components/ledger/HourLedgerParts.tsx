import type { ReactNode } from 'react'
import type { LocalHourLog } from '@/offline/db'
import { formatDate } from '@/lib/date'
import { Ledger, LedgerHeaderRow } from './Ledger'
import { LedgerRow } from './LedgerRow'

/** Encabezado del libro de horas. `statusRight` alinea la columna Estado a la derecha. */
export function HourLedgerColumnHeader({ statusRight = false }: { statusRight?: boolean }) {
  return (
    <LedgerHeaderRow>
      <span className="w-28">Fecha</span>
      <span className="w-28">Horario</span>
      <span className="w-14">Horas</span>
      <span className="flex-1">Actividad</span>
      <span className={statusRight ? 'w-32 text-right' : 'w-32'}>Estado</span>
    </LedgerHeaderRow>
  )
}

interface HourLedgerMeasuresProps {
  date: string
  startTime: string
  endTime: string
  hours: number
}

/** Celdas de fecha, horario y horas de una fila del libro de horas. */
export function HourLedgerMeasures({ date, startTime, endTime, hours }: HourLedgerMeasuresProps) {
  return (
    <>
      <span className="font-data text-14 text-ink sm:w-28">{formatDate(date)}</span>
      <span className="font-data text-13 text-inkSoft sm:w-28">
        {startTime}–{endTime}
      </span>
      <span className="font-data text-14 text-ink sm:w-14">{hours}</span>
    </>
  )
}

interface HourLedgerProps {
  logs: LocalHourLog[]
  statusRight?: boolean
  /** Celdas de la fila después de fecha, horario y horas (actividad, estado y acciones). */
  renderRest: (log: LocalHourLog) => ReactNode
}

/** Libro de horas: las más recientes primero, con la misma estructura en todas las pantallas. */
export function HourLedger({ logs, statusRight = false, renderRest }: HourLedgerProps) {
  return (
    <Ledger header={<HourLedgerColumnHeader statusRight={statusRight} />}>
      {logs
        .slice()
        .reverse()
        .map((log) => (
          <LedgerRow key={log.id} syncState={log.syncState}>
            <HourLedgerMeasures date={log.date} startTime={log.startTime} endTime={log.endTime} hours={log.hours} />
            {renderRest(log)}
          </LedgerRow>
        ))}
    </Ledger>
  )
}
