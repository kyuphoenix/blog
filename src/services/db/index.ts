import type { AppEnv } from '../../types/env.js'
import { UmamiDatabaseClient } from './umami.js'
import { getBlogStorage } from '../storage.js'
import type { DatabaseClient, PageViewInput, PostStat } from './types.js'

export * from './types.js'
export { UmamiDatabaseClient } from './umami.js'

// 缓存 Umami 统计客户端实例，避免重复创建
let cachedUmamiClient: UmamiDatabaseClient | null = null
let cachedUmamiKey = ''

/**
 * 判定当前环境是否启用了统计服务：
 * 1. 显式配置 DISABLE_STATS=true 或 ENABLE_STATS=false 则禁用
 * 2. 只要配置了 UMAMI_WEBSITE_ID，则启用 'umami'
 */
export function resolveDatabaseType(
  env?: AppEnv['Bindings'] | any
): 'umami' | null {
  if (!env) return null

  const explicitType = (env.DATABASE_TYPE || env.DB_TYPE || env.STATS_PROVIDER || '')
    .toLowerCase()
    .trim()
  if (explicitType === 'none' || explicitType === 'off' || explicitType === 'disabled') {
    return null
  }

  const hasUmami = Boolean(env.UMAMI_WEBSITE_ID || env.UMAMI_ID)
  if (hasUmami) {
    return 'umami'
  }

  return null
}

/**
 * 判定当前环境是否启用了浏览统计功能
 */
export function isStatsEnabled(env?: AppEnv['Bindings'] | any): boolean {
  if (!env) return false

  const enableVar = env.ENABLE_STATS
  if (enableVar === 'false' || enableVar === false) return false

  const disableVar = env.DISABLE_STATS
  if (disableVar === 'true' || disableVar === true) return false

  return resolveDatabaseType(env) !== null
}

/**
 * 获取统计客户端（Umami）
 */
export function getDbClient(
  target?: AppEnv['Bindings'] | any
): DatabaseClient | null {
  if (!target) return null

  const env = target as AppEnv['Bindings']
  const type = resolveDatabaseType(env)

  if (type === 'umami') {
    const host = (env.UMAMI_HOST || env.UMAMI_URL || env.UMAMI_ENDPOINT || 'https://cloud.umami.is').trim()
    const websiteId = (env.UMAMI_WEBSITE_ID || env.UMAMI_ID || '').trim()
    const apiKey = (env.UMAMI_API_KEY || env.UMAMI_TOKEN || '').trim()
    const enableScript = env.ENABLE_UMAMI_SCRIPT !== 'false' && env.ENABLE_UMAMI_SCRIPT !== false

    if (!websiteId) return null

    const cacheToken = `${host}:${websiteId}:${apiKey}:${enableScript}`
    if (!cachedUmamiClient || cachedUmamiKey !== cacheToken) {
      cachedUmamiKey = cacheToken
      const storage = getBlogStorage(env)
      cachedUmamiClient = new UmamiDatabaseClient({
        host,
        websiteId,
        apiKey,
        storage,
        enableScript,
      })
    }
    return cachedUmamiClient
  }

  return null
}
