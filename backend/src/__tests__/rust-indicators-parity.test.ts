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

describe('MACDService native parity', () => {
  beforeEach(() => {
    jest.resetModules()
    mockLoadRustIndicatorsNative.mockReset()
  })

  it('falls back to TypeScript implementation when native addon is unavailable', async () => {
    mockLoadRustIndicatorsNative.mockReturnValue({
      available: false,
      reason: 'missing addon',
    })

    const { MACDService } = await import('../services/macd.service')

    const service = new MACDService()
    const prices = Array.from({ length: 50 }, (_, index) => 100 + index * 0.5)
    const result = service.calculateMACD(prices, 12, 26, 9)

    expect(result.macdLine).toHaveLength(17)
    expect(result.signalLine).toHaveLength(17)
    expect(result.histogram).toHaveLength(17)
    expect(result.currentSignal).toBe('neutral')
  })

  it('uses native addon result when native addon is available', async () => {
    mockLoadRustIndicatorsNative.mockReturnValue({
      available: true,
      addon: {
        calculateMacd: jest.fn().mockReturnValue({
          macdLine: [1.1, 1.2, 1.3],
          signalLine: [0.9, 1.0, 1.1],
          histogram: [0.2, 0.2, 0.2],
          crossovers: [
            {
              type: 'golden',
              index: 1,
              macdValue: 1.2,
              signalValue: 1.0,
            },
          ],
          currentSignal: 'bullish',
        }),
      },
    })

    const { MACDService } = await import('../services/macd.service')

    const service = new MACDService()
    const prices = Array.from({ length: 50 }, (_, index) => new Decimal(100 + index * 0.5))
    const result = service.calculateMACD(prices, 12, 26, 9)

    expect(result.macdLine).toEqual([1.1, 1.2, 1.3])
    expect(result.signalLine).toEqual([0.9, 1.0, 1.1])
    expect(result.histogram).toEqual([0.2, 0.2, 0.2])
    expect(result.crossovers).toHaveLength(1)
    expect(result.crossovers[0].type).toBe('golden')
    expect(result.currentSignal).toBe('bullish')
  })
})
