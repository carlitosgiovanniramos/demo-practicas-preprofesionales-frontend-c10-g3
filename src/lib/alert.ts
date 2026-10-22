import Swal from 'sweetalert2'

const DEFAULT_TITLE = 'No se pudo completar la acción'

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
 * Alerta modal para cuando una acción del usuario falla (enviar, subir, decidir, guardar…).
 * El mensaje se escapa: viene del servidor o de la red y nunca debe interpretarse como HTML.
 */
export function showErrorAlert(message: string, title: string = DEFAULT_TITLE) {
  return Swal.fire({
    icon: 'error',
    title,
    html: escapeHtml(message),
    confirmButtonText: 'Entendido',
  })
}
