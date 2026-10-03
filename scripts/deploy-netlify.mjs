/**
 * 自动化 Netlify 部署脚本 (支持 GitHub Actions CI/CD)
 * 
 * 作用：
 * 1. 从 Action Secrets / 环境变量中解析出 Netlify API Token (NETLIFY_AUTH_TOKEN / NETLIFY_API_KEY)
 * 2. 检查或自动通过 Netlify API 创建/发现站点
 * 3. 自动将当前博客所有环境变量 (BLOG_URL, GITHUB_*, SUPABASE_*, GISCUS_*) 同步写入 Netlify 站点
 * 4. 自动生成 .netlify/state.json 建立非交互式 CI 绑定
 * 5. 调用 Netlify CLI 执行正式构建与生产部署 (netlify deploy --build --prod)
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const token = (
  process.env.NETLIFY_AUTH_TOKEN ||
  process.env.NETLIFY_TOKEN ||
  process.env.NETLIFY_API_KEY
)?.trim()

if (!token) {
  console.error('❌ [Netlify 部署失败] 未在 GitHub Secrets 中检测到 Netlify API Token！')
  console.error('')
  console.error('💡 请按以下步骤添加密钥：')
  console.error('   1. 前往 Netlify 控制台: User Settings -> Applications -> Personal access tokens -> New access token')
  console.error('   2. 前往 GitHub 仓库: Settings -> Secrets and variables -> Actions -> New repository secret')
  console.error('   3. Name 填入: NETLIFY_AUTH_TOKEN (或 NETLIFY_API_KEY)')
  console.error('   4. Value 填入生成的 Token 即可。')
  process.exit(1)
}

let siteId = process.env.NETLIFY_SITE_ID?.trim()
const siteName = (
  process.env.NETLIFY_SITE_NAME ||
  process.env.SITE_NAME ||
  process.env.GITHUB_REPO ||
  'blog'
).trim()

console.log('----------------------------------------------------')
console.log('🚀 准备执行 Netlify 自动化部署 (Edge Functions)')
console.log(`📌 目标站点名称: ${siteName}`)
if (siteId) {
  console.log(`📌 指定站点 ID: ${siteId}`)
}
console.log('----------------------------------------------------')

const apiHeaders = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 0. 预先生成文章清单
  console.log('📑 正在生成文章清单 (gen:manifest)...')
  try {
    execSync('node scripts/gen-manifest.mjs', { stdio: 'inherit' })
  } catch (e) {
    console.warn(`⚠️ 生成文章清单失败: ${e.message}`)
  }

  // 1. 获取或创建 Netlify 站点
  let resolvedSite = null
  if (!siteId) {
    try {
      const res = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
        headers: apiHeaders,
      })
      if (res.ok) {
        const sites = await res.json()
        resolvedSite = sites.find((s) => s.name === siteName)
        if (resolvedSite) {
          siteId = resolvedSite.id
          console.log(`✓ 检测到已存在的 Netlify 站点: ${resolvedSite.name} (ID: ${siteId})`)
        }
      } else {
        console.warn(`⚠️ 查询 Netlify 站点列表返回状态: ${res.status}`)
      }
    } catch (err) {
      console.warn(`⚠️ 查询 Netlify 站点异常: ${err.message}`)
    }

    if (!siteId) {
      console.log(`ℹ️ Netlify 站点 ${siteName} 尚不存在，正在通过 API 自动创建...`)
      try {
        const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ name: siteName }),
        })
        if (createRes.ok) {
          resolvedSite = await createRes.json()
          siteId = resolvedSite.id
          console.log(`✓ 成功创建 Netlify 站点: ${resolvedSite.name} (ID: ${siteId})`)
        } else if (createRes.status === 422) {
          console.warn(`⚠️ 站点名称 "${siteName}" 已被全局占用，正在尝试创建随机子域名站点...`)
          const fallbackRes = await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({}),
          })
          if (fallbackRes.ok) {
            resolvedSite = await fallbackRes.json()
            siteId = resolvedSite.id
            console.log(`✓ 成功创建 Netlify 站点: ${resolvedSite.name} (ID: ${siteId})`)
          } else {
            const errText = await fallbackRes.text()
            throw new Error(`创建 Netlify 站点失败 [${fallbackRes.status}]: ${errText}`)
          }
        } else {
          const errText = await createRes.text()
          throw new Error(`创建 Netlify 站点失败 [${createRes.status}]: ${errText}`)
        }
      } catch (err) {
        throw new Error(`调用 Netlify API 创建站点异常: ${err.message}`)
      }
    }
  }

  // 2. 生成 .netlify/state.json 建立非交互式绑定
  const netlifyDir = resolve(process.cwd(), '.netlify')
  if (!existsSync(netlifyDir)) {
    mkdirSync(netlifyDir, { recursive: true })
  }
  writeFileSync(
    resolve(netlifyDir, 'state.json'),
    JSON.stringify({ siteId }, null, 2)
  )
  console.log(`✓ 已生成 .netlify/state.json 绑定配置 (siteId: ${siteId})`)

  // 3. 收集博客所需的全部环境变量
  const envVars = [
    { key: 'BLOG_URL', value: process.env.BLOG_URL },
    { key: 'GITHUB_OWNER', value: process.env.GITHUB_OWNER },
    { key: 'GITHUB_REPO', value: process.env.GITHUB_REPO },
    { key: 'GITHUB_BRANCH', value: process.env.GITHUB_BRANCH || 'main' },
    { key: 'DATABASE_TYPE', value: process.env.DATABASE_TYPE || 'auto' },
    { key: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { key: 'SUPABASE_KEY', value: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY },
    { key: 'PURGE_SECRET', value: process.env.PURGE_SECRET },
    { key: 'GITHUB_TOKEN', value: process.env.PAT_TOKEN || process.env.GITHUB_TOKEN },
    { key: 'GISCUS_REPO', value: process.env.GISCUS_REPO },
    { key: 'GISCUS_REPO_ID', value: process.env.GISCUS_REPO_ID },
    { key: 'GISCUS_CATEGORY', value: process.env.GISCUS_CATEGORY },
    { key: 'GISCUS_CATEGORY_ID', value: process.env.GISCUS_CATEGORY_ID },
    { key: 'GISCUS_THEME_LIGHT', value: process.env.GISCUS_THEME_LIGHT },
    { key: 'GISCUS_THEME_DARK', value: process.env.GISCUS_THEME_DARK },
  ].filter((item) => item.value && item.value.trim() !== '')

  // 4. 自动同步环境变量至 Netlify 站点
  console.log(`🔄 正在自动同步 ${envVars.length} 个环境变量至 Netlify 站点...`)
  const tempEnvPath = resolve(process.cwd(), '.env.netlify.tmp')
  try {
    const envLines = envVars.map(({ key, value }) => `${key}=${value.trim()}`).join('\n')
    writeFileSync(tempEnvPath, envLines, 'utf-8')

    execSync(`npx --yes netlify-cli env:import "${tempEnvPath}"`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NETLIFY_AUTH_TOKEN: token,
        NETLIFY_SITE_ID: siteId,
      },
    })
    console.log('✓ 环境变量同步完成！')
  } catch (err) {
    console.warn(`⚠️ 环境变量同步警告: ${err.message}`)
  } finally {
    if (existsSync(tempEnvPath)) {
      unlinkSync(tempEnvPath)
    }
  }

  // 5. 调用 Netlify CLI 执行构建并发布到生产环境
  console.log('📦 正在调用 Netlify CLI 执行构建并发布到生产环境...')
  const deployCmd = `npx --yes netlify-cli deploy --build --prod --dir=public`
  execSync(deployCmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NETLIFY_AUTH_TOKEN: token,
      NETLIFY_SITE_ID: siteId,
    },
  })
  console.log('🎉 Netlify 部署成功完成！')

  if (!process.env.BLOG_URL) {
    console.log('')
    console.log('====================================================================')
    console.log('💡 [后续建议] 当前部署未设置 BLOG_URL 环境变量：')
    console.log('   当前博客已自动适配并使用上方 Netlify 分配的实际请求域名运行。')
    console.log('   若需要启用推送文章时自动触发边缘缓存刷新 Webhook，可后续配置：')
    console.log('   1. 前往 GitHub 仓库: Settings -> Secrets and variables -> Actions')
    console.log('   2. 点击 Variables 标签页 -> New repository variable')
    console.log('   3. Name 填入: BLOG_URL')
    console.log('   4. Value 填入上方 Netlify 域名 (如: https://your-site.netlify.app 或自定义域名)')
    console.log('====================================================================')
  }
}

main().catch((err) => {
  console.error('❌ Netlify 部署过程中发生错误:', err)
  process.exit(1)
})
