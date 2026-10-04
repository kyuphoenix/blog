import { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../types/env.js'

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error(`[Error] ${err.message}`, err.stack)

  if (err instanceof HTTPException) {
    return c.json(
      { success: false, message: err.message },
      err.status
    )
  }

  const isHtml = c.req.header('Accept')?.includes('text/html')
  if (isHtml) {
    return c.html(
      `<!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <title>500 - 服务内部错误</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background-color:#fafafa;color:#333;">
          <div style="text-align:center">
            <h1 style="font-size:4rem;margin:0;color:#ef4444">500</h1>
            <p style="font-size:1.125rem;margin:1rem 0">服务器内部发生错误，请稍后重试</p>
            <a href="/" style="display:inline-block;padding:0.5rem 1.25rem;background-color:#6366f1;color:#fff;border-radius:0.5rem;text-decoration:none;font-weight:500;">返回首页</a>
          </div>
        </body>
      </html>`,
      500
    )
  }

  return c.json(
    { success: false, message: 'Internal Server Error' },
    500
  )
}
