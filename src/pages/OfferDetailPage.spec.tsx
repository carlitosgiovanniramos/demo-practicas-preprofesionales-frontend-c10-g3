import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Application, type ApplicationStatus, listMine } from '@/api/applications'
import type { Offer } from '@/api/offers'
import { OfferDetailPage } from './OfferDetailPage'

vi.mock('@/api/applications', () => ({ listMine: vi.fn(), apply: vi.fn() }))
vi.mock('@/lib/offer-loader', () => ({
  loadOfferInto: (_id: number, _cancelled: () => boolean, setOffer: (offer: Offer) => void) => setOffer(offer),
}))

const offer = {
  id: 1,
  title: 'Desarrollador React',
  description: 'Interfaces web',
  modality: 'remoto',
  seats: 2,
  requiredHours: 240,
  periodStart: '2026-03-01',
  periodEnd: '2026-07-31',
  status: 'PUBLISHED',
  publishedAt: null,
  companyId: 1,
  company: { id: 1, name: 'Acme' },
} as Offer

function applicationWith(status: ApplicationStatus): Application {
  return {
    id: 9,
    offerId: 1,
    studentId: 5,
    status,
    motivation: 'Quiero aprender React',
    submittedAt: '2026-03-02T00:00:00.000Z',
    decidedAt: null,
    offer,
  } as Application
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ofertas/1']}>
      <Routes>
        <Route path="/ofertas/:id" element={<OfferDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const submitButton = () => screen.queryByRole('button', { name: /Enviar postulaci/ })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OfferDetailPage: volver a postular', () => {
  it('muestra el formulario cuando el estudiante nunca postuló', async () => {
    vi.mocked(listMine).mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(submitButton()).not.toBeNull())
  })

  it('muestra el formulario otra vez tras un rechazo, con aviso de la postulación anterior', async () => {
    vi.mocked(listMine).mockResolvedValue([applicationWith('REJECTED')])

    renderPage()

    await waitFor(() => expect(submitButton()).not.toBeNull())
    expect(screen.getByText('Tu postulación anterior fue descartada. Puedes volver a postular.')).toBeTruthy()
  })

  it.each(['SUBMITTED', 'INTERVIEW', 'ACCEPTED'] as const)(
    'no muestra el formulario con una postulación %s y explica por qué',
    async (status) => {
      vi.mocked(listMine).mockResolvedValue([applicationWith(status)])

      renderPage()

      await waitFor(() =>
        expect(screen.getByText('No puedes volver a postular mientras esta postulación siga activa.')).toBeTruthy(),
      )
      expect(submitButton()).toBeNull()
    },
  )
})
