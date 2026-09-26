import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AppEnv } from './types/env'
import { errorHandler } from './middleware'
import { postRoutes } from './routes'
import homePage from './pages/home'
import postPage from './pages/post'
import archivePage from './pages/archive'
import aboutPage from './pages/about'

const app = new Hono<AppEnv>()

// 全局中间件
app.use('*', logger())

// API 路由 (带 CORS)
const api = new Hono<AppEnv>()
api.use('*', cors())
api.route('/posts', postRoutes)
app.route('/api', api)

// 页面路由 (SSR)
app.route('/', homePage)
app.route('/posts', postPage)
app.route('/archive', archivePage)
app.route('/about', aboutPage)

// 错误处理
app.onError(errorHandler)

// 404 处理
app.notFound((c) => {
  return c.html(
    `<!DOCTYPE html>
    <html><head><title>404</title></head>
    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
      <div style="text-align:center">
        <h1 style="font-size:4rem;margin:0">404</h1>
        <p>页面不存在</p>
        <a href="/" style="color:#6366f1">返回首页</a>
      </div>
    </body></html>`,
    404
  )
})

export default app
