import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AppEnv } from './types/env'
import { errorHandler } from './middleware'
import { postRoutes, statsRoutes } from './routes'
import homePage from './pages/home'
import postPage from './pages/post'
import archivePage from './pages/archive'
import aboutPage from './pages/about'
import linksPage from './pages/links'
import { getManifest } from './services/github'
import { blogConfig } from './blog.config'
import { giscusLightCss, giscusDarkCss } from './styles/giscusTheme'

const app = new Hono<AppEnv>()

// 全局中间件
app.use('*', logger())

// Giscus 自定义主题样式路由（附带 CORS 响应头，确保 giscus.app iframe 可以跨域加载）
app.get('/css/giscus-fuwari-light.css', (c) => {
  return c.text(giscusLightCss, 200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })
})

app.get('/css/giscus-fuwari-dark.css', (c) => {
  return c.text(giscusDarkCss, 200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })
})

app.get('/css/giscus-fuwari.css', (c) => {
  return c.text(giscusLightCss, 200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })
})

// API 路由 (带 CORS)
const api = new Hono<AppEnv>()
api.use('*', cors())
api.route('/posts', postRoutes)
api.route('/stats', statsRoutes)
app.route('/api', api)

// RSS 2.0 订阅源 (动态使用 Worker 环境变量 BLOG_URL)
app.get('/rss.xml', async (c) => {
  const manifest = (await getManifest(c.env)).filter((p) => !p.draft)
  const baseUrl = (c.env.BLOG_URL || '').replace(/\/$/, '') || new URL(c.req.url).origin

  const items = manifest
    .slice(0, 20)
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/posts/${encodeURIComponent(post.title)}</link>
      <guid isPermaLink="true">${baseUrl}/posts/${encodeURIComponent(post.title)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt || post.title}]]></description>
      <category>${post.category}</category>
    </item>`
    )
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${blogConfig.title}</title>
    <link>${baseUrl}</link>
    <description>${blogConfig.description}</description>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return c.text(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
  })
})

// 页面路由 (SSR)
app.route('/', homePage)
app.route('/posts', postPage)
app.route('/archive', archivePage)
app.route('/links', linksPage)
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
