import type { DatabaseClient, PageViewInput, PostStat } from './types.js'
import type { Storage } from '../storage.js'

export interface UmamiClientOptions {
  host?: string
  websiteId?: string
  apiKey?: string
  storage?: Storage
  enableScript?: boolean
}

/**
 * Umami 统计客户端实现：
 * 1. 采用 Umami 官方 REST API 与 /api/send 事件规范
 * 2. 完美适配 Umami Cloud (cloud.umami.is / api.umami.is) 与 自建私有化部署 (Self-hosted)
 * 3. 支持聚合查询全部文章阅读量、单篇阅读量、热门排行榜
 * 4. 内置内存/KV 智能分层缓存（默认 60s），避免边缘函数高频请求 Umami 上游服务
 */
export class UmamiDatabaseClient implements DatabaseClient {
  readonly type = 'umami' as const
  private host: string
  private apiBase: string
  private websiteId: string
  private apiKey: string
  private storage?: Storage
  private enableScript: boolean

  constructor(options: UmamiClientOptions) {
    const rawHost = (options.host || 'https://cloud.umami.is').trim().replace(/\/+$/, '')
    this.host = rawHost.startsWith('http://') || rawHost.startsWith('https://') ? rawHost : `https://${rawHost}`

    // 自动兼容 /api 与 /v1 路径
    if (this.host.endsWith('/api') || this.host.endsWith('/v1')) {
      this.apiBase = this.host
    } else if (this.host.includes('api.umami.is')) {
      this.apiBase = `${this.host}/v1`
    } else {
      this.apiBase = `${this.host}/api`
    }

    this.websiteId = (options.websiteId || '').trim()
    this.apiKey = (options.apiKey || '').trim()
    this.storage = options.storage
    this.enableScript = options.enableScript ?? true
  }

