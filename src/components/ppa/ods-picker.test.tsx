import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OdsPicker } from './ods-picker'

describe('OdsPicker', () => {
  it('renders all 17 ODS options', () => {
    render(<OdsPicker value={[]} onChange={vi.fn()} />)
    for (let i = 1; i <= 17; i++) {
      expect(screen.getByTitle(`ODS ${i}`)).toBeTruthy()
    }
  })

  it('highlights selected ODS', () => {
    render(<OdsPicker value={[4, 11]} onChange={vi.fn()} />)
    const ods4 = screen.getByTitle('ODS 4')
    expect(ods4.className).toContain('bg-primary')
  })

  it('calls onChange with toggled selection', () => {
    const onChange = vi.fn()
    render(<OdsPicker value={[4]} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('ODS 11'))
    expect(onChange).toHaveBeenCalledWith([4, 11])
  })

  it('deselects on second click', () => {
    const onChange = vi.fn()
    render(<OdsPicker value={[4, 11]} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('ODS 4'))
    expect(onChange).toHaveBeenCalledWith([11])
  })
})
