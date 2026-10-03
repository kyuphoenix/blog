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
import { getManifest, getBlogConfig } from './services/github'
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

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'svg':
      return 'image/svg+xml'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'ico':
      return 'image/x-icon'
    case 'avif':
      return 'image/avif'
    default:
      return 'application/octet-stream'
  }
}

// 媒体图片动态边缘代理与缓存路由（支持 Pages CMS 上传新图片后无需重新部署 Worker 即可全球 CDN 加速访问）
app.get('/images/:path{.+}', async (c) => {
  const imagePath = c.req.param('path')

  // 1. 优先尝试从 Cloudflare 原生 Cache API 读取
  let cache: any = null
  try {
    // @ts-ignore
    if (typeof caches !== 'undefined' && caches.default) {
      // @ts-ignore
      cache = caches.default
      const cachedRes = await cache.match(c.req.raw)
      if (cachedRes) {
        return cachedRes
      }
    }
  } catch {
    // 忽略异常
  }

  // 2. 检查 GitHub 配置（兼容 Cloudflare c.env、Vercel process.env 与 Netlify Deno.env）
  const env: any = {
    ...(typeof process !== 'undefined' ? process.env : {}),
    ...(c.env || {}),
  }
  if (!env.GITHUB_OWNER || !env.GITHUB_REPO || env.GITHUB_OWNER.startsWith('<')) {
    return c.notFound()
  }

  // 3. 从 GitHub Raw 拉取最新的图片资源
  const branch = env.GITHUB_BRANCH && env.GITHUB_BRANCH.trim() ? env.GITHUB_BRANCH.trim() : 'main'
  const githubUrl = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${branch}/public/images/${encodeURI(imagePath)}`

  const headers: Record<string, string> = {
    'User-Agent': 'Blog-Worker-Image-Proxy',
  }
  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${env.GITHUB_TOKEN}`
  }

  try {
    const res = await fetch(githubUrl, { headers })
    if (!res.ok) {
      return c.notFound()
    }

    const contentType = res.headers.get('content-type') || getMimeType(imagePath)
    const imageBytes = await res.arrayBuffer()

    const response = new Response(imageBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, s-maxage=2592000',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=2592000',
        'Access-Control-Allow-Origin': '*',
        'ETag': res.headers.get('etag') || `"${imageBytes.byteLength}"`,
      },
    })

    // 4. 写入 Cloudflare 边缘缓存
    if (cache && c.executionCtx) {
      try {
        c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()))
      } catch {
        // 忽略写入缓存异常
      }
    }

    return response
  } catch (err) {
    console.error('Failed to fetch image from GitHub:', err)
    return c.notFound()
  }
})

// 根路径 /favicon.ico 自动回退
app.get('/favicon.ico', async (c) => {
  const siteConfig = await getBlogConfig(c.env)
  const iconPath = siteConfig.icons?.faviconIco || '/images/favicon.ico'
  return c.redirect(iconPath, 302)
})

// API 路由 (带 CORS)
const api = new Hono<AppEnv>()
api.use('*', cors())
api.route('/posts', postRoutes)
api.route('/stats', statsRoutes)
app.route('/api', api)

// RSS 2.0 订阅源 (动态使用 Worker 环境变量 BLOG_URL)
app.get('/rss.xml', async (c) => {
  const [manifestRaw, siteConfig] = await Promise.all([
    getManifest(c.env),
    getBlogConfig(c.env),
  ])
  const manifest = manifestRaw.filter((p) => !p.draft)
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
    <title>${siteConfig.title}</title>
    <link>${baseUrl}</link>
    <description>${siteConfig.description}</description>
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

  // 2. 提取所有已发布文章页面（支持 Google Image Sitemap 扩展）
  const articlePages = manifest.map((post) => {
    let lastmod = ''
    try {
      lastmod = new Date(post.updated || post.date).toISOString()
    } catch {
      lastmod = new Date().toISOString()
    }

    let imageXml = ''
    if (post.cover) {
      const coverUrl = post.cover.startsWith('http')
        ? post.cover
        : `${baseUrl}${post.cover.startsWith('/') ? '' : '/'}${post.cover}`
      imageXml = `\n    <image:image>
      <image:loc>${coverUrl}</image:loc>
      <image:title><![CDATA[${post.title}]]></image:title>
      <image:caption><![CDATA[${post.excerpt || post.title}]]></image:caption>
    </image:image>`
    }

    return `  <url>
    <loc>${baseUrl}/posts/${encodeURIComponent(post.title)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imageXml}
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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

// 404 处理 (添加 noindex, nofollow 防止搜索引擎将 404 错误页收录)
app.notFound((c) => {
  return c.html(
    `<!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>404 - 页面未找到</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background-color:#fafafa;color:#333;">
        <div style="text-align:center">
          <h1 style="font-size:4rem;margin:0;color:#6366f1">404</h1>
          <p style="font-size:1.125rem;margin:1rem 0">抱歉，您访问的页面不存在或已被移除</p>
          <a href="/" style="display:inline-block;padding:0.5rem 1.25rem;background-color:#6366f1;color:#fff;border-radius:0.5rem;text-decoration:none;font-weight:500;">返回首页</a>
        </div>
      </body>
    </html>`,
    404
  )
})

export default app
