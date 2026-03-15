// src/components/ppa/acao-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AcaoForm } from './acao-form'

const mockCriarAcao = vi.fn()
vi.mock(
  '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions',
  () => ({ criarAcao: (...args: unknown[]) => mockCriarAcao(...args) }),
)
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

describe('AcaoForm', () => {
  const props = { programaId: 'prog-1', onSuccess: vi.fn() }

  it('renders código and nome fields', () => {
    render(<AcaoForm {...props} />)
    expect(screen.getByLabelText(/Código/i)).toBeTruthy()
    expect(screen.getByLabelText(/Nome da Ação/i)).toBeTruthy()
  })

  it('calls criarAcao on submit with valid data', async () => {
    mockCriarAcao.mockResolvedValue({})
    render(<AcaoForm {...props} />)
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: '2001' } })
    fireEvent.change(screen.getByLabelText(/Nome da Ação/i), { target: { value: 'Manutenção das Escolas' } })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }))
    await waitFor(() => {
      expect(mockCriarAcao).toHaveBeenCalledWith('prog-1', expect.objectContaining({ codigo: '2001', nome: 'Manutenção das Escolas' }))
    })
  })
})
