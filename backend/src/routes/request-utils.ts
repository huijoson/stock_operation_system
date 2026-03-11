import { Request } from 'express'

export function getPathParam(req: Request, key: string): string | undefined {
  const value = req.params[key]

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return undefined
}

export function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key]

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return undefined
}
