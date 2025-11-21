import Decimal from 'decimal.js'
import * as DecimalUtils from '../decimal-utils'

describe('Decimal Utilities', () => {
  describe('Basic arithmetic operations', () => {
    it('should add two numbers correctly', () => {
      const result = DecimalUtils.add(1.1, 2.2)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toString()).toBe('3.3')
    })

    it('should subtract two numbers correctly', () => {
      const result = DecimalUtils.subtract(5.5, 2.2)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toString()).toBe('3.3')
    })

    it('should multiply two numbers correctly', () => {
      const result = DecimalUtils.multiply(2.5, 4)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toString()).toBe('10')
    })

    it('should divide two numbers correctly', () => {
      const result = DecimalUtils.divide(10, 4)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toString()).toBe('2.5')
    })

    it('should throw error when dividing by zero', () => {
      expect(() => DecimalUtils.divide(10, 0)).toThrow('Division by zero')
    })
  })

  describe('Comparison operations', () => {
    it('should compare less than correctly', () => {
      expect(DecimalUtils.lessThan(1, 2)).toBe(true)
      expect(DecimalUtils.lessThan(2, 1)).toBe(false)
      expect(DecimalUtils.lessThan(1, 1)).toBe(false)
    })

    it('should compare less than or equal correctly', () => {
      expect(DecimalUtils.lessThanOrEqual(1, 2)).toBe(true)
      expect(DecimalUtils.lessThanOrEqual(1, 1)).toBe(true)
      expect(DecimalUtils.lessThanOrEqual(2, 1)).toBe(false)
    })

    it('should compare greater than correctly', () => {
      expect(DecimalUtils.greaterThan(2, 1)).toBe(true)
      expect(DecimalUtils.greaterThan(1, 2)).toBe(false)
      expect(DecimalUtils.greaterThan(1, 1)).toBe(false)
    })

    it('should compare greater than or equal correctly', () => {
      expect(DecimalUtils.greaterThanOrEqual(2, 1)).toBe(true)
      expect(DecimalUtils.greaterThanOrEqual(1, 1)).toBe(true)
      expect(DecimalUtils.greaterThanOrEqual(1, 2)).toBe(false)
    })

    it('should compare equality correctly', () => {
      expect(DecimalUtils.equals(1, 1)).toBe(true)
      expect(DecimalUtils.equals(1, 2)).toBe(false)
      expect(DecimalUtils.equals('1.0', '1.00')).toBe(true)
    })
  })

  describe('Utility functions', () => {
    it('should check if number is zero', () => {
      expect(DecimalUtils.isZero(0)).toBe(true)
      expect(DecimalUtils.isZero('0.00')).toBe(true)
      expect(DecimalUtils.isZero(1)).toBe(false)
    })

    it('should check if number is positive', () => {
      expect(DecimalUtils.isPositive(1)).toBe(true)
      // Note: Decimal.js considers 0 as positive (non-negative)
      expect(DecimalUtils.isPositive(0)).toBe(true)
      expect(DecimalUtils.isPositive(-1)).toBe(false)
    })

    it('should check if number is negative', () => {
      expect(DecimalUtils.isNegative(-1)).toBe(true)
      expect(DecimalUtils.isNegative(0)).toBe(false)
      expect(DecimalUtils.isNegative(1)).toBe(false)
    })

    it('should get absolute value', () => {
      expect(DecimalUtils.abs(-5).toString()).toBe('5')
      expect(DecimalUtils.abs(5).toString()).toBe('5')
      expect(DecimalUtils.abs(0).toString()).toBe('0')
    })

    it('should round to specified decimal places', () => {
      expect(DecimalUtils.round(1.2345, 2).toString()).toBe('1.23')
      expect(DecimalUtils.round(1.2355, 2).toString()).toBe('1.24')
      expect(DecimalUtils.round(1.2345).toString()).toBe('1.23') // default 2 places
    })

    it('should convert to number', () => {
      const decimal = new Decimal('123.45')
      expect(DecimalUtils.toNumber(decimal)).toBe(123.45)
      expect(typeof DecimalUtils.toNumber(decimal)).toBe('number')
    })

    it('should convert to string', () => {
      const decimal = new Decimal('123.45')
      expect(DecimalUtils.toString(decimal)).toBe('123.45')
      expect(typeof DecimalUtils.toString(decimal)).toBe('string')
    })

    it('should create Decimal from value', () => {
      const decimal = DecimalUtils.fromValue(123.45)
      expect(decimal).toBeInstanceOf(Decimal)
      expect(decimal.toString()).toBe('123.45')
    })
  })

  describe('Financial calculation examples', () => {
    it('should calculate stock cost correctly', () => {
      // Buy 100 shares at $50.25 each
      const quantity = 100
      const price = 50.25
      const cost = DecimalUtils.multiply(quantity, price)
      
      expect(cost.toString()).toBe('5025')
    })

    it('should calculate profit/loss correctly', () => {
      // Buy at $100, sell at $150, quantity 10
      const buyPrice = 100
      const sellPrice = 150
      const quantity = 10
      
      const cost = DecimalUtils.multiply(buyPrice, quantity)
      const revenue = DecimalUtils.multiply(sellPrice, quantity)
      const profit = DecimalUtils.subtract(revenue, cost)
      
      expect(profit.toString()).toBe('500')
    })

    it('should calculate average cost correctly', () => {
      // Total cost $5000, quantity 100 shares
      const totalCost = 5000
      const quantity = 100
      const avgCost = DecimalUtils.divide(totalCost, quantity)
      
      expect(avgCost.toString()).toBe('50')
    })

    it('should handle floating-point precision issues', () => {
      // Classic floating-point problem: 0.1 + 0.2 !== 0.3
      const result = DecimalUtils.add(0.1, 0.2)
      expect(result.toString()).toBe('0.3')
      
      // JavaScript float would give: 0.30000000000000004
      const floatResult = 0.1 + 0.2
      expect(floatResult).not.toBe(0.3)
    })
  })
})
