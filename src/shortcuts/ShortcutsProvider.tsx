import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type Bindings,
  type Overrides,
  SEQUENCE_TIMEOUT_MS,
  type ShortcutAction,
  buildActions,
  findConflict,
  loadOverrides,
  matchSequence,
  normalizeEventKey,
  resolveBindings,
  saveOverrides,
} from './bindings'
import { ShortcutsDialog } from './ShortcutsDialog'

interface ShortcutsContextValue {
  actions: ShortcutAction[]
  bindings: Bindings
  openHelp: () => void
  /** Asigna las teclas a una acción; devuelve el motivo si no se puede, o null si se guardó. */
  setBinding: (id: string, steps: string[]) => string | null
  resetBindings: () => void
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null)

export function useShortcuts(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext)
  if (!context) throw new Error('useShortcuts debe usarse dentro de ShortcutsProvider')
  return context
}

/** Campos donde el usuario escribe: ahí la tecla pertenece al texto, no a un atajo. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function runAction(id: string, navPaths: string[], navigate: (path: string) => void, openHelp: () => void) {
  if (id === 'help') return openHelp()
  if (id === 'search') return document.querySelector<HTMLElement>('[data-shortcut-search]')?.focus()
  if (id === 'new') return document.querySelector<HTMLElement>('[data-shortcut-new]')?.click()
  const navMatch = /^nav-(\d+)$/.exec(id)
  if (navMatch) {
    const path = navPaths[Number(navMatch[1]) - 1]
    if (path) navigate(path)
  }
}

interface ShortcutsProviderProps {
  /** Rutas del menú lateral, en orden: la tecla 1 va a la primera, la 2 a la segunda, etc. */
  navPaths: string[]
  children: ReactNode
}

/**
 * Atajos globales de la aplicación autenticada. Una sola escucha de teclado; ignora las
 * teclas mientras se escribe en un campo o hay una ventana abierta (salvo la propia lista
 * de atajos). Las combinaciones personalizadas se guardan en este dispositivo.
 */
export function ShortcutsProvider({ navPaths, children }: ShortcutsProviderProps) {
  const navigate = useNavigate()
  const actions = useMemo(() => buildActions(navPaths.length), [navPaths.length])
  const [overrides, setOverrides] = useState<Overrides>(() => loadOverrides())
  const bindings = useMemo(() => resolveBindings(actions, overrides), [actions, overrides])
  const [helpOpen, setHelpOpen] = useState(false)
  const buffer = useRef<{ steps: string[]; at: number }>({ steps: [], at: 0 })

  const openHelp = useCallback(() => setHelpOpen(true), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      // Con una ventana abierta, las teclas son de esa ventana (Esc la cierra), no de la app.
      if (document.querySelector('[role="dialog"]')) return
      const key = normalizeEventKey(event)
      if (!key) return

      const now = Date.now()
      const previous = now - buffer.current.at < SEQUENCE_TIMEOUT_MS ? buffer.current.steps : []
      let result = matchSequence([...previous, key], bindings)
      if (result.kind === 'none' && previous.length > 0) {
        // La secuencia en curso no siguió: la tecla sola puede empezar otra.
        result = matchSequence([key], bindings)
      }

      if (result.kind === 'match') {
        buffer.current = { steps: [], at: 0 }
        event.preventDefault()
        runAction(result.id, navPaths, navigate, openHelp)
      } else if (result.kind === 'prefix') {
        buffer.current = { steps: [...previous, key], at: now }
        event.preventDefault()
      } else {
        buffer.current = { steps: [], at: 0 }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings, navPaths, navigate, openHelp])

  const setBinding = useCallback(
    (id: string, steps: string[]) => {
      const conflict = findConflict(actions, bindings, id, steps)
      if (conflict) return `Esa tecla ya está usada por: ${conflict}`
      const next = { ...overrides, [id]: steps }
      saveOverrides(next)
      setOverrides(next)
      return null
    },
    [actions, bindings, overrides],
  )

  const resetBindings = useCallback(() => {
    saveOverrides({})
    setOverrides({})
  }, [])

  const value = useMemo(
    () => ({ actions, bindings, openHelp, setBinding, resetBindings }),
    [actions, bindings, openHelp, setBinding, resetBindings],
  )

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        actions={actions}
        bindings={bindings}
        onSetBinding={setBinding}
        onReset={resetBindings}
      />
    </ShortcutsContext.Provider>
  )
}
