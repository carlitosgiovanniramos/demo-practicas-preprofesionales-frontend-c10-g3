import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LocalHourLog } from '@/offline/db'
import { HourLedger, HourLedgerColumnHeader, HourLedgerMeasures } from './HourLedgerParts'

/** Textos de las cabeceras visibles, en orden (ignora el separador vacío). */
const headerLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('span'))
    .map((node) => node.textContent)
    .filter((text) => text !== '')

const log = {
  id: 1,
  date: '2026-03-02',
  startTime: '08:00',
  endTime: '12:00',
  hours: 4,
  activity: 'Soporte',
  syncState: 'synced',
} as unknown as LocalHourLog

describe('HourLedgerColumnHeader', () => {
  it('aligns the status column to the right only when asked', () => {
    const { rerender } = render(<HourLedgerColumnHeader />)
    expect(screen.getByText('Estado').className).not.toContain('text-right')

    rerender(<HourLedgerColumnHeader statusRight />)
    expect(screen.getByText('Estado').className).toContain('text-right')
  })

  it('keeps the student five columns when no actions label is given', () => {
    const { container } = render(<HourLedgerColumnHeader />)

    expect(headerLabels(container)).toEqual(['Fecha', 'Horario', 'Horas', 'Actividad', 'Estado'])
  })

  it('adds the tutor actions column after the five shared columns when asked', () => {
    const { container } = render(<HourLedgerColumnHeader actionsLabel="Revisión" />)

    expect(headerLabels(container)).toEqual(['Fecha', 'Horario', 'Horas', 'Actividad', 'Estado', 'Revisión'])
  })
})

describe('HourLedgerMeasures', () => {
  it('shows the formatted date, the time range and the hours', () => {
    render(<HourLedgerMeasures date="2026-03-02" startTime="08:00" endTime="12:00" hours={4} />)

    expect(screen.getByText('08:00–12:00')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText(/2026/)).toBeTruthy()
  })
})

describe('HourLedger', () => {
  it('renders the newest log first with the cells supplied by renderRest', () => {
    const older = { ...log, id: 1, activity: 'Primera' }
    const newer = { ...log, id: 2, activity: 'Segunda' }

    render(<HourLedger logs={[older as LocalHourLog, newer as LocalHourLog]} renderRest={(entry) => <span>{entry.activity}</span>} />)

    const activities = screen.getAllByText(/Primera|Segunda/).map((node) => node.textContent)
    expect(activities).toEqual(['Segunda', 'Primera'])
  })

  it('shows the actions header when the ledger is given an actions label', () => {
    render(
      <HourLedger
        logs={[log]}
        actionsLabel="Revisión"
        renderRest={() => <span>acciones</span>}
      />,
    )

    expect(screen.getByText('Revisión')).toBeTruthy()
  })
})
