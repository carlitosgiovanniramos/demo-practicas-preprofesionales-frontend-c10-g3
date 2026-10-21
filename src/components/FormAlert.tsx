/** Mensaje de error de envío de un formulario. No renderiza nada cuando no hay error. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-chipVoid px-3 py-2.5 text-13 text-void">
      {message}
    </p>
  )
}
