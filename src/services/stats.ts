let isTablesInitialized = false

/**
 * 确保 D1 统计表结构已初始化（自动建表）
 */
export async function ensureStatsTables(db: D1Database): Promise<void> {
  if (isTablesInitialized) return

  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS page_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT NOT NULL,
          url TEXT NOT NULL,
          referrer TEXT,
          user_agent TEXT,
          ip_hash TEXT,
          country TEXT,
          session_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_page_views_slug ON page_views(slug)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(slug, session_id)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_page_views_ip ON page_views(slug, ip_hash)`),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS post_stats (
          slug TEXT PRIMARY KEY,
          views INTEGER NOT NULL DEFAULT 0,
          uv INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_post_stats_views ON post_stats(views DESC)`),
    ])
    isTablesInitialized = true
  } catch (err) {
    console.warn('初始化 D1 统计表失败（可能表已存在或权限限制）:', err)
  }
}

/**
 * 参考 Umami 的匿名化哈希算法：基于当日 Salt 与客户端特征计算，绝不直接存储用户真实 IP
 */
async function generateIpHash(ip: string, userAgent: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const encoder = new TextEncoder()
  const data = encoder.encode(`${ip}|${userAgent}|${today}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export interface PageViewInput {
  slug: string
  url: string
  referrer?: string
  userAgent?: string
  ip?: string
  country?: string
  sessionId?: string
}

export interface PostStat {
  slug: string
  views: number
  uv: number
}

/**
 * 记录一次页面访问（参考 Umami 访问统计与去重机制）
 */
export async function recordPageView(
  db: D1Database | undefined,
  input: PageViewInput
): Promise<{ views: number; uv: number }> {
  if (!db) {
    return { views: 1, uv: 1 }
  }

  await ensureStatsTables(db)

  const slug = input.slug.trim()
  if (!slug) {
    return { views: 0, uv: 0 }
  }

  const url = input.url || `/posts/${encodeURIComponent(slug)}`
  const referrer = (input.referrer || '').slice(0, 255)
  const userAgent = (input.userAgent || '').slice(0, 255)
  const country = (input.country || '').slice(0, 10)
  const sessionId = (input.sessionId || '').slice(0, 64)
  const ipHash = await generateIpHash(input.ip || '127.0.0.1', userAgent)

  // 1. 判断是否属于 30 分钟内的同会话/同 IP 重复访问（Umami 风格 UV 去重）
  let isNewUv = 1
  try {
    const existing = await db
      .prepare(
        `SELECT id FROM page_views 
         WHERE slug = ? 
           AND (session_id = ? OR (ip_hash = ? AND datetime(created_at, '+30 minutes') > datetime('now'))) 
         LIMIT 1`
      )
      .bind(slug, sessionId || '__no_session__', ipHash)
      .first()

    if (existing) {
      isNewUv = 0
    }
  } catch (e) {
    // 忽略检测错误，默认按新访问计算
  }

  // 2. 写入明细表与原子更新聚合统计表
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO page_views (slug, url, referrer, user_agent, ip_hash, country, session_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(slug, url, referrer, userAgent, ipHash, country, sessionId),
      db
        .prepare(
          `INSERT INTO post_stats (slug, views, uv, updated_at)
           VALUES (?1, 1, ?2, datetime('now'))
           ON CONFLICT(slug) DO UPDATE SET
             views = views + 1,
             uv = uv + ?2,
             updated_at = datetime('now')`
        )
        .bind(slug, isNewUv),
    ])

    // 查询最新数据
    const stat = await db
      .prepare(`SELECT views, uv FROM post_stats WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first<{ views: number; uv: number }>()

    return {
      views: stat?.views || 1,
      uv: stat?.uv || 1,
    }
  } catch (err) {
    console.error('记录访问统计失败:', err)
    return { views: 1, uv: 1 }
  }
}

/**
 * 获取访问量最高的前 N 篇文章（供首页置顶与排行榜）
 */
export async function getTopPosts(
  db: D1Database | undefined,
  limit = 3
): Promise<PostStat[]> {
  if (!db) return []

  try {
    await ensureStatsTables(db)

    const results = await db
      .prepare(
        `SELECT slug, views, uv FROM post_stats 
         WHERE views > 0 
         ORDER BY views DESC, uv DESC 
         LIMIT ?`
      )
      .bind(limit)
      .all<PostStat>()

    return results.results || []
  } catch (err) {
    console.warn('查询热门文章失败:', err)
    return []
  }
}

/**
 * 获取单篇文章的访问统计
 */
export async function getPostStats(
  db: D1Database | undefined,
  slug: string
): Promise<{ views: number; uv: number }> {
  if (!db || !slug) return { views: 0, uv: 0 }

  try {
    await ensureStatsTables(db)

    const stat = await db
      .prepare(`SELECT views, uv FROM post_stats WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first<{ views: number; uv: number }>()

    return {
      views: stat?.views || 0,
      uv: stat?.uv || 0,
    }
  } catch (err) {
    return { views: 0, uv: 0 }
  }
}

/**
 * 批量获取文章的访问统计映射
 */
export async function getAllPostStats(
  db: D1Database | undefined
): Promise<Record<string, { views: number; uv: number }>> {
  if (!db) return {}

  try {
    await ensureStatsTables(db)

    const results = await db
      .prepare(`SELECT slug, views, uv FROM post_stats`)
      .all<PostStat>()

    const map: Record<string, { views: number; uv: number }> = {}
    for (const item of results.results || []) {
      map[item.slug] = { views: item.views, uv: item.uv }
    }
    return map
  } catch (err) {
    return {}
  }
}
