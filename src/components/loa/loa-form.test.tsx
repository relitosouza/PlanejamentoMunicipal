import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoaForm } from './loa-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockLdos = [
  { id: 'ldo1', exercicio: 2026 },
  { id: 'ldo2', exercicio: 2027 },
]

describe('LoaForm', () => {
  it('renders exercicio and LDO select fields', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    expect(screen.getByLabelText(/Exercício/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/LDO/i)).toBeInTheDocument()
  })

  it('does not call action when form has validation errors', async () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    fireEvent.change(screen.getByLabelText(/Exercício/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar/i }))
    await waitFor(() => {
      expect(action).not.toHaveBeenCalled()
    })
  })

  it('renders submit button with correct label', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    expect(screen.getByRole('button', { name: /Criar/i })).toBeInTheDocument()
  })
})
