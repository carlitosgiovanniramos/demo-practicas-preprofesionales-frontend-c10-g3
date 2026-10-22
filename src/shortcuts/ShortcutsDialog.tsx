import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Bindings, type ShortcutAction, type ShortcutGroup, normalizeEventKey } from './bindings'

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: ShortcutAction[]
  bindings: Bindings
  /** Devuelve un mensaje de error si las teclas no se pueden asignar, o null si se guardaron. */
  onSetBinding: (id: string, steps: string[]) => string | null
  onReset: () => void
}

const GROUP_ORDER: ShortcutGroup[] = ['Acciones', 'Navegación', 'Ayuda']

function KeyCaps({ steps }: { steps: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {steps.map((step, index) => (
        <kbd
          key={`${step}-${index}`}
          className="flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-well px-1.5 font-data text-12 font-semibold text-ink"
        >
          {step === ' ' ? 'Espacio' : step}
        </kbd>
      ))}
    </span>
  )
}

/**
 * Lista de atajos del usuario. Desde aquí se puede cambiar la tecla de cada acción: al
 * pulsar "Cambiar", la siguiente tecla se toma como nueva combinación. Esc cancela.
 */
export function ShortcutsDialog({ open, onOpenChange, actions, bindings, onSetBinding, onReset }: ShortcutsDialogProps) {
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!recordingId) return
    function onKeyDown(event: KeyboardEvent) {
      // Captura en fase de captura: la tecla es para reasignar, no para disparar un atajo.
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Escape') {
        setRecordingId(null)
        setMessage(null)
        return
      }
      const key = normalizeEventKey(event)
      if (!key || key === ' ') {
        setMessage('Usá una letra, un número o un símbolo.')
        return
      }
      const error = onSetBinding(recordingId as string, [key])
      setMessage(error)
      if (!error) setRecordingId(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingId, onSetBinding])

  function handleOpenChange(next: boolean) {
    setRecordingId(null)
    setMessage(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>
            Usalos sin el mouse. Los atajos no funcionan mientras escribís en un campo ni con una ventana abierta.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-5">
            {GROUP_ORDER.map((group) => {
              const groupActions = actions.filter((action) => action.group === group)
              if (groupActions.length === 0) return null
              return (
                <section key={group} aria-labelledby={`shortcut-group-${group}`} className="flex flex-col gap-2">
                  <h3 id={`shortcut-group-${group}`} className="text-13 font-semibold text-inkMid">
                    {group}
                  </h3>
                  <ul className="flex flex-col divide-y divide-paperRule rounded-xl border border-paperRule">
                    {groupActions.map((action) => (
                      <li key={action.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
                        <span className="text-14 text-ink">{action.label}</span>
                        <div className="flex items-center gap-3">
                          {recordingId === action.id ? (
                            <span role="status" className="text-13 text-pending">
                              Presioná una tecla… (Esc cancela)
                            </span>
                          ) : (
                            <KeyCaps steps={bindings[action.id]} />
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Cambiar atajo: ${action.label}`}
                            onClick={() => {
                              setMessage(null)
                              setRecordingId(action.id)
                            }}
                          >
                            Cambiar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
            {message ? (
              <p role="alert" className="text-13 text-void">
                {message}
              </p>
            ) : null}
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                Restablecer atajos
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
