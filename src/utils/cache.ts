import type { Context } from 'hono'
import type { AppEnv } from '../types/env.js'

export interface CacheOptions {
  browserMaxAge?: number
  edgeMaxAge?: number
  swrMaxAge?: number
  tags?: string[]
}

/**
 * 设置多平台分层缓存与 SWR (Stale-While-Revalidate) 响应头
 *
 * 分层策略：
 * 1. 客户端浏览器 (Browser)：默认 max-age=0, must-revalidate
 *    - 确保用户刷新或前进/后退时总是向边缘 CDN 验证，CDN 缓存失效后用户能即时看到最新内容，避免被本地磁盘死缓存拦截。
 * 2. 边缘 CDN (Edge CDN)：
 *    - s-maxage: 默认 86400 (24小时)，在 Vercel / Cloudflare / Netlify 边缘节点全球强缓存。
 *    - stale-while-revalidate (SWR): 默认 604800 (7天)，缓存过期后优先微秒级返回陈旧副本，同时后台异步静默从源站重新拉取。
 *    - 针对 Cloudflare 设置 Cloudflare-CDN-Cache-Control / CDN-Cache-Control。
 *    - 针对 Netlify 设置 Netlify-CDN-Cache-Control 与 Netlify-Cache-Tag。
 *    - 针对 Vercel 设置 Vercel-Cache-Tag。
 */
export function setTieredCache(c: Context, options: CacheOptions = {}) {
  const browserMaxAge = options.browserMaxAge ?? 0
  const edgeMaxAge = options.edgeMaxAge ?? 86400 // 24 小时
  const swrMaxAge = options.swrMaxAge ?? 604800 // 7 天
  const tags = options.tags || ['page']

  // 1. 标准 HTTP 缓存头 (通用浏览器与 Vercel / Cloudflare / Netlify 等共享缓存)
  c.header(
    'Cache-Control',
    `public, max-age=${browserMaxAge}, s-maxage=${edgeMaxAge}, stale-while-revalidate=${swrMaxAge}, must-revalidate`
  )

  // 2. Cloudflare 边缘缓存控制专用头（优先级高于标准 Cache-Control）
  c.header(
    'Cloudflare-CDN-Cache-Control',
    `public, max-age=${edgeMaxAge}, stale-while-revalidate=${swrMaxAge}`
  )
  c.header(
    'CDN-Cache-Control',
    `public, max-age=${edgeMaxAge}, stale-while-revalidate=${swrMaxAge}`
  )

  // 3. Netlify 边缘缓存控制专用头与细粒度标签
  c.header(
    'Netlify-CDN-Cache-Control',
    `public, max-age=${edgeMaxAge}, stale-while-revalidate=${swrMaxAge}`
  )

  if (tags.length > 0) {
    const tagHeaderValue = tags.join(',')
    c.header('Netlify-Cache-Tag', tagHeaderValue)
    c.header('Vercel-Cache-Tag', tagHeaderValue)
  }
}

/**
 * 设置完全禁止缓存响应头 (适用于 404、管理接口、主动 Purge 等敏感/动态场景)
 */
export function setNoCache(c: Context) {
  c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
}

export interface PurgePlatformResult {
  platform: 'cloudflare' | 'netlify' | 'vercel'
  success: boolean
  message: string
}

/**
 * 后端直接主动通知各厂商 CDN 清除边缘缓存 (通过厂商官方全局 Control Plane API)
 */
