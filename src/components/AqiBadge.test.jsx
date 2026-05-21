import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AqiBadge from './AqiBadge'

describe('<AqiBadge />', () => {
  it('renders nothing when aqi is missing or has no epa value', () => {
    const { container: c1 } = render(<AqiBadge aqi={null} />)
    expect(c1).toBeEmptyDOMElement()
    const { container: c2 } = render(<AqiBadge aqi={{}} />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('renders compact label by default', () => {
    render(<AqiBadge aqi={{ epa: 1, label: 'Хорошее', color: '#10b981' }} />)
    expect(screen.getByText(/AQI/)).toBeInTheDocument()
    expect(screen.getByText(/Хорошее/)).toBeInTheDocument()
  })

  it('renders expanded variant with pollutants when `full` is set', () => {
    render(
      <AqiBadge
        full
        aqi={{
          epa: 4, label: 'Вредное', color: '#f97316',
          pm25: 42, pm10: 80, no2: 11,
        }}
      />,
    )
    expect(screen.getByText('Качество воздуха')).toBeInTheDocument()
    expect(screen.getByText('Вредное')).toBeInTheDocument()
    expect(screen.getByText('PM2.5')).toBeInTheDocument()
    expect(screen.getByText('PM10')).toBeInTheDocument()
    expect(screen.getByText('NO₂')).toBeInTheDocument()
  })

  it('shows a human advisory matching the EPA index', () => {
    render(
      <AqiBadge
        full
        aqi={{ epa: 6, label: 'Опасное', color: '#7f1d1d' }}
      />,
    )
    expect(screen.getByText(/Не выходите без необходимости/i)).toBeInTheDocument()
  })

  it('exposes the EPA number with an aria-label', () => {
    render(
      <AqiBadge
        full
        aqi={{ epa: 3, label: 'Чувствительным', color: '#eab308' }}
      />,
    )
    expect(screen.getByLabelText(/EPA индекс 3 из 6/)).toBeInTheDocument()
  })
})
