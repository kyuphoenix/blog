/**
 * 仅用于处理 Cloudflare 基础设施级别的必须文件配置（如 KV ID、D1 ID、Worker 名称、自定义域名路由）。
 * 应用运行时所需的各种环境变量（BLOG_URL、GISCUS_*、GITHUB_*、DATABASE_TYPE、SUPABASE_* 等）
 * 均通过 CI/CD 直接部署到 Worker 的环境变量（env）中，不向工程文件中写入敏感密钥。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'wrangler.jsonc')
const rawContent = readFileSync(configPath, 'utf-8')

let content = rawContent

const kvId = process.env.CLOUDFLARE_KV_ID || process.env.KV_NAMESPACE_ID
const d1Id = process.env.CLOUDFLARE_D1_ID || process.env.D1_DATABASE_ID
const workerName = process.env.WORKER_NAME
const blogUrl = process.env.BLOG_URL
const dbType = (process.env.DATABASE_TYPE || process.env.DB_TYPE || 'auto').toLowerCase().trim()
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

// 1. 注入 KV 命名空间 ID
if (kvId && kvId.trim()) {
  content = content.replace(/"id":\s*"[^"]*"/, `"id": "${kvId.trim()}"`)
  console.log(`✓ 已注入 KV 命名空间 ID: ${kvId.trim()}`)
} else {
  console.warn('⚠️ 未检测到 CLOUDFLARE_KV_ID 环境变量，使用现有配置')
}

// 辅助函数：安全移除 wrangler.jsonc 中的 d1_databases 绑定
function stripD1Databases(text) {
  return text.replace(/,\s*\/\/[^\n]*\n\s*"d1_databases":\s*\[[\s\S]*?\]/, '')
}

// 2. 数据库绑定逻辑（支持 D1 与 Supabase 双架构切换）
if (dbType === 'supabase') {
  content = stripD1Databases(content)
  console.log('✓ 构建目标已指定为 Supabase，已移除 wrangler.jsonc 中的 D1 数据库绑定')
} else if (dbType === 'd1') {
  if (d1Id && d1Id.trim()) {
    content = content.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${d1Id.trim()}"`)
    console.log(`✓ 构建目标已指定为 Cloudflare D1，已注入 D1 数据库 ID: ${d1Id.trim()}`)
  } else {
    console.warn('⚠️ 指定使用 D1 数据库但未检测到 CLOUDFLARE_D1_ID 环境变量')
    if (content.includes('<YOUR_D1_DATABASE_ID>')) {
      content = stripD1Databases(content)
      console.warn('⚠️ 已移除 D1 占位符以防止部署报错')
    }
  }
} else {
  // auto 模式：根据配置智能判断
  if (d1Id && d1Id.trim()) {
    content = content.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${d1Id.trim()}"`)
    console.log(`✓ [auto 模式] 检测到 D1 配置，已注入 D1 数据库 ID: ${d1Id.trim()}`)
  } else if (supabaseUrl && supabaseKey) {
    content = stripD1Databases(content)
    console.log('✓ [auto 模式] 检测到 Supabase 配置且无 D1，已移除 D1 绑定并接入 Supabase')
  } else if (content.includes('<YOUR_D1_DATABASE_ID>')) {
    content = stripD1Databases(content)
    console.warn('⚠️ [auto 模式] 未检测到任何可用数据库凭证，已移除 D1 占位符')
  }
}

// 3. 自定义 Worker 服务名称（可选）
if (workerName && workerName.trim()) {
  content = content.replace(/"name":\s*"[^"]*"/, `"name": "${workerName.trim()}"`)
  console.log(`✓ 已设置 Worker 名称: ${workerName.trim()}`)
}

// 4. 自定义域名路由（从 BLOG_URL 解析，非 workers.dev 域名时配置）
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
console.log('✅ wrangler.jsonc 基础设施配置完成')
