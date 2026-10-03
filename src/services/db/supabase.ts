import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { DatabaseClient, PageViewInput, PostStat } from './types'

/**
 * 匿名化哈希算法：基于当日 Salt 与客户端特征计算，绝不直接存储真实 IP
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

export class SupabaseDatabaseClient implements DatabaseClient {
  readonly type = 'supabase' as const
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  async recordPageView(input: PageViewInput): Promise<{ views: number; uv: number }> {
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

    try {
      // 1. 优先尝试调用原子 RPC 函数（如果在 Supabase 中配置了 increment_page_view 函数）
      try {
        const { data: rpcData, error: rpcError } = await this.supabase.rpc('increment_page_view', {
          p_slug: slug,
          p_url: url,
          p_referrer: referrer,
          p_user_agent: userAgent,
          p_ip_hash: ipHash,
          p_country: country,
          p_session_id: sessionId,
        })

        if (!rpcError && rpcData && typeof rpcData.views === 'number') {
          return {
            views: Number(rpcData.views),
            uv: Number(rpcData.uv || 1),
          }
        }
      } catch {
        // RPC 不存在或未配置时，顺畅降级为标准 REST 表操作
      }

      // 2. 降级方案：标准 REST 表写入与聚合计算
      // 2.1 判断 30 分钟内同会话/同 IP 访问去重
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      let isNewUv = 1

      const { data: recentViews } = await this.supabase
        .from('page_views')
        .select('id')
        .eq('slug', slug)
        .or(`session_id.eq.${sessionId || '__none__'},and(ip_hash.eq.${ipHash},created_at.gt.${thirtyMinsAgo})`)
        .limit(1)

      if (recentViews && recentViews.length > 0) {
        isNewUv = 0
      }

      // 2.2 插入明细表
      await this.supabase.from('page_views').insert({
        slug,
        url,
        referrer,
        user_agent: userAgent,
        ip_hash: ipHash,
        country,
        session_id: sessionId,
      })

      // 2.3 更新或创建 post_stats 汇总统计
      const { data: currentStat } = await this.supabase
        .from('post_stats')
        .select('views, uv')
        .eq('slug', slug)
        .maybeSingle()

      let finalViews = 1
      let finalUv = isNewUv

      if (currentStat) {
        finalViews = (Number(currentStat.views) || 0) + 1
        finalUv = (Number(currentStat.uv) || 0) + isNewUv
        await this.supabase
          .from('post_stats')
          .update({
            views: finalViews,
            uv: finalUv,
            updated_at: new Date().toISOString(),
          })
          .eq('slug', slug)
      } else {
        await this.supabase.from('post_stats').insert({
          slug,
          views: 1,
          uv: 1,
          updated_at: new Date().toISOString(),
        })
      }

      return {
        views: finalViews,
        uv: finalUv,
      }
    } catch (err) {
      console.error('Supabase 记录访问量异常:', err)
      return { views: 1, uv: 1 }
    }
  }

  async getTopPosts(limit = 3): Promise<PostStat[]> {
    try {
      const { data, error } = await this.supabase
        .from('post_stats')
        .select('slug, views, uv')
        .gt('views', 0)
        .order('views', { ascending: false })
        .order('uv', { ascending: false })
        .limit(limit)

      if (error) {
        console.warn('Supabase 查询热门文章失败:', error.message)
        return []
      }

      return (data || []).map((item) => ({
        slug: item.slug,
        views: Number(item.views) || 0,
        uv: Number(item.uv) || 0,
      }))
    } catch (err) {
      console.warn('Supabase 查询热门文章异常:', err)
      return []
    }
  }

  async getPostStats(slug: string): Promise<{ views: number; uv: number }> {
    if (!slug) return { views: 0, uv: 0 }

    try {
      const { data, error } = await this.supabase
        .from('post_stats')
        .select('views, uv')
        .eq('slug', slug)
        .maybeSingle()

      if (error || !data) {
        return { views: 0, uv: 0 }
      }

      return {
        views: Number(data.views) || 0,
        uv: Number(data.uv) || 0,
      }
    } catch {
      return { views: 0, uv: 0 }
    }
  }

  async getAllPostStats(): Promise<Record<string, { views: number; uv: number }>> {
    try {
      const { data, error } = await this.supabase
        .from('post_stats')
        .select('slug, views, uv')

      if (error || !data) {
        return {}
      }

      const map: Record<string, { views: number; uv: number }> = {}
      for (const item of data) {
        map[item.slug] = {
          views: Number(item.views) || 0,
          uv: Number(item.uv) || 0,
        }
      }
      return map
    } catch {
      return {}
    }
  }
}
