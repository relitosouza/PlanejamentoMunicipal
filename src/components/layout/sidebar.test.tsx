// src/components/layout/sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from './sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/ppa',
}))

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

describe('Sidebar', () => {
  it('renders all main nav sections', () => {
    render(<Sidebar municipioNome="Prefeitura Teste" usuarioNome="João" />)
    expect(screen.getByText('Planejamento')).toBeTruthy()
    expect(screen.getByText('Orçamento')).toBeTruthy()
    expect(screen.getByText('Inteligência')).toBeTruthy()
  })

  it('highlights active route', () => {
    render(<Sidebar municipioNome="Prefeitura Teste" usuarioNome="João" />)
    const ppaLink = screen.getByText('PPA').closest('a')
    expect(ppaLink?.className).toContain('bg-primary')
  })
})
