import { AppEnv } from '../types/env'
import {
  getDbClient,
  PageViewInput,
  PostStat,
  resolveDatabaseType,
  isStatsEnabled,
} from './db'

export * from './db'

/**
 * 记录一次页面访问（自动路由至 D1 或 Supabase；未配置数据库时不开启统计）
 */
export async function recordPageView(
  target: AppEnv['Bindings'] | D1Database | undefined,
  input: PageViewInput
): Promise<{ views: number; uv: number }> {
  if (!isStatsEnabled(target)) {
    return { views: 0, uv: 0 }
  }
  const client = getDbClient(target)
  if (!client) {
    return { views: 0, uv: 0 }
  }
  return client.recordPageView(input)
}

/**
 * 获取访问量最高的前 N 篇文章（供首页置顶与排行榜，未开启统计时返回空数组）
 */
export async function getTopPosts(
  target: AppEnv['Bindings'] | D1Database | undefined,
  limit = 3
): Promise<PostStat[]> {
  if (!isStatsEnabled(target)) return []
  const client = getDbClient(target)
  if (!client) return []
  return client.getTopPosts(limit)
}

/**
 * 获取单篇文章的访问统计（自动路由至 D1 或 Supabase，未开启统计时返回 0）
 */
export async function getPostStats(
  target: AppEnv['Bindings'] | D1Database | undefined,
  slug: string
): Promise<{ views: number; uv: number }> {
  if (!isStatsEnabled(target)) return { views: 0, uv: 0 }
  const client = getDbClient(target)
  if (!client) return { views: 0, uv: 0 }
  return client.getPostStats(slug)
}

/**
 * 批量获取文章的访问统计映射（自动路由至 D1 或 Supabase，未开启统计时返回空对象）
 */
export async function getAllPostStats(
  target: AppEnv['Bindings'] | D1Database | undefined
): Promise<Record<string, { views: number; uv: number }>> {
  if (!isStatsEnabled(target)) return {}
  const client = getDbClient(target)
  if (!client) return {}
  return client.getAllPostStats()
}
