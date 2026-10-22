import Swal from 'sweetalert2'

/** Marca de sesión: el tutorial se muestra una vez por inicio de sesión, la primera vez que se usa el micrófono. */
const TUTORIAL_KEY = 'voice:tutorialSeen'

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

/**
 * Cada sección agrupa sus comandos con lo que hacen. La primera va abierta; las demás se despliegan
 * con un clic, así el modal no abruma y ningún comando ni explicación desaparece.
 */
const SECTIONS: { title: string; items: string[] }[] = [
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

function sectionsHtml(): string {
  return SECTIONS.map(
    (section, index) =>
      `<details${index === 0 ? ' open' : ''} style="margin-bottom:.5em;border:1px solid #e5e7eb;border-radius:8px;padding:.4em .75em">` +
      `<summary style="cursor:pointer;font-weight:600">${section.title}</summary>` +
      `<ul style="text-align:left;line-height:1.5;padding-left:1.1em;margin:.5em 0">` +
      section.items.map((item) => `<li style="margin:.25em 0">${item}</li>`).join('') +
      `</ul></details>`,
  ).join('')
}

/** Explica cómo funcionan los comandos de voz, agrupados en secciones desplegables. */
export async function showVoiceTutorial(): Promise<void> {
  markVoiceTutorialShown()
  await Swal.fire({
    icon: 'info',
    title: 'Cómo usar los comandos de voz',
    html: sectionsHtml(),
    width: 'min(560px, 92vw)',
    confirmButtonText: 'Entendido, empezar',
  })
}
