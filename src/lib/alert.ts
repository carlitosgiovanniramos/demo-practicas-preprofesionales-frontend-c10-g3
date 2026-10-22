import Swal from 'sweetalert2'

const DEFAULT_TITLE = 'No se pudo completar la acción'
/** Un error largo tiene que alcanzar a leerse; el usuario también puede cerrarlo antes. */
const ERROR_TIMER_MS = 8000
const SUCCESS_TIMER_MS = 4000

/** Escapa el texto para insertarlo como HTML sin que el navegador lo interprete como markup. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Aviso de error en la parte superior (toast), para cuando una acción falla. Es un aviso, no un
 * modal: no bloquea la pantalla. El mensaje se escapa: viene del servidor o de la red.
 */
export function showErrorAlert(message: string, title: string = DEFAULT_TITLE) {
  return Swal.fire({
    toast: true,
    position: 'top',
    icon: 'error',
    title,
    html: escapeHtml(message),
    showConfirmButton: false,
    showCloseButton: true,
    timer: ERROR_TIMER_MS,
    timerProgressBar: true,
  })
}

/** Confirmación breve en la parte superior, por ejemplo al completar un comando de voz. */
export function showSuccessToast(message: string) {
  return Swal.fire({
    toast: true,
    position: 'top',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: SUCCESS_TIMER_MS,
    timerProgressBar: true,
  })
}
