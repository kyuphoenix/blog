import { Context } from 'hono'

export const success = <T>(c: Context, data: T, message = 'Success') => {
  return c.json({
    success: true,
    message,
    data,
  })
}

export const paginated = <T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  pageSize: number
) => {
  return c.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
    },
  })
}

export const fail = (c: Context, message: string, status: number = 400) => {
  return c.json({ success: false, message }, status as any)
}
