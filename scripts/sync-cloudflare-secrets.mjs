/**
 * 将敏感凭据（PURGE_SECRET、SUPABASE_KEY 等）作为加密 Secret 同步到 Cloudflare Worker
 * 
 * 作用：
 * 1. 避免敏感密钥以明文变量 (vars) 暴露在 Cloudflare 控制台与配置中
 * 2. 使用 Cloudflare API 将密钥直接存为 secret_text（密文存储）
 * 3. 自动识别私有仓库 GH_TOKEN；若未配置 GH_TOKEN 则自动清除遗留的 GH_TOKEN / PAT_TOKEN
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()
let accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.ACCOUNT_ID)?.trim()
let workerName = process.env.WORKER_NAME?.trim()

if (!apiToken) {
  console.log('ℹ️ 未检测到 CLOUDFLARE_API_TOKEN，跳过 Worker 密文同步。')
  process.exit(0)
}

// 自动从 wrangler.jsonc 读取 workerName
if (!workerName) {
  try {
    const configPath = resolve(process.cwd(), 'wrangler.jsonc')
    if (existsSync(configPath)) {
      const configText = readFileSync(configPath, 'utf-8')
      const match = configText.match(/"name":\s*"([^"]+)"/)
      if (match) {
        workerName = match[1]
      }
    }
  } catch {}
}
if (!workerName) {
  workerName = 'blog'
}

const apiHeaders = {
  Authorization: `Bearer ${apiToken}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 1. 若未显式提供 accountId，自动通过 Cloudflare API 查询
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
    console.warn('⚠️ 缺少 CLOUDFLARE_ACCOUNT_ID，无法调用 Cloudflare Secret API。')
    return
  }

  // 2. 收集需要作为密文保护的变量
  const ghToken = process.env.GH_TOKEN?.trim()

  const secretEntries = [
    { key: 'PURGE_SECRET', value: process.env.PURGE_SECRET?.trim() },
    { key: 'SUPABASE_KEY', value: (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)?.trim() },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() },
    { key: 'DATABASE_URL', value: process.env.DATABASE_URL?.trim() },
    { key: 'GH_TOKEN', value: ghToken },
  ].filter((item) => item.value && item.value !== '')

  console.log(`🔒 正在向 Cloudflare Worker [${workerName}] 同步加密 Secret...`)

  // 3. 将敏感变量逐一写入 Cloudflare Worker Secret
  for (const { key, value } of secretEntries) {
    try {
      const putRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/secrets`,
        {
          method: 'PUT',
          headers: apiHeaders,
          body: JSON.stringify({
            name: key,
            text: value,
            type: 'secret_text',
          }),
        }
      )

      if (putRes.ok) {
        console.log(`   ✓ 同步密文: ${key} (Cloudflare Secret)`)
      } else {
        const errText = await putRes.text()
        console.warn(`   ⚠️ 同步密文 ${key} 状态 [${putRes.status}]: ${errText}`)
      }
    } catch (err) {
      console.warn(`   ⚠️ 同步密文 ${key} 异常: ${err.message}`)
    }
  }

  // 4. 若未配置 GH_TOKEN（如公开仓库），主动清理 Worker 中可能遗留的旧 GH_TOKEN / PAT_TOKEN
  if (!ghToken) {
    for (const legacyKey of ['GH_TOKEN', 'PAT_TOKEN']) {
      try {
        const delRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/secrets/${legacyKey}`,
          {
            method: 'DELETE',
            headers: apiHeaders,
          }
        )
        if (delRes.ok) {
          console.log(`   🧹 已从 Worker 清除遗留变量: ${legacyKey}`)
        }
      } catch {
        // 不存在则忽略
      }
    }
  }

  console.log('✅ Cloudflare Worker 密文同步完成！')
}

main().catch((err) => {
  console.warn('⚠️ Cloudflare Worker 密文同步警告:', err.message)
})
