import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { recordPageView, getTopPosts, getPostStats } from '../services/stats'

const stats = new Hono<AppEnv>()

// 常见搜索引擎蜘蛛与爬虫 UA 过滤（参考 Umami 实现：防止机器刷量）
const BOT_UA_REGEX =
  /(bot|spider|crawl|slurp|googlebot|bingbot|yandex|baidu|duckduck|facebookexternalhit|whatsapp|twitterbot|slackbot|applebot)/i

/**
 * 收集页面访问（支持前端 Beacon 或 fetch POST 调用）
 */
stats.post('/view', async (c) => {
  const userAgent = c.req.header('user-agent') || ''

  // 1. 过滤爬虫
  if (BOT_UA_REGEX.test(userAgent)) {
    return c.json({ success: true, message: 'Ignored bot' })
  }

  try {
    const body = await c.req.json().catch(() => ({}))
    const slug = (body.slug || '').trim()

    if (!slug) {
      return c.json({ success: false, message: 'Missing slug' }, 400)
    }

    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      '127.0.0.1'
    const country = c.req.header('cf-ipcountry') || ''

    const result = await recordPageView(c.env.DB, {
      slug,
      url: body.url || '',
      referrer: body.referrer || '',
      userAgent,
      ip,
      country,
      sessionId: body.sessionId || '',
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

/**
 * 获取访问量最高的前 N 篇文章
 */
stats.get('/top', async (c) => {
  const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '3', 10)))
  const data = await getTopPosts(c.env.DB, limit)
  return c.json({ success: true, data })
})

/**
 * 获取指定文章的访问统计
 */
stats.get('/post', async (c) => {
  const slug = c.req.query('slug') || ''
  if (!slug) {
    return c.json({ success: false, message: 'Missing slug' }, 400)
  }
  const data = await getPostStats(c.env.DB, slug)
  return c.json({ success: true, data })
})

export default stats