export async function purgePlatformCaches(
  env: AppEnv['Bindings'],
  options?: { urls?: string[]; tags?: string[] }
): Promise<PurgePlatformResult[]> {
  const results: PurgePlatformResult[] = []

  // 1. Cloudflare 全局 CDN 缓存清除
  const cfZoneId = env?.CLOUDFLARE_ZONE_ID || (env as any)?.CF_ZONE_ID
  const cfToken = env?.CLOUDFLARE_API_TOKEN || (env as any)?.CF_API_TOKEN
  if (cfZoneId && cfToken) {
    try {
      const payload: Record<string, any> = {}
      if (options?.urls && options.urls.length > 0) {
        payload.files = options.urls
      } else {
        payload.purge_everything = true
      }

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )
      const data = (await res.json().catch(() => ({}))) as any
      if (res.ok && data.success) {
        results.push({
          platform: 'cloudflare',
          success: true,
          message: payload.purge_everything
            ? 'Cloudflare 全量缓存已成功清除'
            : `Cloudflare ${options?.urls?.length} 个文件缓存已成功清除`,
        })
      } else {
        const errorMsg = data?.errors?.[0]?.message || `HTTP ${res.status}`
        results.push({
          platform: 'cloudflare',
          success: false,
          message: `Cloudflare 清除失败: ${errorMsg}`,
        })
      }
    } catch (e: any) {
      results.push({
        platform: 'cloudflare',
        success: false,
        message: `Cloudflare 异常: ${e?.message || e}`,
      })
    }
  }

  // 2. Netlify 边缘 CDN 缓存清除
  const netlifySiteId = env?.NETLIFY_SITE_ID || (env as any)?.NETLIFY_SITE_SLUG
  const netlifyToken =
    env?.NETLIFY_AUTH_TOKEN ||
    (env as any)?.NETLIFY_TOKEN ||
    (env as any)?.NETLIFY_PAT ||
    (env as any)?.NETLIFY_API_KEY
  if (netlifySiteId && netlifyToken) {
    try {
      const payload: Record<string, any> = {
        site_id: netlifySiteId,
      }
      if (options?.tags && options.tags.length > 0) {
        payload.cache_tags = options.tags
      }

      const res = await fetch('https://api.netlify.com/api/v1/purge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        results.push({
          platform: 'netlify',
          success: true,
          message: options?.tags
            ? `Netlify 标签 [${options.tags.join(', ')}] 缓存已成功清除`
            : 'Netlify 全站缓存已成功清除',
        })
      } else {
        const text = await res.text().catch(() => '')
        results.push({
          platform: 'netlify',
          success: false,
          message: `Netlify 清除失败: HTTP ${res.status} ${text}`,
        })
      }
    } catch (e: any) {
      results.push({
        platform: 'netlify',
        success: false,
        message: `Netlify 异常: ${e?.message || e}`,
      })
    }
  }

  // 3. Vercel 边缘 CDN 缓存清除 (优先使用官方 Edge Cache REST API，无需绑定 GitHub 仓库与 Deploy Hook)
  const vercelToken =
    env?.VERCEL_TOKEN ||
    (env as any)?.VERCEL_API_KEY ||
    (env as any)?.VERCEL_AUTH_TOKEN
  const vercelProjectId =
    env?.VERCEL_PROJECT_ID ||
    (env as any)?.VERCEL_PROJECT_NAME
  const vercelOrgId = env?.VERCEL_ORG_ID
  const vercelHook = env?.VERCEL_DEPLOY_HOOK_URL || (env as any)?.VERCEL_HOOK_URL

  if (vercelToken && vercelProjectId) {
    try {
      const teamQuery = vercelOrgId ? `&teamId=${encodeURIComponent(vercelOrgId)}` : ''
      const targetTags =
        options?.tags && options.tags.length > 0
          ? options.tags
          : ['page', 'post', 'posts', 'home', 'archive', 'about', 'links', 'all-posts']

      const res = await fetch(
        `https://api.vercel.com/v1/edge-cache/dangerously-delete-by-tags?projectIdOrName=${encodeURIComponent(vercelProjectId)}${teamQuery}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tags: targetTags,
            target: 'production',
          }),
        }
      )
      if (res.ok) {
        results.push({
          platform: 'vercel',
          success: true,
          message: `Vercel 官方 Edge Cache API 成功清除 CDN 缓存 (标签: ${targetTags.join(', ')})`,
        })
      } else {
        const text = await res.text().catch(() => '')
        results.push({
          platform: 'vercel',
          success: false,
          message: `Vercel Edge Cache API 清除失败: HTTP ${res.status} ${text}`,
        })
      }
    } catch (e: any) {
      results.push({
        platform: 'vercel',
        success: false,
        message: `Vercel Edge Cache API 异常: ${e?.message || e}`,
      })
    }
  } else if (vercelHook) {
    try {
      const res = await fetch(vercelHook, {
        method: 'POST',
      })
      if (res.ok) {
        results.push({
          platform: 'vercel',
          success: true,
          message: 'Vercel Deploy Hook 触发成功，正在重新构建并刷新全球 CDN',
        })
      } else {
        results.push({
          platform: 'vercel',
          success: false,
          message: `Vercel Deploy Hook 触发失败: HTTP ${res.status}`,
        })
      }
    } catch (e: any) {
      results.push({
        platform: 'vercel',
        success: false,
        message: `Vercel Deploy Hook 异常: ${e?.message || e}`,
      })
    }
  }

  return results
}
