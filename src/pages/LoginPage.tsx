import { type FormEvent, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { showErrorAlert } from '@/lib/alert'
import { buildLoginCommands } from '@/voice/commands'
import { fillFieldByHint, submitForm, voiceFallback } from '@/voice/actions'
import { VoiceCommandButton } from '@/voice/VoiceCommandButton'
import { Eye, EyeOff } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { FormField } from '@/components/FormField'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { focusFirstInvalid } from '@/lib/form-focus'

const EMAIL_MESSAGE = 'Escribí un correo válido, por ejemplo nombre@institucion.edu'
const MSG_CONTRASENA_REQUERIDA = 'Escribí tu contraseña'
const FALLBACK_MESSAGE = 'No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo.'

/**
 * Comprueba la forma de un correo sin expresiones regulares con retroceso: una arroba,
 * algo antes y después, un punto en el dominio y ningún espacio.
 */
function isEmailShaped(value: string): boolean {
  const at = value.indexOf('@')
  if (at <= 0 || value.indexOf('@', at + 1) !== -1) return false
  const domain = value.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  return dot > 0 && dot < domain.length - 1 && !/\s/.test(value)
}

interface LoginErrors {
  email?: string
  password?: string
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function loginFailureMessage(err: unknown): string {
  return err instanceof ApiError && err.message ? capitalize(err.message) : FALLBACK_MESSAGE
}

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {}
  if (!isEmailShaped(email.trim())) errors.email = EMAIL_MESSAGE
  if (!password) errors.password = MSG_CONTRASENA_REQUERIDA
  return errors
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({})
  const [error, setError] = useState<string | null>(() => {
    const message = sessionStorage.getItem('auth_message')
    sessionStorage.removeItem('auth_message')
    return message
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)

    const nextErrors = validate(email, password)
    if (Object.keys(nextErrors).length > 0) {
      // flushSync: el error ya debe estar en el DOM para que el foco llegue al primer campo inválido.
      flushSync(() => setFieldErrors(nextErrors))
      focusFirstInvalid(form)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      showErrorAlert(loginFailureMessage(err), 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Logo className="mb-6" />

        <div className="rounded-2xl bg-surface px-7 py-7">
          <h1 className="font-display text-26 font-bold tracking-[-0.02em] text-ink">Entrá a tu cuenta</h1>
          <p className="mt-1 text-14 text-inkMid">Con el correo institucional que te dio la unidad de vinculación.</p>

          <div className="mt-4 flex justify-end">
            <VoiceCommandButton
              getCommands={() => buildLoginCommands({ submit: submitForm, fillByHint: fillFieldByHint })}
              fallback={voiceFallback}
            />
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <FormField label="Correo institucional" required error={fieldErrors.email}>
              {(props) => (
                <Input
                  {...props}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>

            <FormField label="Contraseña" required error={fieldErrors.password}>
              {(props) => (
                <div className="relative">
                  <Input
                    {...props}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-inkSoft hover:bg-pillHover hover:text-ink"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              )}
            </FormField>

            {error ? (
              <p role="alert" className="rounded-md bg-chipVoid px-3 py-2.5 text-13 text-void">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
