import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AppEnv } from './types/env.js'
import { errorHandler } from './middleware/index.js'
import { postRoutes, statsRoutes } from './routes/index.js'
import homePage from './pages/home.js'
import postPage from './pages/post.js'
import archivePage from './pages/archive.js'
import aboutPage from './pages/about.js'
import linksPage from './pages/links.js'
import { getManifest, getBlogConfig } from './services/github.js'
import { giscusLightCss, giscusDarkCss } from './styles/giscusTheme.js'
import { tailwindCss, tailwindVersion } from './styles/tailwindBundle.js'
import { swupClientJs, swupClientVersion } from './scripts/swupBundle.js'
import { sitemapXsl } from './styles/sitemapXsl.js'
import { setTieredCache } from './utils/cache.js'
import { i18n, I18nKey, getHtmlLang } from './i18n/index.js'

const app = new Hono<AppEnv>()

// 全局中间件
app.use('*', logger())

// 多平台环境兼容适配中间件：确保在 Vercel / Node.js 环境下 process.env 能无缝透传到 c.env
app.use('*', async (c, next) => {
  if (typeof process !== 'undefined' && process.env) {
    c.env = { ...process.env, ...(c.env || {}) } as any
  }
  await next()
})

// 全局末尾斜杠容错中间件：若任何页面请求因末尾带有 / 导致 404，自动 301 重定向去除末尾斜杠
app.use('*', async (c, next) => {
  await next()
  if (
    c.res.status === 404 &&
    (c.req.method === 'GET' || c.req.method === 'HEAD') &&
    c.req.path !== '/' &&
    c.req.path.endsWith('/')
  ) {
    const url = new URL(c.req.url)
    const cleanPath = url.pathname.replace(/\/+$/, '')
    return (c.res = c.redirect(`${cleanPath}${url.search}`, 301))
  }
})

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

// 生产级静态 Tailwind CSS 样式表路由
app.get('/css/tailwind.css', (c) => {
  const version = c.req.query('v')
  const cacheControl = version
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800, must-revalidate'

  return c.text(tailwindCss, 200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': cacheControl,
    'ETag': `"${tailwindVersion}"`,
  })
})

// 客户端无缝切换引擎与交互脚本 (Swup + Lightbox)
app.get('/js/swup.js', (c) => {
  const version = c.req.query('v')
  const cacheControl = version
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800, must-revalidate'

  return c.body(swupClientJs, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': cacheControl,
    'ETag': `"${swupClientVersion}"`,
  })
})

// Sitemap.xml 可视化 XSL 样式表
app.get('/sitemap.xsl', (c) => {
  return c.text(sitemapXsl, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
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
  const owner = env.GH_OWNER || env.GITHUB_OWNER
  const repo = env.GH_REPO || env.GITHUB_REPO
  if (!owner || !repo || owner.startsWith('<')) {
    return c.notFound()
  }

  // 3. 从 GitHub Raw 拉取最新的图片资源
  const branch = (env.GH_BRANCH || env.GITHUB_BRANCH || 'main').trim()
  const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/images/${encodeURI(imagePath)}`

  const headers: Record<string, string> = {
    'User-Agent': 'Blog-Worker-Image-Proxy',
  }
  const token = env.GH_TOKEN || env.PAT_TOKEN || env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `token ${token}`
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
  const manifest = manifestRaw.filter(
    (p) => p.draft !== true && (p.draft as any) !== 'true'
  )
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
    <title><![CDATA[${siteConfig.title}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${siteConfig.description}]]></description>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  setTieredCache(c, { browserMaxAge: 0, edgeMaxAge: 3600, swrMaxAge: 86400, tags: ['rss'] })

  return c.text(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
  })
})

// RSS 订阅源兼容别名 (/feed, /feed.xml, /atom.xml)
app.get('/feed', (c) => c.redirect('/rss.xml', 301))
app.get('/feed.xml', (c) => c.redirect('/rss.xml', 301))
app.get('/atom.xml', (c) => c.redirect('/rss.xml', 301))

/**
 * 转义 XML 实体，防止破坏 XML 格式标准 (&, <, >, ", ')
 */
function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Sitemap.xml 站点地图生成 (支持 Google, Bing, 百度等全搜索引擎收录标准)
app.get('/sitemap.xml', async (c) => {
  const manifest = (await getManifest(c.env)).filter(
    (p) => p.draft !== true && (p.draft as any) !== 'true'
  )
  const baseUrl = (c.env.BLOG_URL || '').replace(/\/$/, '') || new URL(c.req.url).origin

  // 1. 固定页面配置（首页、友链）
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/links', changefreq: 'monthly', priority: '0.7' },
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
      const safeTitle = (post.title || '').replace(/\]\]>/g, ']]&gt;')
      const safeCaption = (post.excerpt || post.title || '').replace(/\]\]>/g, ']]&gt;')
      imageXml = `\n    <image:image>
      <image:loc>${escapeXml(coverUrl)}</image:loc>
      <image:title><![CDATA[${safeTitle}]]></image:title>
      <image:caption><![CDATA[${safeCaption}]]></image:caption>
    </image:image>`
    }

    return `  <url>
    <loc>${escapeXml(`${baseUrl}/posts/${encodeURIComponent(post.title)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imageXml}
  </url>`
  })

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticPages
  .map(
    (p) => `  <url>
    <loc>${escapeXml(`${baseUrl}${p.url}`)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
${articlePages.join('\n')}
</urlset>`

  setTieredCache(c, { browserMaxAge: 0, edgeMaxAge: 3600, swrMaxAge: 86400, tags: ['sitemap'] })

  return c.text(sitemapXml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
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
  setTieredCache(c, { browserMaxAge: 86400, edgeMaxAge: 604800, swrMaxAge: 604800, tags: ['robots'] })

  return c.text(robotsTxt, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
})

// 兼容 /post 与 /post/* 路径，自动 301 重定向到 /posts
app.get('/post', (c) => {
  const url = new URL(c.req.url)
  return c.redirect(`/posts${url.search}`, 301)
})
app.get('/post/*', (c) => {
  const url = new URL(c.req.url)
  const cleanPath = url.pathname.replace(/^\/post\/?/, '/posts/').replace(/\/+$/, '')
  return c.redirect(`${cleanPath || '/posts'}${url.search}`, 301)
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
app.notFound(async (c) => {
  const config = await getBlogConfig(c.env)
  const lang = config.lang
  const title = i18n(I18nKey.pageNotFound, lang)
  const desc = i18n(I18nKey.pageNotFoundDesc, lang)
  const back = i18n(I18nKey.backToHome, lang)
  const htmlLang = getHtmlLang(lang)

  return c.html(
    `<!DOCTYPE html>
    <html lang="${htmlLang}">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background-color:#fafafa;color:#333;">
        <div style="text-align:center">
          <h1 style="font-size:4rem;margin:0;color:#6366f1">404</h1>
          <p style="font-size:1.125rem;margin:1rem 0">${desc}</p>
          <a href="/" style="display:inline-block;padding:0.5rem 1.25rem;background-color:#6366f1;color:#fff;border-radius:0.5rem;text-decoration:none;font-weight:500;">${back}</a>
        </div>
      </body>
    </html>`,
    404
  )
})

export default app
