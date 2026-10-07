/**
 * Supabase 数据库自动检测与初始化脚本
 * 
 * 作用：
 * 1. 部署阶段自动检测 Supabase 中是否已存在统计表 (post_stats / page_views)。
 * 2. 若已初始化，立即跳过，无多余操作和耗时。
 * 3. 若尚未初始化，支持通过以下方式全自动执行 db/schema.supabase.sql 建表：
 *    - 方式 A：配置了 DATABASE_URL / SUPABASE_DB_URL (PostgreSQL 直连，推荐)
 *    - 方式 B：配置了 SUPABASE_ACCESS_TOKEN (Supabase Management API)
 * 4. 若未提供 DDL 执行权限凭证，打印清晰友好的初始化指引。
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Client } = pg

const dbType = (process.env.DATABASE_TYPE || process.env.DB_TYPE || 'auto').toLowerCase().trim()
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY
)?.trim()
const databaseUrl = (
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL
)?.trim()
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const d1Id = (process.env.CLOUDFLARE_D1_ID || process.env.D1_DATABASE_ID)?.trim()

async function main() {
  console.log('----------------------------------------------------')
  console.log('🛠️  Supabase 数据库状态检测与初始化检查')
  console.log('----------------------------------------------------')

  // 1. 判断当前部署是否使用 Supabase
  if (dbType === 'umami' || dbType === 'd1' || dbType === 'none' || dbType === 'off' || dbType === 'disabled') {
    console.log(`ℹ️  当前目标为 ${dbType}，跳过 Supabase 初始化检测。`)
    return
  }

  if (dbType === 'auto') {
    if (d1Id && !supabaseUrl) {
      console.log('ℹ️  [auto 模式] 检测到 D1 数据库配置且未配置 Supabase，跳过 Supabase 检测。')
      return
    }
    if (!supabaseUrl && !supabaseKey && !databaseUrl) {
      console.log('ℹ️  [auto 模式] 未检测到 Supabase 配置，跳过 Supabase 检测。')
      return
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    if (dbType === 'supabase') {
      console.warn('⚠️  已显式指定使用 Supabase，但未配置 SUPABASE_URL 或 SUPABASE_KEY，跳过检测。')
    }
    return
  }

  console.log(`📡 连接 Supabase 实例: ${supabaseUrl}`)

  // 2. 检测数据库表是否已存在
  let isInitialized = false
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  try {
    const { data, error } = await supabase.from('post_stats').select('slug').limit(1)

    if (!error) {
      console.log('✅ post_stats 表已存在且工作正常，数据库已初始化，无需重复建表。')
      return
    }

    // 检查错误是否属于“表不存在”
    const errorMsg = (error.message || '').toLowerCase()
    const isTableMissing =
      error.code === 'PGRST204' ||
      error.code === '42P01' ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('could not find the') ||
      errorMsg.includes('schema cache')

    if (!isTableMissing) {
      // 其他错误（如认证失败、网络超时等）
      console.warn(`⚠️  检测 post_stats 时遇到非表缺失异常 [code: ${error.code}]: ${error.message}`)
      if (error.code === 'PGRST301' || errorMsg.includes('jwt')) {
        console.warn('⚠️  请检查 SUPABASE_KEY 是否有效。')
        return
      }
    } else {
      console.log('🔍 post_stats 表尚未创建，准备执行自动初始化...')
    }
  } catch (err) {
    console.warn(`⚠️  检测 Supabase 出现异常: ${err.message}`)
  }

  // 3. 读取 SQL 架构文件
  const schemaPath = resolve(process.cwd(), 'db/schema.supabase.sql')
  if (!existsSync(schemaPath)) {
    console.error(`❌ 未找到架构文件: ${schemaPath}`)
    return
  }
  const sql = readFileSync(schemaPath, 'utf-8')

  // 4. 尝试方式 A: 使用 PostgreSQL 连接串直连执行建表 (DATABASE_URL / SUPABASE_DB_URL)
  if (databaseUrl) {
    console.log('🚀 检测到 DATABASE_URL / SUPABASE_DB_URL，正在通过 PostgreSQL 直连自动初始化数据库...')
    try {
      const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      })
      await client.connect()
      await client.query(sql)
      await client.end()
      console.log('🎉 数据库初始化成功！已成功创建 page_views, post_stats 表与 increment_page_view 函数。')

      // 二次验证
      await verifyInitialization(supabase)
      return
    } catch (err) {
      console.error(`❌ 通过 PostgreSQL 连接初始化失败: ${err.message}`)
      console.log('⚠️  请检查 DATABASE_URL 连接串及密码是否正确。')
    }
  }

  // 5. 尝试方式 B: 使用 Supabase Management API 执行建表 (SUPABASE_ACCESS_TOKEN)
  if (accessToken) {
    console.log('🚀 检测到 SUPABASE_ACCESS_TOKEN，正在通过 Supabase Management API 自动初始化数据库...')
    try {
      let projectRef = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF
      if (!projectRef) {
        const parsed = new URL(supabaseUrl)
        projectRef = parsed.hostname.split('.')[0]
      }

      console.log(`📌 Supabase 项目 Ref: ${projectRef}`)
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      })

      if (res.ok) {
        console.log('🎉 通过 Supabase Management API 初始化成功！已创建数据表与函数。')
        // 二次验证
        await verifyInitialization(supabase)
        return
      } else {
        const text = await res.text()
        console.warn(`⚠️  Management API 返回错误 (${res.status}): ${text}`)
      }
    } catch (err) {
      console.error(`❌ 通过 Supabase Management API 初始化失败: ${err.message}`)
    }
  }

  // 6. 若未配置 DATABASE_URL 或 SUPABASE_ACCESS_TOKEN，输出指导信息
  console.log('========================================================================')
  console.log('⚠️  [Supabase 自动初始化提示]')
  console.log('检测到当前 Supabase 尚未初始化数据表 (post_stats / page_views)。')
  console.log('由于目前仅提供了 PostgREST 数据 API Key (Publishable key)，无法直接通过公开接口执行 DDL 建表。')
  console.log('')
  console.log('💡 若希望 GitHub Actions 全自动完成建表，只需在 GitHub Secrets 配置：')
  console.log('   `DATABASE_URL` (PostgreSQL 直连连接串)')
  console.log('   获取路径: 进入 Supabase 对应数据库 -> 点击顶部绿色 Connect 按钮 -> Direct -> Session pooler -> 复制 URI')
  console.log('   (用创建数据库时的密码替换 [YOUR-PASSWORD]，包含特殊字符需 URL 编码)')
  console.log('')
  console.log('👉 或者手动在控制台执行一次建表：')
  console.log('   复制项目中的 db/schema.supabase.sql 内容，粘贴到 Supabase 控制台 SQL Editor 并点击 Run。')
  console.log('========================================================================')
}

async function verifyInitialization(supabase) {
  try {
    // 稍微等待 1 秒以确保 PostgREST schema cache 刷新
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const { error } = await supabase.from('post_stats').select('slug').limit(1)
    if (!error) {
      console.log('✅ [二次验证] post_stats 表已就绪并可正常访问！')
    } else {
      console.log(`ℹ️ [二次验证提示] DDL 已执行，PostgREST schema cache 可能需要数秒刷新。`)
    }
  } catch {
    // 忽略二次验证的非关键异常
  }
}

main().catch((err) => {
  console.error('❌ 执行初始化检测时发生异常:', err)
  // 不阻断部署主流程
  process.exit(0)
})
