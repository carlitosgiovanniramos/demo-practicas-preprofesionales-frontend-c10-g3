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

/** Explica cómo funcionan los comandos de voz con ejemplos de cada tipo de orden. */
export async function showVoiceTutorial(): Promise<void> {
  markVoiceTutorialShown()
  await Swal.fire({
    icon: 'info',
    title: 'Cómo usar los comandos de voz',
    html: `
      <ul style="text-align:left;line-height:1.6;padding-left:1.2em">
        <li><b>Ir a una sección:</b> di su nombre, por ejemplo "ofertas" o "mis horas".</li>
        <li><b>Crear algo:</b> di "registrar horas" o "nuevo".</li>
        <li><b>Buscar:</b> di "buscar" y el texto, por ejemplo "buscar Ana".</li>
        <li><b>Llenar un campo:</b> enfoca el campo y di lo que va en él, por ejemplo "2:35" en la hora de inicio. También puedes decir "llenar comentario muy bien".</li>
        <li><b>Pasar de campo:</b> di "siguiente campo" o "campo anterior".</li>
        <li><b>Pulsar un botón:</b> di "clic en guardar" o simplemente "guardar cambios".</li>
        <li><b>Enviar un formulario:</b> di "enviar" o "guardar".</li>
        <li><b>Modo manos libres:</b> activa el botón "Manos libres" y el micrófono escucha sin que lo toques.</li>
        <li><b>Atajo de teclado:</b> <kbd>F2</kbd> activa o apaga el micrófono desde cualquier lugar.</li>
        <li><b>Ayuda:</b> di "ayuda" para ver los atajos.</li>
      </ul>`,
    confirmButtonText: 'Entendido, empezar',
  })
}
