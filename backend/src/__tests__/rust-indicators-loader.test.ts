describe('rust native loader', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.RUST_INDICATORS_MODE
  })

  it('returns unavailable in ts-only mode without loading native addon', async () => {
    process.env.RUST_INDICATORS_MODE = 'ts-only'

    const { loadRustIndicatorsNative } = await import('../lib/rust-indicators/native-loader')
    const result = loadRustIndicatorsNative(() => {
      throw new Error('should not load native addon in ts-only mode')
    })

    expect(result.available).toBe(false)
    if (!result.available) {
      expect(result.reason).toBe('ts-only mode')
    }
  })

  it('falls back in auto mode when native addon cannot be loaded', async () => {
    process.env.RUST_INDICATORS_MODE = 'auto'

    const { loadRustIndicatorsNative } = await import('../lib/rust-indicators/native-loader')
    const result = loadRustIndicatorsNative(() => {
      throw new Error('native addon missing')
    })

    expect(result.available).toBe(false)
    if (!result.available) {
      expect(result.reason).toContain('native addon missing')
    }
  })

  it('throws in native-only mode when native addon cannot be loaded', async () => {
    process.env.RUST_INDICATORS_MODE = 'native-only'

    const { loadRustIndicatorsNative } = await import('../lib/rust-indicators/native-loader')

    expect(() =>
      loadRustIndicatorsNative(() => {
        throw new Error('native addon missing')
      })
    ).toThrow('native addon missing')
  })
})
