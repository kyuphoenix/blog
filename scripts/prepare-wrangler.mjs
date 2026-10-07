/**
 * 仅用于处理 Cloudflare 基础设施级别的必须文件配置（如 KV ID、D1 ID、Worker 名称、自定义域名路由）。
 * 
 * 核心特性：
 * 1. 自动资源嗅探与绑定：若环境变量中配置了具备权限的 CLOUDFLARE_API_TOKEN，
 *    自动检测或创建 KV (honoki_kv) 与 D1 (honoki_db)，并自动执行 db/schema.sql 初始化表结构，
 *    彻底免去用户手动获取与填写 CLOUDFLARE_KV_ID / CLOUDFLARE_D1_ID 的繁琐操作！
 * 2. 权限自适应与安全降级：若 Token 权限受限或未提供，安全降级为内存缓存与轻量模式，不阻断部署。
 * 3. 环境变量（BLOG_URL、GISCUS_*、GH_* 等）通过 CI/CD 运行时直接注入，不落盘敏感密钥。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'wrangler.jsonc')
const rawContent = readFileSync(configPath, 'utf-8')

let content = rawContent

let kvId = (process.env.CLOUDFLARE_KV_ID || process.env.KV_NAMESPACE_ID)?.trim()
let d1Id = (process.env.CLOUDFLARE_D1_ID || process.env.D1_DATABASE_ID)?.trim()
const workerName = process.env.WORKER_NAME?.trim()
const blogUrl = process.env.BLOG_URL?.trim()
const dbType = (process.env.DATABASE_TYPE || process.env.DB_TYPE || process.env.STATS_PROVIDER || 'auto').toLowerCase().trim()
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseKey = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)?.trim()
const umamiWebsiteId = (process.env.UMAMI_WEBSITE_ID || process.env.UMAMI_ID)?.trim()
const umamiHost = (process.env.UMAMI_HOST || process.env.UMAMI_URL || process.env.UMAMI_ENDPOINT)?.trim()
const hasUmami = Boolean(umamiWebsiteId)

const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()
let accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.ACCOUNT_ID)?.trim()

// 辅助函数：安全移除 wrangler.jsonc 中的 kv_namespaces 绑定
function stripKVNamespaces(text) {
  return text.replace(/,\s*\/\/[^\n]*\n\s*"kv_namespaces":\s*\[[\s\S]*?\]/, '')
}

// 辅助函数：安全移除 wrangler.jsonc 中的 d1_databases 绑定
function stripD1Databases(text) {
  return text.replace(/,\s*\/\/[^\n]*\n\s*"d1_databases":\s*\[[\s\S]*?\]/, '')
}

async function resolveCloudflareAutoResources() {
  if (!apiToken) {
    return { autoKvId: null, autoD1Id: null }
  }

  const apiHeaders = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  }

  // 1. 若未显式传入 accountId，自动通过 Cloudflare API 查询获取
  if (!accountId) {
    try {
      const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: apiHeaders,
      })
      if (accRes.ok) {
        const accData = await accRes.json()
        if (accData.result && accData.result.length > 0) {
          accountId = accData.result[0].id
          console.log(`✓ 自动解析 Cloudflare 账户 ID: ${accountId}`)
        }
      }
    } catch (e) {
      console.warn(`⚠️ 查询 Cloudflare 账户异常: ${e.message}`)
    }
  }

  if (!accountId) {
    return { autoKvId: null, autoD1Id: null }
  }

  let autoKvId = null
  let autoD1Id = null

  // 2. 自动探测或创建 KV 命名空间 (honoki_kv)
  if (!kvId) {
    try {
      const kvListRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces?per_page=100`,
        { headers: apiHeaders }
      )
      if (kvListRes.ok) {
        const kvData = await kvListRes.json()
        const existing = (kvData.result || []).find(
          (ns) =>
            ns.title === 'honoki_kv' ||
            ns.title === 'honoki-kv' ||
            ns.title === 'HONOKI_KV' ||
            ns.title === 'blog-cache' ||
            ns.title === 'blog_cache' ||
            ns.title === 'BLOG_CACHE'
        )
        if (existing) {
          autoKvId = existing.id
          console.log(`✓ [自动复用] 检测到已有 Cloudflare KV 命名空间: ${existing.title} (ID: ${autoKvId})`)
        } else {
          console.log('ℹ️ Cloudflare 账户下未找到 honoki_kv，正在根据 Token 权限自动创建 KV 命名空间...')
          const createKvRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
            {
              method: 'POST',
              headers: apiHeaders,
              body: JSON.stringify({ title: 'honoki_kv' }),
            }
          )
          if (createKvRes.ok) {
            const createData = await createKvRes.json()
            autoKvId = createData.result?.id
            console.log(`✓ [自动创建] 成功创建并绑定 Cloudflare KV: honoki_kv (ID: ${autoKvId})`)
          } else {
            console.log(`ℹ️ 自动创建 KV 返回状态 [${createKvRes.status}]，Token 未包含 Workers KV 编辑权限（将自动使用内存缓存）`)
          }
        }
      } else {
        console.log(`ℹ️ 查询 KV 列表返回状态 [${kvListRes.status}]，Token 未包含 Workers KV 读取权限`)
      }
    } catch (err) {
      console.warn(`⚠️ 自动检测/创建 KV 异常: ${err.message}`)
    }
  }

  // 3. 自动探测、创建并初始化 D1 数据库 (honoki_db)
  const shouldTryD1 = dbType !== 'none' && dbType !== 'off' && dbType !== 'disabled' && dbType !== 'supabase'
  if (!d1Id && shouldTryD1) {
    try {
      const d1ListRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database?per_page=100`,
        { headers: apiHeaders }
      )
      if (d1ListRes.ok) {
        const d1Data = await d1ListRes.json()
        const existing = (d1Data.result || []).find(
          (db) => db.name === 'honoki_db' || db.name === 'honoki-db' || db.name === 'blog-db'
        )
        if (existing) {
          autoD1Id = existing.uuid
          console.log(`✓ [自动复用] 检测到已有 Cloudflare D1 数据库: ${existing.name} (UUID: ${autoD1Id})`)
        } else {
          console.log('ℹ️ Cloudflare 账户下未找到 honoki_db，正在根据 Token 权限自动创建 D1 数据库...')
          const createD1Res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
            {
              method: 'POST',
              headers: apiHeaders,
              body: JSON.stringify({ name: 'honoki_db' }),
            }
          )
          if (createD1Res.ok) {
            const createData = await createD1Res.json()
            autoD1Id = createData.result?.uuid
            console.log(`✓ [自动创建] 成功创建 Cloudflare D1 数据库: honoki_db (UUID: ${autoD1Id})`)
          } else {
            console.log(`ℹ️ 自动创建 D1 返回状态 [${createD1Res.status}]，Token 未包含 D1 编辑权限`)
          }
        }

        // 若成功获取或创建了 D1 ID，进一步检测并自动初始化数据表
        if (autoD1Id) {
          try {
            const checkRes = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${autoD1Id}/query`,
              {
                method: 'POST',
                headers: apiHeaders,
                body: JSON.stringify({
                  sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='post_stats';",
                }),
              }
            )
            if (checkRes.ok) {
              const checkData = await checkRes.json()
              const rows = checkData.result?.[0]?.results || []
              if (rows.length === 0) {
                console.log('ℹ️ D1 数据库尚未建表，正在自动执行 db/schema.sql 初始化...')
                const schemaPath = resolve(process.cwd(), 'db/schema.sql')
                if (existsSync(schemaPath)) {
                  const schemaSql = readFileSync(schemaPath, 'utf-8')
                  const initRes = await fetch(
                    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${autoD1Id}/query`,
                    {
                      method: 'POST',
                      headers: apiHeaders,
                      body: JSON.stringify({ sql: schemaSql }),
                    }
                  )
                  if (initRes.ok) {
                    console.log('🎉 [自动建表] 成功执行 db/schema.sql 初始化 D1 数据库 (page_views, post_stats)！')
                  } else {
                    console.warn(`⚠️ D1 自动建表返回状态: ${initRes.status}`)
                  }
                }
              } else {
                console.log('✅ D1 数据库表结构已就绪，无需重复建表。')
              }
            }
          } catch (initErr) {
            console.warn(`⚠️ D1 表结构检测异常: ${initErr.message}`)
          }
        }
      } else {
        console.log(`ℹ️ 查询 D1 列表返回状态 [${d1ListRes.status}]，Token 未包含 D1 读取权限`)
      }
    } catch (err) {
      console.warn(`⚠️ 自动检测/创建 D1 异常: ${err.message}`)
    }
  }

  // 3. 自动探测 Cloudflare Zone ID (如果未显式提供 CLOUDFLARE_ZONE_ID)
  let autoZoneId = null
  let zoneId = (process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID)?.trim()
  if (!zoneId) {
    try {
      const zonesRes = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=50', {
        headers: apiHeaders,
      })
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json()
        const zones = zonesData.result || []
        let targetHost = ''
        if (blogUrl) {
          try {
            targetHost = new URL(blogUrl.startsWith('http') ? blogUrl : `https://${blogUrl}`).hostname.toLowerCase()
          } catch {}
        }
        if (targetHost) {
          const matched = zones.find(
            (z) => targetHost === z.name.toLowerCase() || targetHost.endsWith('.' + z.name.toLowerCase())
          )
          if (matched) autoZoneId = matched.id
        }
        if (!autoZoneId && zones.length === 1) {
          autoZoneId = zones[0].id
        }
        if (autoZoneId) {
          console.log(`✓ [自动发现] 解析到 Cloudflare Zone ID: ${autoZoneId}`)
        }
      }
    } catch (err) {
      console.warn(`⚠️ 自动查询 Zone 异常: ${err.message}`)
    }
  }

  return { autoKvId, autoD1Id, autoZoneId }
}

async function main() {
  // 0. 执行 Cloudflare API 自动资源探测（根据 API Token 权限自动创建与绑定 KV/D1/Zone）
  const { autoKvId, autoD1Id, autoZoneId } = await resolveCloudflareAutoResources()
  if (!kvId && autoKvId) {
    kvId = autoKvId
  }
  if (!d1Id && autoD1Id) {
    d1Id = autoD1Id
  }
  const resolvedZoneId = (process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID)?.trim() || autoZoneId

  // 1. 注入 KV 命名空间 ID（若未提供且仍为占位符则安全移除，unstorage 会自动平滑降级为内存缓存）
  if (kvId && kvId.trim()) {
    content = content.replace(/"id":\s*"[^"]*"/, `"id": "${kvId.trim()}"`)
    console.log(`✓ 已注入 KV 命名空间 ID: ${kvId.trim()}`)
  } else if (content.includes('<YOUR_KV_NAMESPACE_ID>')) {
    content = stripKVNamespaces(content)
    console.warn('⚠️ 未检测到可用 KV 绑定，已安全移除 KV 占位符（unstorage 自动使用内存缓存）')
  }

  // 2. 数据库绑定逻辑（支持 Umami、D1 与 Supabase 架构切换，或 none 模式关闭数据库与统计）
  if (dbType === 'none' || dbType === 'off' || dbType === 'disabled') {
    content = stripD1Databases(content)
    console.log('✓ 构建目标已指定为 none，已移除 D1 数据库绑定（零数据库模式运行）')
  } else if (dbType === 'umami' || (dbType === 'auto' && hasUmami)) {
    content = stripD1Databases(content)
    console.log('✓ 构建目标已接入 Umami 统计（替代 D1/Supabase），已安全移除 D1 数据库绑定')
  } else if (dbType === 'supabase') {
    content = stripD1Databases(content)
    console.log('✓ 构建目标已指定为 Supabase，已移除 wrangler.jsonc 中的 D1 数据库绑定')
  } else if (dbType === 'd1') {
    if (d1Id && d1Id.trim()) {
      content = content.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${d1Id.trim()}"`)
      console.log(`✓ 构建目标已指定为 Cloudflare D1，已注入 D1 数据库 ID: ${d1Id.trim()}`)
    } else {
      console.warn('⚠️ 指定使用 D1 数据库但未获取到 D1 ID (Token 未授权或未手动指定)')
      if (content.includes('<YOUR_D1_DATABASE_ID>')) {
        content = stripD1Databases(content)
        console.warn('⚠️ 已移除 D1 占位符以防止部署报错（自动降级为零数据库模式）')
      }
    }
  } else {
    // auto 模式：根据配置智能判断
    if (d1Id && d1Id.trim()) {
      content = content.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${d1Id.trim()}"`)
      console.log(`✓ [auto 模式] 检测到可用 D1，已注入 D1 数据库 ID: ${d1Id.trim()}`)
    } else if (supabaseUrl && supabaseKey) {
      content = stripD1Databases(content)
      console.log('✓ [auto 模式] 检测到 Supabase 配置且无 D1，已移除 D1 绑定并接入 Supabase')
    } else if (content.includes('<YOUR_D1_DATABASE_ID>')) {
      content = stripD1Databases(content)
      console.warn('⚠️ [auto 模式] 未检测到任何可用数据库，已移除 D1 占位符（自动以零数据库超轻量模式运行）')
    }
  }

  // 3. 自定义 Worker 服务名称（可选）
  if (workerName && workerName.trim()) {
    content = content.replace(/"name":\s*"[^"]*"/, `"name": "${workerName.trim()}"`)
    console.log(`✓ 已设置 Worker 名称: ${workerName.trim()}`)
  }

  // 4. 自定义域名路由（仅当显式设置 CLOUDFLARE_BIND_ROUTES=true 时才注入，避免因 API Token 缺少 Zone 路由修改权限导致部署报错）
  const shouldBindRoutes = process.env.CLOUDFLARE_BIND_ROUTES === 'true' || process.env.BIND_CUSTOM_DOMAIN === 'true'
  if (shouldBindRoutes && blogUrl && blogUrl.trim()) {
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
  } else if (blogUrl && blogUrl.trim()) {
    console.log('ℹ️ 自定义域名路由已由 Cloudflare 控制台管理，跳过由 Wrangler 自动绑定路由（如需通过 CI 自动管理，可配置 CLOUDFLARE_BIND_ROUTES=true 并授予 Token 对应路由权限）')
  }

  // 确保包含 Cloudflare Workers 原生边缘 CDN 响应缓存配置
  if (!content.includes('"cache"')) {
    content = content.replace(
      /"compatibility_flags":\s*\[[^\]]*\],?/,
      `"compatibility_flags": ["nodejs_compat"],\n  // 开启 Cloudflare Workers 原生边缘 CDN 响应缓存\n  "cache": {\n    "enabled": true\n  },`
    )
    console.log('✓ 已确保启用 Cloudflare Workers 原生边缘 CDN 响应缓存 (cache.enabled = true)')
  }

  // 5. 动态注入非敏感运行期环境变量（仅注入有效配置项，未配置项自动忽略，彻底避免部署报错）
  const runtimeVars = {
    DEPLOY_PLATFORM: 'cloudflare',
    CLOUDFLARE_ZONE_ID: resolvedZoneId || undefined,
    DATABASE_TYPE: dbType || 'auto',
    GH_OWNER: (process.env.GH_OWNER || process.env.GITHUB_OWNER)?.trim(),
    GH_REPO: (process.env.GH_REPO || process.env.GITHUB_REPO)?.trim(),
    GH_BRANCH: (process.env.GH_BRANCH || process.env.GITHUB_BRANCH)?.trim(),
    BLOG_URL: blogUrl || undefined,
    SUPABASE_URL: supabaseUrl || undefined,
    UMAMI_HOST: umamiHost || undefined,
    UMAMI_WEBSITE_ID: umamiWebsiteId || undefined,
    UMAMI_SCRIPT_URL: process.env.UMAMI_SCRIPT_URL?.trim() || undefined,
    ENABLE_UMAMI_SCRIPT: process.env.ENABLE_UMAMI_SCRIPT?.trim() || undefined,
    GISCUS_REPO: process.env.GISCUS_REPO?.trim() || undefined,
    GISCUS_REPO_ID: process.env.GISCUS_REPO_ID?.trim() || undefined,
    GISCUS_CATEGORY: process.env.GISCUS_CATEGORY?.trim() || undefined,
    GISCUS_CATEGORY_ID: process.env.GISCUS_CATEGORY_ID?.trim() || undefined,
  }

  const activeVars = Object.fromEntries(
    Object.entries(runtimeVars).filter(([_, v]) => v !== undefined && v !== '')
  )

  // 先安全清理可能存在的旧 vars 块
  content = content.replace(/,?\s*(?:\/\/[^\n]*\n\s*)?"vars":\s*\{[\s\S]*?\}/g, '')

  if (Object.keys(activeVars).length > 0) {
    const formattedVars = JSON.stringify(activeVars, null, 2)
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : '  ' + line))
      .join('\n')
    const varsBlock = `,\n  // 运行时非敏感环境变量（由 prepare-wrangler 动态注入有效项，未配置项自动忽略）\n  "vars": ${formattedVars}`
    content = content.replace(/(\n\})[\s]*$/, `${varsBlock}\n}`)
    console.log(`✓ 已向 wrangler.jsonc 注入环境变量: ${Object.keys(activeVars).join(', ')}`)
  }

  writeFileSync(configPath, content, 'utf-8')
  console.log('✅ wrangler.jsonc 基础设施配置完成')
}

main().catch((err) => {
  console.error('❌ 配置 wrangler.jsonc 异常:', err)
  process.exit(1)
})
