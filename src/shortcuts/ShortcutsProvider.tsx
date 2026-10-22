import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type Bindings,
  type Overrides,
  SEQUENCE_TIMEOUT_MS,
  type ShortcutAction,
  type ShortcutRole,
  buildActions,
  findConflict,
  loadOverrides,
  matchSequence,
  normalizeEventKey,
  resolveBindings,
  saveOverrides,
} from './bindings'
import { ShortcutsDialog } from './ShortcutsDialog'

/**
 * Atajo de una pantalla concreta (la revisión de horas, la evaluación…). Solo existe
 * mientras la pantalla está montada. `run` devuelve false si no hizo nada, para que la
 * tecla siga su camino hacia los atajos globales.
 */
export interface ScreenShortcut {
  id: string
  label: string
  /** Un solo carácter, en minúsculas: "j", "a", "2". */
  key: string
  run: () => boolean | void
}

interface ShortcutsContextValue {
  actions: ShortcutAction[]
  bindings: Bindings
  openHelp: () => void
  /** Asigna las teclas a una acción; devuelve el motivo si no se puede, o null si se guardó. */
  setBinding: (id: string, steps: string[]) => string | null
  resetBindings: () => void
}

interface ScreenRegistry {
  register: (owner: symbol, getShortcuts: () => ScreenShortcut[]) => void
  unregister: (owner: symbol) => void
  all: () => ScreenShortcut[]
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null)
const ScreenRegistryContext = createContext<ScreenRegistry | null>(null)

export function useShortcuts(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext)
  if (!context) throw new Error('useShortcuts debe usarse dentro de ShortcutsProvider')
  return context
}

/**
 * Registra los atajos de la pantalla actual mientras esté montada. Fuera del provider no
 * hace nada, así que una pantalla se puede renderizar aislada en sus pruebas.
 */
export function useScreenShortcuts(shortcuts: ScreenShortcut[]): void {
  const registry = useContext(ScreenRegistryContext)
  const owner = useRef(Symbol('screen-shortcuts')).current
  const latest = useRef(shortcuts)

  useEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    if (!registry) return
    registry.register(owner, () => latest.current)
    return () => registry.unregister(owner)
  }, [registry, owner])
}

/** Campos donde el usuario escribe: ahí la tecla pertenece al texto, no a un atajo. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function runGlobalAction(id: string, navPaths: string[], navigate: (path: string) => void, openHelp: () => void) {
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
  /** Rol de la sesión: decide qué acciones existen (por ejemplo, "n" solo si hay algo que crear). */
  role?: ShortcutRole
  children: ReactNode
}

/**
 * Atajos de la aplicación autenticada. Una sola escucha de teclado: primero los de la
 * pantalla activa (si alguno actúa) y después los globales. Nada se dispara mientras se
 * escribe en un campo ni con una ventana abierta (salvo la propia lista de atajos).
 */
export function ShortcutsProvider({ navPaths, role, children }: ShortcutsProviderProps) {
  const navigate = useNavigate()
  const actions = useMemo(() => buildActions(navPaths.length, role), [navPaths.length, role])
  const [overrides, setOverrides] = useState<Overrides>(() => loadOverrides())
  const bindings = useMemo(() => resolveBindings(actions, overrides), [actions, overrides])
  const [helpOpen, setHelpOpen] = useState(false)
  const buffer = useRef<{ steps: string[]; at: number }>({ steps: [], at: 0 })
  const screens = useRef(new Map<symbol, () => ScreenShortcut[]>())

  // Al cerrar la lista, el foco vuelve a donde estaba (la lista no tiene un disparador propio).
  const focusBeforeHelp = useRef<HTMLElement | null>(null)
  const openHelp = useCallback(() => {
    focusBeforeHelp.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setHelpOpen(true)
  }, [])
  const restoreFocus = useCallback(() => {
    focusBeforeHelp.current?.focus()
    focusBeforeHelp.current = null
  }, [])

  const registry = useMemo<ScreenRegistry>(
    () => ({
      register: (owner, getShortcuts) => {
        screens.current.set(owner, getShortcuts)
      },
      unregister: (owner) => {
        screens.current.delete(owner)
      },
      all: () => Array.from(screens.current.values()).flatMap((getShortcuts) => getShortcuts()),
    }),
    [],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      // Con una ventana abierta, las teclas son de esa ventana (Esc la cierra), no de la app.
      if (document.querySelector('[role="dialog"]')) return
      const key = normalizeEventKey(event)
      if (!key) return

      // 1) La pantalla activa tiene prioridad, pero solo si de verdad actúa con la tecla.
      const screenShortcut = registry
        .all()
        .find((shortcut) => shortcut.key === key && shortcut.run() !== false)
      if (screenShortcut) {
        event.preventDefault()
        buffer.current = { steps: [], at: 0 }
        return
      }

      // 2) Atajos globales, con secuencias de hasta dos pasos.
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
        runGlobalAction(result.id, navPaths, navigate, openHelp)
      } else if (result.kind === 'prefix') {
        buffer.current = { steps: [...previous, key], at: now }
        event.preventDefault()
      } else {
        buffer.current = { steps: [], at: 0 }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings, navPaths, navigate, openHelp, registry])

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
      <ScreenRegistryContext.Provider value={registry}>
        {children}
      </ScreenRegistryContext.Provider>
      <ShortcutsDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        actions={actions}
        bindings={bindings}
        screenActions={helpOpen ? registry.all().map(({ id, label, key }) => ({ id, label, key })) : []}
        role={role}
        onSetBinding={setBinding}
        onReset={resetBindings}
        onRestoreFocus={restoreFocus}
      />
    </ShortcutsContext.Provider>
  )
}
