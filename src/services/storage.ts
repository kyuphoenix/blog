import { createStorage, Storage } from 'unstorage'
import cloudflareKVBindingDriver from 'unstorage/drivers/cloudflare-kv-binding'
import memoryDriver from 'unstorage/drivers/memory'
import type { AppEnv } from '../types/env.js'

let cachedStorage: Storage | null = null
let cachedBinding: any = null

/**
 * 获取统一缓存 Storage 实例：
 * 1. 在 Cloudflare Workers 环境下，优先使用原生边缘 KV 绑定 (env.BLOG_CACHE)
 * 2. 在本地开发、Vercel、Netlify 或未配置 KV 时，平滑降级为内存缓存 (memory)
 * 具备跨云平台无缝迁移能力，同时彻底免去手动 JSON 序列化与异常捕获的繁琐操作。
 */
export function getBlogStorage(env?: AppEnv['Bindings'] | any): Storage {
  const binding = env?.BLOG_CACHE

  // 若环境或绑定实例未变更，直接复用已初始化的 storage 实例
  if (cachedStorage && cachedBinding === binding) {
    return cachedStorage
  }

  cachedBinding = binding

  // 1. Cloudflare Workers 原生 KV 绑定驱动
  if (binding && typeof binding.get === 'function') {
    cachedStorage = createStorage({
      driver: cloudflareKVBindingDriver({
        binding,
      }),
    })
    return cachedStorage
  }

  // 2. 自动降级为高效内存缓存驱动（支持 Vercel / Netlify / 本地调试）
  cachedStorage = createStorage({
    driver: memoryDriver(),
  })
  return cachedStorage
}

export type { Storage }
