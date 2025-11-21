import * as fc from 'fast-check'

describe('Property-Based Testing Setup', () => {
  it('should have fast-check configured correctly', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n
      }),
      { numRuns: 100 }
    )
  })

  it('should generate random strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return typeof s === 'string'
      }),
      { numRuns: 100 }
    )
  })
})
