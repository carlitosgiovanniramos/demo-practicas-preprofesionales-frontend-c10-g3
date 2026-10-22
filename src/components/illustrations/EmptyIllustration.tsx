import type { ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Ilustraciones propias de los estados vacíos. Cada escena es un SVG vectorial que usa
 * los colores del sistema por clases de Tailwind (fill-*, stroke-*), así que cambia con
 * el tema. Son decorativas: el texto del estado vacío es el que comunica.
 */
export type IllustrationName = 'search' | 'clock' | 'briefcase' | 'envelope' | 'people' | 'document' | 'cap' | 'check'

function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
      className={cn('h-28 w-auto', className)}
    >
      <ellipse cx="80" cy="108" rx="56" ry="6" className="fill-soft" />
      {children}
    </svg>
  )
}

// Búsqueda o filtro sin resultados: una lupa sobre una hoja con renglones.
function SearchScene() {
  return (
    <Scene>
      <rect x="32" y="20" width="70" height="84" rx="10" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="44" y="36" width="30" height="5" rx="2.5" className="fill-soft" />
      <rect x="44" y="48" width="44" height="5" rx="2.5" className="fill-soft" />
      <rect x="44" y="60" width="24" height="5" rx="2.5" className="fill-soft" />
      <circle cx="108" cy="68" r="17" className="fill-chipStamp stroke-stamp" strokeWidth="4" />
      <line x1="120" y1="80" x2="134" y2="96" className="stroke-stamp" strokeWidth="7" strokeLinecap="round" />
      <path d="M101 61 L115 75 M115 61 L101 75" className="stroke-pending" strokeWidth="3" strokeLinecap="round" />
    </Scene>
  )
}

// Horas o fechas sin registros: un calendario con su reloj.
function ClockScene() {
  return (
    <Scene>
      <rect x="30" y="24" width="78" height="70" rx="10" className="fill-surface stroke-line" strokeWidth="2" />
      <path d="M30 42 V34 a10 10 0 0 1 10 -10 H98 a10 10 0 0 1 10 10 V42 Z" className="fill-chipStamp" />
      <rect x="44" y="54" width="22" height="5" rx="2.5" className="fill-soft" />
      <rect x="44" y="66" width="34" height="5" rx="2.5" className="fill-soft" />
      <circle cx="118" cy="76" r="22" className="fill-surface stroke-stamp" strokeWidth="5" />
      <path d="M118 62 V76 L128 84" fill="none" className="stroke-stamp" strokeWidth="4" strokeLinecap="round" />
    </Scene>
  )
}

// Ofertas: un maletín con su costura y el cierre.
function BriefcaseScene() {
  return (
    <Scene>
      <path d="M58 46 V36 a6 6 0 0 1 6 -6 H96 a6 6 0 0 1 6 6 V46" fill="none" className="stroke-stamp" strokeWidth="6" />
      <rect x="28" y="46" width="104" height="58" rx="11" className="fill-stamp" />
      <rect x="28" y="66" width="104" height="4" className="fill-chipStamp" />
      <rect x="72" y="60" width="16" height="16" rx="4" className="fill-chipPending" />
    </Scene>
  )
}

// Postulaciones o correos: un sobre del que sale un avión de papel.
function EnvelopeScene() {
  return (
    <Scene>
      <rect x="30" y="50" width="96" height="54" rx="10" className="fill-surface stroke-stamp" strokeWidth="3" />
      <path d="M34 56 L78 86 L122 56" fill="none" className="stroke-stamp" strokeWidth="3" strokeLinejoin="round" />
      <path d="M96 40 L134 18 L118 56 L110 46 Z" className="fill-chipStamp stroke-stamp" strokeWidth="2.5" strokeLinejoin="round" />
    </Scene>
  )
}

// Practicantes o personas: dos siluetas, una al frente.
function PeopleScene() {
  return (
    <Scene>
      <circle cx="98" cy="46" r="15" className="fill-chipStamp" />
      <path d="M72 100 a26 26 0 0 1 52 0 Z" className="fill-chipStamp" />
      <circle cx="62" cy="52" r="16" className="fill-stamp" />
      <path d="M34 100 a28 28 0 0 1 56 0 Z" className="fill-stamp" />
    </Scene>
  )
}

// Documentos pendientes: una hoja con esquina doblada y un sello de validado.
function DocumentScene() {
  return (
    <Scene>
      <path
        d="M46 20 H96 L118 42 V96 a6 6 0 0 1 -6 6 H52 a6 6 0 0 1 -6 -6 V26 a6 6 0 0 1 6 -6 Z"
        className="fill-surface stroke-line"
        strokeWidth="2"
      />
      <path d="M96 20 V42 H118" fill="none" className="stroke-line" strokeWidth="2" />
      <rect x="58" y="56" width="40" height="5" rx="2.5" className="fill-soft" />
      <rect x="58" y="68" width="46" height="5" rx="2.5" className="fill-soft" />
      <rect x="58" y="80" width="26" height="5" rx="2.5" className="fill-soft" />
      <circle cx="116" cy="88" r="13" className="fill-chipStamp" />
      <path d="M110 88 L115 93 L123 83" fill="none" className="stroke-stamp" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Scene>
  )
}

// Sin práctica activa todavía: un birrete.
function CapScene() {
  return (
    <Scene>
      <path d="M56 62 V84 C56 94 104 94 104 84 V62 L80 74 Z" className="fill-stamp" />
      <path d="M80 36 L130 56 L80 76 L30 56 Z" className="fill-stamp" />
      <path d="M130 56 V82" className="stroke-pending" strokeWidth="3" strokeLinecap="round" />
      <circle cx="130" cy="86" r="5" className="fill-pending" />
    </Scene>
  )
}

// Al día, evaluación enviada o tareas revisadas: un portapapeles con check.
function CheckScene() {
  return (
    <Scene>
      <rect x="40" y="24" width="80" height="88" rx="11" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="60" y="14" width="40" height="18" rx="6" className="fill-stamp" />
      <rect x="54" y="52" width="52" height="5" rx="2.5" className="fill-soft" />
      <rect x="54" y="98" width="30" height="5" rx="2.5" className="fill-soft" />
      <path d="M58 80 L72 94 L100 66" fill="none" className="stroke-stamp" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </Scene>
  )
}

const SCENES: Record<IllustrationName, () => ReactElement> = {
  search: SearchScene,
  clock: ClockScene,
  briefcase: BriefcaseScene,
  envelope: EnvelopeScene,
  people: PeopleScene,
  document: DocumentScene,
  cap: CapScene,
  check: CheckScene,
}

/** Ilustración vectorial de un estado vacío, elegida por su contexto. */
export function EmptyIllustration({ name, className }: { name: IllustrationName; className?: string }) {
  const Illustration = SCENES[name]
  return (
    <span className={cn('block', className)}>
      <Illustration />
    </span>
  )
}
