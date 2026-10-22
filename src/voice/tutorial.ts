import Swal from 'sweetalert2'

/** Marca de sesión: el tutorial se muestra una vez por inicio de sesión, la primera vez que se usa el micrófono. */
const TUTORIAL_KEY = 'voice:tutorialSeen'
/** Marca permanente: el tutorial del login se muestra una sola vez, la primera vez que se abre. */
const LOGIN_TUTORIAL_KEY = 'voice:loginTutorialSeen'

interface TutorialSection {
  title: string
  items: string[]
}

export function shouldShowVoiceTutorial(): boolean {
  return sessionStorage.getItem(TUTORIAL_KEY) !== 'true'
}

export function markVoiceTutorialShown(): void {
  sessionStorage.setItem(TUTORIAL_KEY, 'true')
}

/** Al iniciar sesión, el tutorial vuelve a mostrarse en el primer uso del micrófono. */
export function resetVoiceTutorial(): void {
  sessionStorage.removeItem(TUTORIAL_KEY)
}

export function shouldShowLoginVoiceTutorial(): boolean {
  return localStorage.getItem(LOGIN_TUTORIAL_KEY) !== 'true'
}

/**
 * Cada sección agrupa sus comandos con lo que hacen. La primera va abierta; las demás se despliegan
 * con un clic, así el modal no abruma y ningún comando ni explicación desaparece.
 */
const APP_SECTIONS: TutorialSection[] = [
  {
    title: 'Ir y crear',
    items: [
      '<b>Ir a una sección:</b> di su nombre, por ejemplo "ofertas" o "mis horas".',
      '<b>Crear algo:</b> di "registrar horas" o "nuevo".',
      '<b>Buscar:</b> di "buscar" y el texto, por ejemplo "buscar Ana".',
      '<b>Ayuda:</b> di "ayuda" para ver los atajos.',
    ],
  },
  {
    title: 'Formularios',
    items: [
      '<b>Llenar un campo:</b> enfoca el campo y di lo que va en él, por ejemplo "2:35" en la hora de inicio. También puedes decir "llenar comentario muy bien".',
      '<b>Números:</b> en correos y contraseñas, "cero" se escribe 0 y cualquier número también ("uno dos tres" es 123).',
      '<b>Pasar de campo:</b> di "siguiente campo" o "campo anterior".',
      '<b>Contraseña visible:</b> di "visibilizar" o "contraseña visible" para verla, y "ocultar" para esconderla.',
      '<b>Espacios en la contraseña:</b> las palabras van juntas; di "espacio" cuando quieras un espacio.',
    ],
  },
  {
    title: 'Botones y envío',
    items: [
      '<b>Pulsar un botón:</b> di "clic en guardar" o simplemente "guardar cambios".',
      '<b>Enviar un formulario:</b> di "enviar" o "guardar".',
    ],
  },
  {
    title: 'Teclado y manos libres',
    items: [
      '<b>Modo manos libres:</b> activa el botón "Manos libres" y el micrófono escucha sin que lo toques.',
      '<b>Atajo de teclado:</b> <kbd>F2</kbd> activa o apaga el micrófono desde cualquier lugar.',
    ],
  },
]

/** Pantalla de login: solo los comandos que sirven antes de iniciar sesión. */
const LOGIN_SECTIONS: TutorialSection[] = [
  {
    title: 'Entrar',
    items: [
      '<b>Iniciar sesión:</b> di "iniciar sesión", "entrar" o "ingresar".',
      '<b>Ayuda:</b> este mismo tutorial vuelve a abrirse si lo pides desde la app.',
    ],
  },
  {
    title: 'Correo',
    items: [
      '<b>Escribirlo:</b> di "correo" y tu correo: por ejemplo "correo ana arroba uta punto edu".',
      '<b>Símbolos:</b> "arroba" es @ y "punto" es un punto.',
      '<b>Deletrear:</b> si no se entiende una palabra, di las letras una a una: "m i y u r a".',
    ],
  },
  {
    title: 'Contraseña',
    items: [
      '<b>Escribirla:</b> di "contraseña" y tu clave. Las palabras van juntas; di "espacio" para un espacio.',
      '<b>Números:</b> "cero uno dos" se escribe 012.',
      '<b>Verla u ocultarla:</b> di "visibilizar" o "contraseña visible" para verla, y "ocultar" para esconderla.',
    ],
  },
  {
    title: 'Moverse entre campos',
    items: [
      '<b>Pasar de campo:</b> di "siguiente campo" o "campo anterior".',
      '<b>Llenar un campo por nombre:</b> di "llenar contraseña" seguido de la clave.',
      '<b>Borrar:</b> di "borrar campo" para limpiar el que tiene el foco.',
    ],
  },
  {
    title: 'Micrófono',
    items: [
      'El botón del micrófono y "manos libres" están arriba a la izquierda.',
      '<kbd>F2</kbd> activa o apaga el micrófono desde cualquier lugar.',
    ],
  },
]

function sectionsHtml(sections: TutorialSection[]): string {
  return sections
    .map(
      (section, index) =>
        `<details${index === 0 ? ' open' : ''} style="margin-bottom:.5em;border:1px solid #e5e7eb;border-radius:8px;padding:.4em .75em">` +
        `<summary style="cursor:pointer;font-weight:600">${section.title}</summary>` +
        `<ul style="text-align:left;line-height:1.5;padding-left:1.1em;margin:.5em 0">` +
        section.items.map((item) => `<li style="margin:.25em 0">${item}</li>`).join('') +
        `</ul></details>`,
    )
    .join('')
}

/** Explica cómo funcionan los comandos de voz dentro de la app, agrupados en secciones desplegables. */
export async function showVoiceTutorial(): Promise<void> {
  markVoiceTutorialShown()
  await Swal.fire({
    icon: 'info',
    title: 'Cómo usar los comandos de voz',
    html: sectionsHtml(APP_SECTIONS),
    width: 'min(560px, 92vw)',
    confirmButtonText: 'Entendido, empezar',
  })
}

/** Tutorial del login, una sola vez: los comandos para entrar sin haber iniciado sesión. */
export async function showLoginVoiceTutorial(): Promise<void> {
  localStorage.setItem(LOGIN_TUTORIAL_KEY, 'true')
  await Swal.fire({
    icon: 'info',
    title: 'Inicia sesión con tu voz',
    html: sectionsHtml(LOGIN_SECTIONS),
    width: 'min(560px, 92vw)',
    confirmButtonText: 'Entendido',
  })
}
