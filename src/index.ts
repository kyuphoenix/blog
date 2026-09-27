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
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  })
})

// RSS 订阅源兼容别名 (/feed, /feed.xml, /atom.xml)
app.get('/feed', (c) => c.redirect('/rss.xml', 301))
app.get('/feed.xml', (c) => c.redirect('/rss.xml', 301))
app.get('/atom.xml', (c) => c.redirect('/rss.xml', 301))

// Sitemap.xml 站点地图生成 (支持 Google, Bing, 百度等全搜索引擎收录标准)
app.get('/sitemap.xml', async (c) => {
  const manifest = (await getManifest(c.env)).filter((p) => !p.draft)
  const baseUrl = (c.env.BLOG_URL || '').replace(/\/$/, '') || new URL(c.req.url).origin

  // 1. 固定页面配置（首页、归档、友链、关于）
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/archive', changefreq: 'weekly', priority: '0.8' },
    { url: '/links', changefreq: 'monthly', priority: '0.7' },
    { url: '/about', changefreq: 'monthly', priority: '0.7' },
  ]

  // 2. 提取所有已发布文章页面
  const articlePages = manifest.map((post) => {
    let lastmod = ''
    try {
      lastmod = new Date(post.updated || post.date).toISOString()
    } catch {
      lastmod = new Date().toISOString()
    }
    return `  <url>
    <loc>${baseUrl}/posts/${encodeURIComponent(post.title)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
  })

  // 3. 提取所有分类与标签聚合页面
  const categorySet = new Set<string>()
  const tagSet = new Set<string>()
  manifest.forEach((p) => {
    if (p.category) categorySet.add(p.category)
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t) => tagSet.add(t))
    }
  })

  const categoryPages = Array.from(categorySet).map(
    (cat) => `  <url>
    <loc>${baseUrl}/?category=${encodeURIComponent(cat)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  )

  const tagPages = Array.from(tagSet).map(
    (tag) => `  <url>
    <loc>${baseUrl}/?tag=${encodeURIComponent(tag)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (p) => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
${articlePages.join('\n')}
${categoryPages.join('\n')}
${tagPages.join('\n')}
</urlset>`

  return c.text(sitemapXml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  })
})

// robots.txt 搜索引擎爬虫协议 (告知抓取范围与 Sitemap 路径)
app.get('/robots.txt', (c) => {
  const baseUrl = (c.env.BLOG_URL || '').replace(/\/$/, '') || new URL(c.req.url).origin
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`
  return c.text(robotsTxt, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
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
