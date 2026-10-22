/**
 * Comandos de voz: lógica pura (sin micrófono ni DOM) para poder probarla. Lo que el usuario dice
 * se normaliza y se compara con las frases de cada comando; verbos como "ir a" o "abrir" se ignoran.
 * Un comando puede recibir un argumento dictado: "buscar Ana Pérez" → buscar "Ana Pérez".
 */

export interface VoiceCommand {
  id: string
  /** Frases exactas que activan el comando, tal como las diría el usuario. */
  phrases: string[]
  /** Frases seguidas de un argumento: "buscar" + texto. El argumento conserva mayúsculas y tildes. */
  prefixes?: string[]
  /** Confirmación que se dice y se muestra cuando el comando funciona. */
  feedback?: (argument?: string) => string
  /** `false` indica que la acción no se pudo hacer en la pantalla actual. */
  run: (argument?: string) => boolean | void
}

export interface VoiceMatch {
  command: VoiceCommand
  argument?: string
}

export interface NavTarget {
  path: string
  label: string
}

export interface VoiceActions {
  navigate: (path: string) => void
  openHelp: () => void
  stepRecommendation: (delta: 1 | -1) => void
  search: (text: string) => boolean
  create: () => boolean
  submit: () => boolean
  write: (text: string) => boolean
  fill: (spoken: string) => boolean
  nextField: (delta: 1 | -1) => boolean
  clear: () => boolean
  clickButton: (name: string) => boolean
}

/** Verbos que el usuario suele anteponer a la sección: "ir a ofertas", "abrir ofertas". */
const LEADING_VERBS = ['ir a ', 've a ', 'llevame a ', 'abrir ', 'abre ', 'ver ']

export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:!?¿¡*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Comando de frase exacta que corresponde a lo dicho, o `null`. Tras normalizar, sin argumentos. */
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

/**
 * Coincidencia completa: primero frases exactas; si no, una frase con argumento ("buscar …").
 * El argumento se toma del texto original para no perder mayúsculas ni tildes de lo dictado.
 */
export function matchVoice(transcript: string, commands: VoiceCommand[]): VoiceMatch | null {
  const exact = matchCommand(transcript, commands)
  if (exact) return { command: exact }

  const heard = normalizeSpeech(transcript)
  const original = transcript.trim().split(/\s+/)
  for (const command of commands) {
    for (const prefix of command.prefixes ?? []) {
      const normalized = normalizeSpeech(prefix)
      if (!heard.startsWith(`${normalized} `)) continue
      const argument = original.slice(normalized.split(' ').length).join(' ')
      if (argument) return { command, argument }
    }
  }
  return null
}

export interface LoginActions {
  submit: () => boolean
  fillByHint: (hint: string, text: string) => boolean
  togglePassword: () => boolean
}

/**
 * Comandos de la pantalla de login, sin sesión: entrar con la voz y llenar el correo y la contraseña
 * diciéndolos ("correo ana arroba uta punto edu", "contraseña …").
 */
export function buildLoginCommands(actions: LoginActions): VoiceCommand[] {
  return [
    {
      id: 'login-submit',
      phrases: ['iniciar sesion', 'entrar', 'ingresar'],
      feedback: () => 'Iniciando sesión',
      run: () => actions.submit(),
    },
    {
      id: 'login-email',
      phrases: [],
      prefixes: ['correo'],
      feedback: () => 'Correo escrito',
      run: (text) => actions.fillByHint('correo', text ?? ''),
    },
    {
      id: 'login-password',
      phrases: [],
      prefixes: ['contraseña', 'contrasena', 'clave'],
      feedback: () => 'Contraseña escrita',
      run: (text) => actions.fillByHint('contraseña', text ?? ''),
    },
    {
      id: 'login-password-visibility',
      phrases: ['visible', 'mostrar contraseña', 'ocultar contraseña', 'ver contraseña', 'mostrar clave', 'ver clave'],
      feedback: () => 'Contraseña visible u oculta',
      run: actions.togglePassword,
    },
  ]
}

/** Comandos de la aplicación: navegación, ayuda, carrusel, y acciones sobre la pantalla actual. */
export function buildVoiceCommands(navTargets: NavTarget[], actions: VoiceActions): VoiceCommand[] {
  const navigation = navTargets.map<VoiceCommand>((target) => ({
    id: `nav:${target.path}`,
    phrases: [target.label],
    feedback: () => `Abriendo ${target.label}`,
    run: () => actions.navigate(target.path),
  }))

  return [
    ...navigation,
    {
      id: 'help',
      phrases: ['ayuda', 'atajos', 'atajos de teclado'],
      feedback: () => 'Lista de atajos',
      run: actions.openHelp,
    },
    {
      id: 'recommendation-next',
      phrases: ['siguiente recomendacion', 'recomendacion siguiente', 'siguiente'],
      feedback: () => 'Siguiente recomendación',
      run: () => actions.stepRecommendation(1),
    },
    {
      id: 'recommendation-prev',
      phrases: ['anterior recomendacion', 'recomendacion anterior', 'anterior'],
      feedback: () => 'Recomendación anterior',
      run: () => actions.stepRecommendation(-1),
    },
    {
      id: 'create',
      // Frases de cada rol: el estudiante ve "Registrar horas", la empresa "Publicar oferta".
      phrases: ['nuevo', 'crear', 'nuevo registro', 'crear nuevo', 'registrar', 'registrar horas', 'registrar hora', 'publicar oferta'],
      feedback: () => 'Creando',
      run: actions.create,
    },
    {
      id: 'search',
      phrases: [],
      prefixes: ['buscar', 'busca'],
      feedback: (text) => `Buscando ${text}`,
      run: (text) => actions.search(text ?? ''),
    },
    {
      id: 'write',
      phrases: [],
      prefixes: ['escribir', 'escribe', 'dictar'],
      feedback: (text) => `Escrito: ${text}`,
      run: (text) => actions.write(text ?? ''),
    },
    {
      id: 'submit',
      phrases: ['enviar', 'guardar', 'enviar formulario'],
      feedback: () => 'Enviando',
      run: actions.submit,
    },
    {
      id: 'fill',
      phrases: [],
      prefixes: ['llenar', 'completar', 'campo'],
      feedback: () => 'Campo completado',
      run: (spoken) => actions.fill(spoken ?? ''),
    },
    {
      id: 'field-next',
      phrases: ['siguiente campo', 'campo siguiente'],
      feedback: () => 'Siguiente campo',
      run: () => actions.nextField(1),
    },
    {
      id: 'field-prev',
      phrases: ['campo anterior'],
      feedback: () => 'Campo anterior',
      run: () => actions.nextField(-1),
    },
    {
      id: 'click',
      phrases: [],
      prefixes: ['clic en', 'click en', 'pulsar', 'pulsa', 'boton'],
      feedback: (name) => `Pulsado ${name}`,
      run: (name) => actions.clickButton(name ?? ''),
    },
    {
      id: 'field-clear',
      phrases: ['borrar campo', 'limpiar campo'],
      feedback: () => 'Campo borrado',
      run: actions.clear,
    },
  ]
}
