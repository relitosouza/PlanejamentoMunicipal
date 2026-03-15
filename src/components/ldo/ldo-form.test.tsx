import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LdoForm } from './ldo-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockPpas = [
  { id: 'ppa1', anoInicio: 2022, anoFim: 2025 },
  { id: 'ppa2', anoInicio: 2026, anoFim: 2029 },
]

describe('LdoForm', () => {
  it('renders exercicio and PPA select fields', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    expect(screen.getByLabelText(/Exercício/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/PPA/i)).toBeInTheDocument()
  })

  it('does not call action when form has validation errors', async () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    fireEvent.change(screen.getByLabelText(/Exercício/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar/i }))
    await waitFor(() => {
      expect(action).not.toHaveBeenCalled()
    })
  })

  it('renders submit button with correct label', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    expect(screen.getByRole('button', { name: /Criar/i })).toBeInTheDocument()
  })
})
