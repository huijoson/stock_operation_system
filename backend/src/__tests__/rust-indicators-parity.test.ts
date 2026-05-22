import Decimal from 'decimal.js'

const mockLoadRustIndicatorsNative = jest.fn()

jest.mock('../lib/rust-indicators/native-loader', () => ({
  loadRustIndicatorsNative: (...args: unknown[]) => mockLoadRustIndicatorsNative(...args),
}))

describe('RSIService native parity', () => {
  beforeEach(() => {
    jest.resetModules()
    mockLoadRustIndicatorsNative.mockReset()
  })

  it('falls back to TypeScript implementation when native addon is unavailable', async () => {
    mockLoadRustIndicatorsNative.mockReturnValue({
      available: false,
      reason: 'missing addon',
    })

    const { RSIService } = await import('../services/rsi.service')

    const service = new RSIService()
    const prices = [
      44.34, 44.09, 44.15, 43.61, 44.33,
      44.83, 45.1, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28,
      46, 46.03, 46.41, 46.22, 45.64,
    ]

    const result = service.calculateRSI(prices, 14)

    expect(result.value).toBeCloseTo(57.91502067008556, 10)
    expect(result.status).toBe('neutral')
    expect(result.history).toHaveLength(6)
  })

  it('uses native addon result when native addon is available', async () => {
    mockLoadRustIndicatorsNative.mockReturnValue({
      available: true,
      addon: {
        calculateRsi: jest.fn().mockReturnValue({
          value: 12.34,
          status: 'oversold',
          history: [11.11, 11.22, 11.33, 11.44, 11.55, 12.34],
        }),
      },
    })

    const { RSIService } = await import('../services/rsi.service')

    const service = new RSIService()
    const prices = [
      44.34, 44.09, 44.15, 43.61, 44.33,
      44.83, 45.1, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28,
      46, 46.03, 46.41, 46.22, 45.64,
    ].map((value) => new Decimal(value))

    const result = service.calculateRSI(prices, 14)

    expect(result.value).toBe(12.34)
    expect(result.status).toBe('oversold')
    expect(result.history).toHaveLength(6)
    expect(result.divergences).toEqual([])
  })
})
