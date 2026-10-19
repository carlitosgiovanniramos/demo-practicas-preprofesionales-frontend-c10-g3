import type { ReactNode } from 'react'
import { Panel } from '@/components/Panel'

/** Pantalla de error al cargar una oferta, con el enlace de regreso que corresponda a la página. */
export function OfferLoadError({ message, backLink }: { message: string; backLink: ReactNode }) {
  return (
    <>
      {backLink}
      <Panel>
        <p role="alert" className="px-5 py-14 text-center text-14 text-void">
          {message}
        </p>
      </Panel>
    </>
  )
}