  /**
   * 生成针对 Umami API 请求的通用标头
   * 同时携带 x-umami-api-key 与 Bearer 令牌，无缝兼容 Cloud 与自建实例认证
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (this.apiKey) {
      headers['x-umami-api-key'] = this.apiKey
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * 记录一次页面访问 (Pageview)
   * 若前端已经由 Umami script.js 成功追踪上报，则后端跳过 /api/send 避免双重计数，仅返回当前最新数据；
   * 若客户端被广告拦截插件 (Adblock) 阻断或未注入脚本，则由服务端兜底代理上报至 Umami。
   */
  async recordPageView(input: PageViewInput): Promise<{ views: number; uv: number }> {
    if (!this.websiteId) {
      return { views: 0, uv: 0 }
    }

    const cleanSlug = input.slug.trim()
    const targetUrl = input.url || `/posts/${encodeURIComponent(cleanSlug)}`

    // 若客户端未上报（如被 Adblock 插件屏蔽），服务端执行无感知代理上报
    if (!input.clientTracked) {
      let hostname = 'localhost'
      try {
        if (input.url && (input.url.startsWith('http://') || input.url.startsWith('https://'))) {
          hostname = new URL(input.url).hostname
        }
      } catch {}

      const sendPayload = {
        payload: {
          hostname,
          language: input.language || 'zh-CN',
          referrer: input.referrer || '',
          screen: input.screen || '',
          title: cleanSlug,
          url: targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`,
          website: this.websiteId,
        },
        type: 'event',
      }

      try {
        const sendHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent':
            input.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        }
        if (input.ip) {
          sendHeaders['X-Forwarded-For'] = input.ip
        }

        // 发送至 Umami /api/send 收集端点
        await fetch(`${this.apiBase}/send`, {
          method: 'POST',
          headers: sendHeaders,
          body: JSON.stringify(sendPayload),
        })
      } catch (err) {
        console.warn('[Umami] recordPageView upstream send failed:', err)
      }
    }

    // 获取并返回当前文章的最新阅读数据
    return this.getPostStats(cleanSlug)
  }

  /**
   * 批量获取全部文章的统计数据映射字典
   * 查询 Umami 的 metrics 维度数据，并建立多重 slug/title 索引
   */
  async getAllPostStats(): Promise<Record<string, { views: number; uv: number }>> {
    if (!this.websiteId) {
      return {}
    }

    const cacheKey = `umami_stats_${this.websiteId}`

    // 1. 尝试从缓存中获取（60s 边缘缓存）
    if (this.storage) {
      try {
        const cached = await this.storage.getItem<Record<string, { views: number; uv: number }>>(
          cacheKey
        )
        if (cached && typeof cached === 'object') {
          return cached
        }
      } catch {}
    }

    // 2. 向 Umami 接口发起拉取
    const now = Date.now()
    // 起始时间设置为 2020-01-01 (1577836800000)，涵盖全量历史访问记录
    const startAt = 1577836800000
    const endAt = now

    const result: Record<string, { views: number; uv: number }> = {}

    try {
      const headers = this.getHeaders()

      // 优先尝试 expanded metrics 接口（可同时获取 views 与 visitors UV）
      let metricsUrl = `${this.apiBase}/websites/${this.websiteId}/metrics/expanded?type=url&startAt=${startAt}&endAt=${endAt}&limit=500`
      let res = await fetch(metricsUrl, { headers })

      if (!res.ok) {
        // 降级尝试标准 metrics 接口
        metricsUrl = `${this.apiBase}/websites/${this.websiteId}/metrics?type=url&startAt=${startAt}&endAt=${endAt}&limit=500`
        res = await fetch(metricsUrl, { headers })
      }

      if (!res.ok) {
        // 针对部分 Umami v2 实例兼容 type=path
        metricsUrl = `${this.apiBase}/websites/${this.websiteId}/metrics?type=path&startAt=${startAt}&endAt=${endAt}&limit=500`
        res = await fetch(metricsUrl, { headers })
      }

      if (res.ok) {
        const data: any = await res.json()
        const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []

        for (const item of items) {
          const rawPath: string = item.x || item.url || item.name || ''
          if (!rawPath) continue

          const views = Number(item.pageviews ?? item.y ?? 0)
          const uv = Number(item.visitors ?? item.uv ?? views)

          // 记录原始路径
          result[rawPath] = { views, uv }

          // 若属于文章路径 /posts/...，提取 slug 进行多键索引建立
          if (rawPath.startsWith('/posts/')) {
            const clean = rawPath.replace(/^\/posts\//, '').replace(/\/$/, '').split('?')[0]
            if (clean) {
              result[clean] = {
                views: (result[clean]?.views || 0) + views,
                uv: (result[clean]?.uv || 0) + uv,
              }

              try {
                const decoded = decodeURIComponent(clean)
                if (decoded !== clean) {
                  result[decoded] = {
                    views: (result[decoded]?.views || 0) + views,
                    uv: (result[decoded]?.uv || 0) + uv,
                  }
                }
              } catch {}
            }
          }
        }

        // 写入缓存，TTL 60 秒
        if (this.storage) {
          try {
            await this.storage.setItem(cacheKey, result, { ttl: 60 })
          } catch {}
        }
      } else {
        console.warn(`[Umami] Failed to fetch metrics: status ${res.status}`)
      }
    } catch (err) {
      console.warn('[Umami] Error in getAllPostStats:', err)
    }

    return result
  }

  /**
   * 获取单篇文章的浏览量与访客数统计
   */
  async getPostStats(slug: string): Promise<{ views: number; uv: number }> {
    if (!slug || !this.websiteId) {
      return { views: 0, uv: 0 }
    }

    const cleanSlug = slug.trim()
    const all = await this.getAllPostStats()

    // 1. 优先命中字典映射
    if (all[cleanSlug]) return all[cleanSlug]

    try {
      const decoded = decodeURIComponent(cleanSlug)
      if (all[decoded]) return all[decoded]
    } catch {}

    try {
      const encoded = encodeURIComponent(cleanSlug)
      if (all[encoded]) return all[encoded]
    } catch {}

    const pathForm = cleanSlug.startsWith('/posts/') ? cleanSlug : `/posts/${cleanSlug}`
    if (all[pathForm]) return all[pathForm]

    // 2. 若批量数据中未找到（例如刚创建的新文章），向 Umami stats 单独查询一次
    try {
      const startAt = 1577836800000
      const endAt = Date.now()
      const postUrl = `/posts/${encodeURIComponent(cleanSlug)}`
      const statsReqUrl = `${this.apiBase}/websites/${this.websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(postUrl)}`
      const res = await fetch(statsReqUrl, { headers: this.getHeaders() })

      if (res.ok) {
        const data: any = await res.json()
        const views = Number(data?.pageviews?.value ?? data?.pageviews ?? 0)
        const uv = Number(data?.visitors?.value ?? data?.visitors ?? 0)
        if (views > 0 || uv > 0) {
          return { views, uv }
        }
      }
    } catch {}

    return { views: 0, uv: 0 }
  }

  /**
   * 获取访问量最高的前 N 篇文章（供首页热门置顶使用）
   */
  async getTopPosts(limit = 3): Promise<PostStat[]> {
    if (!this.websiteId) return []

    const all = await this.getAllPostStats()
    const slugMap = new Map<string, { views: number; uv: number }>()

    for (const [key, stat] of Object.entries(all)) {
      if (key.startsWith('/') || !key) continue

      let normalized = key
      try {
        normalized = decodeURIComponent(key)
      } catch {}

      const prev = slugMap.get(normalized)
      if (!prev || stat.views > prev.views) {
        slugMap.set(normalized, {
          views: Math.max(prev?.views || 0, stat.views),
          uv: Math.max(prev?.uv || 0, stat.uv),
        })
      }
    }

    const sortedList: PostStat[] = Array.from(slugMap.entries())
      .map(([slug, s]) => ({ slug, views: s.views, uv: s.uv }))
      .sort((a, b) => b.views - a.views)

    return sortedList.slice(0, limit)
  }
}
