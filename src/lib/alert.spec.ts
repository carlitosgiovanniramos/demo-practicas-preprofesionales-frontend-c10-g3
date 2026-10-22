import Swal from 'sweetalert2'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { showErrorAlert } from './alert'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('showErrorAlert', () => {
  it('muestra una alerta de error con el mensaje dado', () => {
    showErrorAlert('No se pudo enviar la evaluación')

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        title: 'No se pudo completar la acción',
        html: 'No se pudo enviar la evaluación',
      }),
    )
  })

  it('escapa el HTML del mensaje para que nunca se interprete como markup', () => {
    showErrorAlert('<img src=x onerror="alert(1)"> & "fin"')

    const { html } = vi.mocked(Swal.fire).mock.calls[0][0] as unknown as { html: string }
    expect(html).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;fin&quot;')
  })

  it('acepta un título propio', () => {
    showErrorAlert('Sin conexión', 'Sin conexión')

    expect(vi.mocked(Swal.fire).mock.calls[0][0]).toMatchObject({ title: 'Sin conexión' })
  })
})
