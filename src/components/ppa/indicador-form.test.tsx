// src/components/ppa/indicador-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IndicadorForm } from './indicador-form'

vi.mock('@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions', () => ({
  criarIndicador: vi.fn(),
  excluirIndicador: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { criarIndicador } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions'
const mockCriarIndicador = vi.mocked(criarIndicador)

describe('IndicadorForm', () => {
  const props = { programaId: 'prog-1' }

  beforeEach(() => { vi.clearAllMocks() })

  it('renders nome, unidade, valorMeta, and periodicidade fields', () => {
    render(<IndicadorForm {...props} />)
    expect(screen.getByLabelText(/Nome do Indicador/i)).toBeDefined()
    expect(screen.getByLabelText(/Unidade/i)).toBeDefined()
    expect(screen.getByLabelText(/Valor Meta/i)).toBeDefined()
  })

  it('calls criarIndicador on submit with valid data', async () => {
    mockCriarIndicador.mockResolvedValue({})
    render(<IndicadorForm {...props} />)
    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), { target: { value: 'Taxa de Cobertura' } })
    fireEvent.change(screen.getByLabelText(/Unidade/i), { target: { value: '%' } })
    fireEvent.change(screen.getByLabelText(/Valor Meta/i), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }))
    await waitFor(() => {
      expect(mockCriarIndicador).toHaveBeenCalledWith('prog-1', expect.objectContaining({ nome: 'Taxa de Cobertura', unidade: '%' }))
    })
  })
})
