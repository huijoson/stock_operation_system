import Decimal from 'decimal.js'

/**
 * Decimal utility functions for high-precision financial calculations
 * 
 * These utilities wrap Decimal.js operations to provide a consistent
 * interface for financial calculations throughout the application.
 * 
 * All monetary calculations should use these utilities to avoid
 * floating-point precision errors.
 */

/**
 * Add two decimal numbers
 * @param a First number
 * @param b Second number
 * @returns Sum as Decimal
 */
export function add(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).plus(b)
}

/**
 * Subtract two decimal numbers
 * @param a First number (minuend)
 * @param b Second number (subtrahend)
 * @returns Difference as Decimal
 */
export function subtract(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).minus(b)
}

/**
 * Multiply two decimal numbers
 * @param a First number
 * @param b Second number
 * @returns Product as Decimal
 */
export function multiply(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).mul(b)
}

/**
 * Divide two decimal numbers
 * @param a Dividend
 * @param b Divisor
 * @returns Quotient as Decimal
 * @throws Error if divisor is zero
 */
export function divide(a: Decimal.Value, b: Decimal.Value): Decimal {
  const divisor = new Decimal(b)
  if (divisor.isZero()) {
    throw new Error('Division by zero')
  }
  return new Decimal(a).div(divisor)
}

/**
 * Compare if first number is less than second
 * @param a First number
 * @param b Second number
 * @returns true if a < b
 */
export function lessThan(a: Decimal.Value, b: Decimal.Value): boolean {
  return new Decimal(a).lessThan(b)
}

/**
 * Compare if first number is less than or equal to second
 * @param a First number
 * @param b Second number
 * @returns true if a <= b
 */
export function lessThanOrEqual(a: Decimal.Value, b: Decimal.Value): boolean {
  return new Decimal(a).lessThanOrEqualTo(b)
}

/**
 * Compare if first number is greater than second
 * @param a First number
 * @param b Second number
 * @returns true if a > b
 */
export function greaterThan(a: Decimal.Value, b: Decimal.Value): boolean {
  return new Decimal(a).greaterThan(b)
}

/**
 * Compare if first number is greater than or equal to second
 * @param a First number
 * @param b Second number
 * @returns true if a >= b
 */
export function greaterThanOrEqual(
  a: Decimal.Value,
  b: Decimal.Value
): boolean {
  return new Decimal(a).greaterThanOrEqualTo(b)
}

/**
 * Compare if two numbers are equal
 * @param a First number
 * @param b Second number
 * @returns true if a === b
 */
export function equals(a: Decimal.Value, b: Decimal.Value): boolean {
  return new Decimal(a).equals(b)
}

/**
 * Check if a number is zero
 * @param a Number to check
 * @returns true if a === 0
 */
export function isZero(a: Decimal.Value): boolean {
  return new Decimal(a).isZero()
}

/**
 * Check if a number is positive
 * @param a Number to check
 * @returns true if a > 0
 */
export function isPositive(a: Decimal.Value): boolean {
  return new Decimal(a).isPositive()
}

/**
 * Check if a number is negative
 * @param a Number to check
 * @returns true if a < 0
 */
export function isNegative(a: Decimal.Value): boolean {
  return new Decimal(a).isNegative()
}

/**
 * Get absolute value of a number
 * @param a Number
 * @returns Absolute value as Decimal
 */
export function abs(a: Decimal.Value): Decimal {
  return new Decimal(a).abs()
}

/**
 * Round a number to specified decimal places
 * @param a Number to round
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Rounded value as Decimal
 */
export function round(a: Decimal.Value, decimalPlaces: number = 2): Decimal {
  return new Decimal(a).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP)
}

/**
 * Convert Decimal to number (use with caution - may lose precision)
 * @param a Decimal value
 * @returns Number representation
 */
export function toNumber(a: Decimal): number {
  return a.toNumber()
}

/**
 * Convert Decimal to string
 * @param a Decimal value
 * @returns String representation
 */
export function toString(a: Decimal): string {
  return a.toString()
}

/**
 * Create a Decimal from a value
 * @param value Number, string, or Decimal
 * @returns Decimal instance
 */
export function fromValue(value: Decimal.Value): Decimal {
  return new Decimal(value)
}
