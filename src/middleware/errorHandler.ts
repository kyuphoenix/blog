import { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AppEnv } from '../types/env'

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error(`[Error] ${err.message}`, err.stack)

  if (err instanceof HTTPException) {
    return c.json(
      { success: false, message: err.message },
      err.status
    )
  }

  return c.json(
    { success: false, message: 'Internal Server Error' },
    500
  )
}
