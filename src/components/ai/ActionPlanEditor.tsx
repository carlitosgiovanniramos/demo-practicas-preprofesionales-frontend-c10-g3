import { useId, useState } from 'react'
import { type ActionPlan, draftActionPlan, getActionPlan, saveActionPlan } from '@/api/ai'
import { ApiError } from '@/api/client'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/date'
import { useOnline } from '@/offline/hooks/useOnline'

const UNAVAILABLE_MESSAGE = 'La IA no está disponible en este momento. Podés escribir el plan a mano.'

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.statusCode === 503 ? UNAVAILABLE_MESSAGE : fallback
}

interface ActionPlanEditorProps {
  placementId: number
  period: string
}

/**
 * Plan de acción para el coordinador: se carga el guardado, se puede generar un borrador con IA
 * (que reemplaza el texto sin guardarlo) y se edita antes de guardar.
 */
export function ActionPlanEditor({ placementId, period }: ActionPlanEditorProps) {
  const online = useOnline()
  const areaId = useId()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(messageFor(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  function applyPlan(plan: ActionPlan | null) {
    setText(plan?.content ?? '')
    setSavedAt(plan?.updatedAt ?? null)
    setLoaded(true)
  }

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded) await run(async () => applyPlan(await getActionPlan(placementId)), 'No se pudo cargar el plan.')
  }

  const generate = () =>
    run(async () => {
      const { draft } = await draftActionPlan(placementId, period)
      setText(draft)
    }, 'No se pudo generar el borrador.')

  const save = () =>
    run(async () => {
      const plan = await saveActionPlan(placementId, text)
      setSavedAt(plan.updatedAt)
    }, 'No se pudo guardar el plan.')

  return (
    <div className="flex flex-col gap-2 px-[18px] pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          disabled={!online && !open}
        >
          {open ? 'Cerrar plan' : 'Plan de acción'}
        </Button>
        {!online ? <span className="text-12 text-inkSoft">Sin conexión: el plan necesita red.</span> : null}
      </div>

      {open ? (
        <div id={panelId} className="flex flex-col gap-3 rounded-md bg-well px-3 py-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={areaId}>Plan de acción (editable)</Label>
            <Textarea
              id={areaId}
              value={text}
              disabled={busy || !loaded}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <FormAlert message={error} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-12 text-inkSoft">
              {savedAt ? `Guardado el ${formatDate(savedAt.slice(0, 10))}` : 'Sin guardar'}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={generate} disabled={!online || busy}>
                Generar borrador (reemplaza el texto)
              </Button>
              <Button size="sm" onClick={save} disabled={!online || busy || text.trim().length === 0}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
