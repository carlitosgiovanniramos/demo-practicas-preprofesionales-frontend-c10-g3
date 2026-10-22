/** Idioma de la voz que lee las confirmaciones. Va con el de reconocimiento (VOICE_LANG). */
const SPEECH_LANG = 'es-MX'

/**
 * Lee un texto en voz alta para quien no puede ver la pantalla. Si el navegador no tiene síntesis
 * de voz, no hace nada: la confirmación igual queda visible en pantalla.
 */
export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (typeof SpeechSynthesisUtterance === 'undefined') return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LANG
  window.speechSynthesis.speak(utterance)
}
