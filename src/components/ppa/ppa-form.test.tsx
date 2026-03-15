import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PpaForm } from './ppa-form'

const mockCriarPPA = vi.fn()
vi.mock('@/app/(app)/ppa/_actions', () => ({ criarPPA: (...args: unknown[]) => mockCriarPPA(...args) }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('PpaForm', () => {
  it('renders year inputs', () => {
    render(<PpaForm />)
    expect(screen.getByLabelText(/Ano de Início/i)).toBeTruthy()
    expect(screen.getByLabelText(/Ano de Fim/i)).toBeTruthy()
  })

  it('shows validation error when anoFim is not anoInicio + 3', async () => {
    render(<PpaForm />)
    fireEvent.change(screen.getByLabelText(/Ano de Início/i), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Ano de Fim/i), { target: { value: '2026' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar PPA/i }))
    await waitFor(() => {
      expect(screen.getByText(/4 anos/i)).toBeTruthy()
    })
    expect(mockCriarPPA).not.toHaveBeenCalled()
  })

  it('calls criarPPA with valid data', async () => {
    mockCriarPPA.mockResolvedValue({})
    render(<PpaForm />)
    fireEvent.change(screen.getByLabelText(/Ano de Início/i), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Ano de Fim/i), { target: { value: '2027' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar PPA/i }))
    await waitFor(() => {
      expect(mockCriarPPA).toHaveBeenCalledWith({ anoInicio: 2024, anoFim: 2027 })
    })
  })
})
