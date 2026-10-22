import { describe, expect, it } from 'vitest'
import { focusFirstInvalid } from './form-focus'

function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form>
      <input id="ok" value="fine" />
      <input id="first-bad" aria-invalid="true" />
      <input id="second-bad" aria-invalid="true" />
    </form>`
  return document.querySelector('form') as HTMLFormElement
}

describe('focusFirstInvalid', () => {
  it('moves focus to the first control marked as invalid and reports it', () => {
    const form = buildForm()

    const focused = focusFirstInvalid(form)

    expect(focused).toBe(true)
    expect(document.activeElement?.id).toBe('first-bad')
  })

  it('does nothing when every control is valid', () => {
    const form = buildForm()
    form.querySelectorAll('[aria-invalid]').forEach((node) => node.setAttribute('aria-invalid', 'false'))
    ;(document.getElementById('ok') as HTMLInputElement).focus()

    expect(focusFirstInvalid(form)).toBe(false)
    expect(document.activeElement?.id).toBe('ok')
  })
})
