// src/components/ppa/ods-map.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OdsMap } from './ods-map'

const programas = [
  { id: '1', numero: '001', nome: 'Educação', odsIds: [4, 10] },
  { id: '2', numero: '002', nome: 'Saúde', odsIds: [3, 10] },
]

describe('OdsMap', () => {
  it('renders all 17 ODS cells', () => {
    render(<OdsMap programas={programas} />)
    for (let i = 1; i <= 17; i++) {
      expect(screen.getByTestId(`ods-cell-${i}`)).toBeTruthy()
    }
  })

  it('shows covered ODS as highlighted', () => {
    render(<OdsMap programas={programas} />)
    const ods4 = screen.getByTestId('ods-cell-4')
    expect(ods4.className).toContain('bg-primary')
  })

  it('shows uncovered ODS as muted', () => {
    render(<OdsMap programas={programas} />)
    const ods1 = screen.getByTestId('ods-cell-1')
    expect(ods1.className).not.toContain('bg-primary')
  })

  it('shows coverage percentage', () => {
    render(<OdsMap programas={programas} />)
    // 3 unique ODS (3, 4, 10) out of 17 = ~18%
    expect(screen.getByText(/18%/)).toBeTruthy()
  })
})
