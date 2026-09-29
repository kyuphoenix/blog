import { AppEnv } from '../../types/env'
import { D1DatabaseClient } from './d1'
import { SupabaseDatabaseClient } from './supabase'
import { DatabaseClient, PageViewInput, PostStat } from './types'

export * from './types'
export { D1DatabaseClient } from './d1'
export { SupabaseDatabaseClient } from './supabase'

// 缓存数据库客户端实例，避免重复初始化
let cachedD1Client: D1DatabaseClient | null = null
let cachedD1Instance: D1Database | null = null

let cachedSupabaseClient: SupabaseDatabaseClient | null = null
let cachedSupabaseKey = ''

/**
 * 判定当前环境生效的数据库类型：
 * 1. 优先遵循环境变量/Workflow 显式指定的 DATABASE_TYPE ('d1' | 'supabase')
 * 2. auto 或未指定时，根据“配置了谁的信息就用哪个数据库”自动判定
 */
export function resolveDatabaseType(
  env?: AppEnv['Bindings'] | any
): 'd1' | 'supabase' | null {
  if (!env) return null

  // 若直接传入 D1 实例（兼容旧版调用）
  if (typeof env.prepare === 'function' && typeof env.batch === 'function') {
    return 'd1'
  }

  const explicitType = (env.DATABASE_TYPE || env.DB_TYPE || '').toLowerCase().trim()
  const hasSupabase = Boolean(
    env.SUPABASE_URL && (env.SUPABASE_KEY || env.SUPABASE_ANON_KEY)
  )
  const hasD1 = Boolean(env.DB && typeof env.DB.prepare === 'function')

  if (explicitType === 'supabase') {
    return hasSupabase ? 'supabase' : null
  }
  if (explicitType === 'd1') {
    return hasD1 ? 'd1' : null
  }

  // auto 模式或未显式指定：配置了谁的信息就优先连接谁
  if (hasSupabase && !hasD1) {
    return 'supabase'
  }
  if (hasD1 && !hasSupabase) {
    return 'd1'
  }
  if (hasSupabase && hasD1) {
    // 两个都配置且未指定类型时，默认优先使用原生 D1 边缘绑定
    return 'd1'
  }

  return null
}

/**
 * 获取统一数据库客户端
 */
export function getDbClient(
  target?: AppEnv['Bindings'] | D1Database | any
): DatabaseClient | null {
  if (!target) return null

  // 1. 直接传入 D1Database 实例兼容
  if (typeof target.prepare === 'function' && typeof target.batch === 'function') {
    if (!cachedD1Client || cachedD1Instance !== target) {
      cachedD1Instance = target
      cachedD1Client = new D1DatabaseClient(target)
    }
    return cachedD1Client
  }

  const env = target as AppEnv['Bindings']
  const type = resolveDatabaseType(env)

  if (type === 'supabase') {
    const url = (env.SUPABASE_URL || '').trim()
    const key = (env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || '').trim()
    if (!url || !key) return null

    const cacheToken = `${url}:${key}`
    if (!cachedSupabaseClient || cachedSupabaseKey !== cacheToken) {
      cachedSupabaseKey = cacheToken
      cachedSupabaseClient = new SupabaseDatabaseClient(url, key)
    }
    return cachedSupabaseClient
  }

  if (type === 'd1' && env.DB) {
    if (!cachedD1Client || cachedD1Instance !== env.DB) {
      cachedD1Instance = env.DB
      cachedD1Client = new D1DatabaseClient(env.DB)
    }
    return cachedD1Client
  }

  return null
}
