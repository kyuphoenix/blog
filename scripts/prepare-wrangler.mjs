/**
 * 仅用于处理 Cloudflare 基础设施级别的必须文件配置（如 KV ID、Worker 名称、自定义域名路由）。
 * 应用运行时所需的各种环境变量（BLOG_URL、GISCUS_*、GITHUB_*、PURGE_SECRET 等）
 * 均通过 CI/CD 直接部署到 Worker 的环境变量（env）中，不向工程文件中写入。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'wrangler.jsonc')
const rawContent = readFileSync(configPath, 'utf-8')

let content = rawContent

const kvId = process.env.CLOUDFLARE_KV_ID || process.env.KV_NAMESPACE_ID
const workerName = process.env.WORKER_NAME
const blogUrl = process.env.BLOG_URL

// 1. 注入 KV 命名空间 ID
if (kvId && kvId.trim()) {
  content = content.replace(/"id":\s*"[^"]*"/, `"id": "${kvId.trim()}"`)
  console.log(`✓ 已注入 KV 命名空间 ID: ${kvId.trim()}`)
} else {
  console.warn('⚠️ 未检测到 CLOUDFLARE_KV_ID 环境变量，使用现有配置')
}

// 2. 自定义 Worker 服务名称（可选）
if (workerName && workerName.trim()) {
  content = content.replace(/"name":\s*"[^"]*"/, `"name": "${workerName.trim()}"`)
  console.log(`✓ 已设置 Worker 名称: ${workerName.trim()}`)
}

// 3. 自定义域名路由（从 BLOG_URL 解析，非 workers.dev 域名时配置）
if (blogUrl && blogUrl.trim()) {
  try {
    const raw = blogUrl.trim()
    const parsed = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`)
    const hostname = parsed.hostname

    // Cloudflare 自带的 *.workers.dev 域名和 localhost 不需要也不支持配置自定义域名路由
    if (hostname && !hostname.endsWith('.workers.dev') && hostname !== 'localhost') {
      if (!content.includes('"routes"')) {
        const routeBlock = `,\n  // 自定义域名（由 BLOG_URL 自动解析）\n  "routes": [\n    {\n      "pattern": "${hostname}",\n      "custom_domain": true\n    }\n  ]`
        content = content.replace(/(\n\})[\s]*$/, `${routeBlock}\n}`)
        console.log(`✓ 已从 BLOG_URL 自动解析并绑定自定义域名: ${hostname}`)
      } else {
        content = content.replace(/"pattern":\s*"[^"]*"/, `"pattern": "${hostname}"`)
        console.log(`✓ 已更新自定义域名: ${hostname}`)
      }
    }
  } catch (err) {
    console.warn('⚠️ 无法从 BLOG_URL 解析域名:', err.message)
  }
}

writeFileSync(configPath, content, 'utf-8')
console.log('✅ wrangler.jsonc 基础设施配置完成（代码环境变量已直接通过 Worker 部署）')
