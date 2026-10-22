/**
 * Comandos de voz: lógica pura (sin micrófono ni DOM) para poder probarla. Lo que el usuario dice
 * se normaliza y se compara con las frases de cada comando; verbos como "ir a" o "abrir" se ignoran.
 */

export interface VoiceCommand {
  id: string
  /** Frases que activan el comando, tal como las diría el usuario (sin tildes ni mayúsculas). */
  phrases: string[]
  run: () => void
}

export interface NavTarget {
  path: string
  label: string
}

export interface VoiceActions {
  navigate: (path: string) => void
  openHelp: () => void
  stepRecommendation: (delta: 1 | -1) => void
}

/** Verbos que el usuario suele anteponer a la sección: "ir a ofertas", "abrir ofertas". */
const LEADING_VERBS = ['ir a ', 've a ', 'llevame a ', 'abrir ', 'abre ', 'ver ']

export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:!?¿¡]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Comando que corresponde a lo dicho, o `null` si no hay ninguno. Coincidencia exacta tras normalizar. */
export function matchCommand(transcript: string, commands: VoiceCommand[]): VoiceCommand | null {
  const heard = normalizeSpeech(transcript)
  if (!heard) return null

  const withoutVerb = LEADING_VERBS.filter((verb) => heard.startsWith(verb)).map((verb) => heard.slice(verb.length))
  for (const text of [heard, ...withoutVerb]) {
    const found = commands.find((command) => command.phrases.some((phrase) => normalizeSpeech(phrase) === text))
    if (found) return found
  }
  return null
}

/** Comandos de la aplicación: una navegación por cada sección del menú, más ayuda y carrusel. */
export function buildVoiceCommands(navTargets: NavTarget[], actions: VoiceActions): VoiceCommand[] {
  const navigation = navTargets.map<VoiceCommand>((target) => ({
    id: `nav:${target.path}`,
    phrases: [target.label],
    run: () => actions.navigate(target.path),
  }))

  return [
    ...navigation,
    { id: 'help', phrases: ['ayuda', 'atajos', 'atajos de teclado'], run: actions.openHelp },
    {
      id: 'recommendation-next',
      phrases: ['siguiente recomendacion', 'recomendacion siguiente', 'siguiente'],
      run: () => actions.stepRecommendation(1),
    },
    {
      id: 'recommendation-prev',
      phrases: ['anterior recomendacion', 'recomendacion anterior', 'anterior'],
      run: () => actions.stepRecommendation(-1),
    },
  ]
}
