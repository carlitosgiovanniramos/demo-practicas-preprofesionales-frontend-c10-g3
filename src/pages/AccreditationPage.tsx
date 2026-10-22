import { useEffect, useMemo, useState } from 'react'
import { type AccreditationRow, reportForPeriod } from '@/api/accreditation'
import { ApiError } from '@/api/client'
import { FilterTabs } from '@/components/FilterTabs'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { AsyncSection, EmptyState, Panel, TableHeaderRow, rowClass } from '@/components/Panel'
import { ProgressBar } from '@/components/ProgressBar'
import { SearchField, matchesSearch } from '@/components/SearchField'
import { StatCard, StatGrid } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Ledger } from '@/components/ledger/Ledger'
import { usePagedItems } from '@/lib/use-paged-items'
import { plural } from '@/lib/utils'

// El backend exige `period` con formato AAAA-1/AAAA-2 (ver AccreditationQueryDto);
// el selector nunca debe poder mandar un valor vacío, así que se restringe a
// estas dos opciones fijas del periodo académico vigente.
const PERIODS = ['2026-1', '2026-2'] as const

const ALL_LEVELS = 'TODOS'
const PAGE_SIZE = 10

const LEVEL_FILTERS = [
  { value: ALL_LEVELS, label: 'Todos' },
  { value: 'ACREDITADO', label: 'Acreditados' },
  { value: 'ACREDITADO_CON_OBSERVACIONES', label: 'Con observaciones' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'NO_ACREDITADO', label: 'No acreditados' },
]

function ColumnHeader() {
  return (
    <TableHeaderRow>
      <span className="w-40">Estudiante</span>
      <span className="w-44">Nivel</span>
      <span className="w-44">Avance</span>
      <span className="flex-1">Razones</span>
    </TableHeaderRow>
  )
}

function AccreditationStats({ rows }: { rows: AccreditationRow[] }) {
  const accredited = rows.filter((row) => row.level === 'ACREDITADO').length
  const notAccredited = rows.filter((row) => row.level === 'NO_ACREDITADO').length

  return (
    <StatGrid>
      <StatCard label="Practicantes" value={String(rows.length)} note="en el periodo" />
      <StatCard
        label="Acreditados"
        value={String(accredited)}
        note={`de ${rows.length}`}
        noteTone="stamp"
      />
      <StatCard
        label="No acreditados"
        value={String(notAccredited)}
        note="requieren revisión"
        noteTone={notAccredited > 0 ? 'void' : 'neutral'}
      />
    </StatGrid>
  )
}

function AccreditationRowItem({ row }: { row: AccreditationRow }) {
  return (
    <div className={rowClass}>
      <span className="text-14 font-semibold text-ink sm:w-40">{row.studentName}</span>
      <span className="sm:w-44">
        <StatusBadge status={row.level} />
      </span>
      <span className="flex items-center gap-2.5 sm:w-44">
        <ProgressBar
          size="sm"
          value={row.completionPercentage}
          label={`Avance de ${row.studentName}`}
          className="flex-1"
        />
        <span className="font-data text-12 text-inkSoft">{row.completionPercentage}%</span>
      </span>
      <span className="flex-1 text-13 text-inkSoft">
        {row.reasons.length > 0 ? row.reasons.join(' · ') : '—'}
      </span>
    </div>
  )
}

/** Acta de acreditación por periodo académico. No sincronizable: siempre requiere red. */
export function AccreditationPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0])
  const [rows, setRows] = useState<AccreditationRow[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>(ALL_LEVELS)
  const filtered = useMemo(() => {
    if (!rows) return undefined
    return rows.filter(
      (row) =>
        (levelFilter === ALL_LEVELS || row.level === levelFilter) && matchesSearch(row.studentName, query),
    )
  }, [rows, levelFilter, query])
  const paged = usePagedItems(filtered, PAGE_SIZE, `${period}|${levelFilter}|${query}`)

  useEffect(() => {
    let cancelled = false
    setRows(undefined)
    setError(null)
    reportForPeriod(period)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo generar el acta')
      })
    return () => {
      cancelled = true
    }
  }, [period])

  return (
    <>
      <PageHeader
        title="Acreditación"
        subtitle="El acta del periodo: quién cierra su práctica y quién todavía no."
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          label="Periodo académico"
          value={period}
          onChange={(value) => setPeriod(value as (typeof PERIODS)[number])}
          options={PERIODS.map((option) => ({ value: option, label: option }))}
        />
      </div>

      {rows ? <AccreditationStats rows={rows} /> : null}

      {rows && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Buscar estudiante"
              placeholder="Buscar por nombre del estudiante"
              className="sm:max-w-md"
            />
            <span className="ml-auto font-data text-12 text-inkSoft" aria-live="polite">
              {plural(filtered?.length ?? 0, 'practicante', 'practicantes')}
            </span>
          </div>
          <FilterTabs
            label="Filtrar por nivel de acreditación"
            value={levelFilter}
            onChange={setLevelFilter}
            options={LEVEL_FILTERS}
          />
        </div>
      ) : null}

      <AsyncSection
        error={error}
        data={paged?.pageItems}
        loadingLabel="Generando acta…"
        empty={
          rows && rows.length > 0 ? (
            <EmptyState
              title="Ningún practicante coincide"
              description="Probá con otro nombre o cambiá el nivel."
            />
          ) : (
            <EmptyState
              title="No hay placements en este periodo"
              description="Probá con el otro periodo académico."
            />
          )
        }
      >
        {(items) => (
          <Panel>
            <Ledger header={<ColumnHeader />}>
              {items.map((row) => (
                <AccreditationRowItem key={row.placementId} row={row} />
              ))}
            </Ledger>
            {paged ? (
              <Pagination
                page={paged.page}
                totalPages={paged.totalPages}
                totalItems={paged.totalItems}
                from={paged.from}
                to={paged.to}
                onPageChange={paged.setPage}
                itemLabel="practicantes"
              />
            ) : null}
          </Panel>
        )}
      </AsyncSection>
    </>
  )
}
