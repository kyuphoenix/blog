/**
 * 自动化 Vercel 部署脚本 (支持 GitHub Actions CI/CD)
 * 
 * 作用：
 * 1. 从 Action Secrets / 环境变量中解析出 Vercel API Token (VERCEL_TOKEN / VERCEL_API_KEY)
 * 2. 检查或自动通过 Vercel API 创建/发现项目
 * 3. 自动将当前博客所有环境变量 (BLOG_URL, GITHUB_*, SUPABASE_*, GISCUS_*) 批量同步写入 Vercel 项目
 * 4. 自动生成 .vercel/project.json 建立非交互式 CI 绑定
 * 5. 调用 Vercel CLI 执行正式生产部署 (vercel deploy --prod)
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const token = (
  process.env.VERCEL_TOKEN ||
  process.env.VERCEL_API_KEY ||
  process.env.VERCEL_AUTH_TOKEN
)?.trim()

if (!token) {
  console.error('❌ [Vercel 部署失败] 未在 GitHub Secrets 中检测到 Vercel API Token！')
  console.error('')
  console.error('💡 请按以下步骤添加密钥：')
  console.error('   1. 前往 Vercel 控制台: Account Settings -> Tokens -> Create')
  console.error('   2. 前往 GitHub 仓库: Settings -> Secrets and variables -> Actions -> New repository secret')
  console.error('   3. Name 填入: VERCEL_TOKEN (或 VERCEL_API_KEY)')
  console.error('   4. Value 填入生成的 Token 即可。')
  process.exit(1)
}

const projectName = (
  process.env.VERCEL_PROJECT_NAME ||
  process.env.PROJECT_NAME ||
  process.env.GH_REPO ||
  process.env.GITHUB_REPO ||
  'blog'
).trim()

const orgId = process.env.VERCEL_ORG_ID?.trim()
const projectId = process.env.VERCEL_PROJECT_ID?.trim()

console.log('----------------------------------------------------')
console.log('🚀 准备执行 Vercel 自动化部署 (Hono Native / Fluid Compute)')
console.log(`📌 目标项目名称: ${projectName}`)
console.log('----------------------------------------------------')

const apiHeaders = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 0. 执行 Vercel Build Output API 全量构建
  console.log('🏗️  正在执行 Vercel 生产产物构建 (build:vercel)...')
  try {
    execSync('node scripts/build-vercel.mjs', { stdio: 'inherit' })
  } catch (e) {
    console.error(`❌ 构建 Vercel 产物失败: ${e.message}`)
    process.exit(1)
  }

  // 1. 获取或创建 Vercel 项目
  let resolvedProject = null
  try {
    const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
      headers: apiHeaders,
    })
    if (res.ok) {
      resolvedProject = await res.json()
      console.log(`✓ 检测到已存在的 Vercel 项目: ${resolvedProject.name} (ID: ${resolvedProject.id})`)
      if (resolvedProject.framework !== null) {
        try {
          const patchRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
            method: 'PATCH',
            headers: apiHeaders,
            body: JSON.stringify({
              framework: null,
            }),
          })
          if (patchRes.ok) {
            console.log(`✓ 已将 Vercel 项目 Framework Preset 自动设为: Other (Build Output API)`)
          }
        } catch (e) {
          console.warn(`⚠️ 更新项目 Framework 异常: ${e.message}`)
        }
      }
    } else if (res.status === 404) {
      console.log(`ℹ️ Vercel 项目 ${projectName} 尚不存在，正在通过 API 自动创建...`)
      const createRes = await fetch('https://api.vercel.com/v11/projects', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          name: projectName,
          framework: null,
        }),
      })
      if (!createRes.ok) {
        const errText = await createRes.text()
        console.warn(`⚠️ 自动创建项目状态 [${createRes.status}]: ${errText}`)
      } else {
        resolvedProject = await createRes.json()
        console.log(`✓ 成功创建 Vercel 项目: ${resolvedProject.name} (ID: ${resolvedProject.id})`)
      }
    }
  } catch (err) {
    console.warn(`⚠️ 查询/创建 Vercel 项目异常: ${err.message}`)
  }

  // 2. 收集博客所需的全部环境变量
  const ghOwner = process.env.GH_OWNER || process.env.GITHUB_OWNER
  const ghRepo = process.env.GH_REPO || process.env.GITHUB_REPO
  const ghBranch = process.env.GH_BRANCH || process.env.GITHUB_BRANCH || 'main'
  const ghToken = process.env.GH_TOKEN || process.env.PAT_TOKEN || process.env.GITHUB_TOKEN

  const envVars = [
    { key: 'BLOG_URL', value: process.env.BLOG_URL },
    { key: 'GH_OWNER', value: ghOwner },
    { key: 'GH_REPO', value: ghRepo },
    { key: 'GH_BRANCH', value: ghBranch },
    { key: 'GH_TOKEN', value: ghToken },
    { key: 'GITHUB_OWNER', value: ghOwner },
    { key: 'GITHUB_REPO', value: ghRepo },
    { key: 'GITHUB_BRANCH', value: ghBranch },
    { key: 'DATABASE_TYPE', value: process.env.DATABASE_TYPE || 'auto' },
    { key: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { key: 'SUPABASE_KEY', value: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY },
    { key: 'PURGE_SECRET', value: process.env.PURGE_SECRET },
    { key: 'GISCUS_REPO', value: process.env.GISCUS_REPO },
    { key: 'GISCUS_REPO_ID', value: process.env.GISCUS_REPO_ID },
    { key: 'GISCUS_CATEGORY', value: process.env.GISCUS_CATEGORY },
    { key: 'GISCUS_CATEGORY_ID', value: process.env.GISCUS_CATEGORY_ID },
    { key: 'GISCUS_THEME_LIGHT', value: process.env.GISCUS_THEME_LIGHT },
    { key: 'GISCUS_THEME_DARK', value: process.env.GISCUS_THEME_DARK },
  ].filter((item) => item.value && item.value.trim() !== '')

  // 3. 自动同步环境变量至 Vercel 项目（免去手动在控制台添加）
  console.log(`🔄 正在自动同步 ${envVars.length} 个环境变量至 Vercel 项目...`)
  for (const { key, value } of envVars) {
    try {
      const envRes = await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
        {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            key,
            value: value.trim(),
            type: 'plain',
            target: ['production', 'preview', 'development'],
          }),
        }
      )
      if (envRes.ok) {
        console.log(`   ✓ 同步变量: ${key}`)
      } else {
        console.warn(`   ⚠️ 同步变量 ${key} 返回: ${envRes.status}`)
      }
    } catch (e) {
      console.warn(`   ⚠️ 同步变量 ${key} 失败: ${e.message}`)
    }
  }

  // 4. 生成 .vercel/project.json 建立非交互式绑定
  const vercelDir = resolve(process.cwd(), '.vercel')
  if (!existsSync(vercelDir)) {
    mkdirSync(vercelDir, { recursive: true })
  }
  const projectJsonPath = resolve(vercelDir, 'project.json')
  let finalOrgId = orgId || resolvedProject?.accountId || ''
  if (!finalOrgId) {
    try {
      const userRes = await fetch('https://api.vercel.com/v2/user', { headers: apiHeaders })
      if (userRes.ok) {
        const userData = await userRes.json()
        finalOrgId = userData.user?.id || ''
      }
    } catch {
      // 忽略 fallback 错误
    }
  }
  const finalProjectId = projectId || resolvedProject?.id || ''
  if (finalProjectId) {
    writeFileSync(
      projectJsonPath,
      JSON.stringify(
        {
          orgId: finalOrgId,
          projectId: finalProjectId,
        },
        null,
        2
      )
    )
    console.log(`✓ 已生成 .vercel/project.json 绑定配置 (Project: ${finalProjectId}, Org: ${finalOrgId || 'default'})`)
  }

  // 5. 调用 Vercel CLI 执行正式部署
  console.log('📦 正在调用 Vercel CLI 执行生产环境部署 (Build Output API --prebuilt)...')
  const deployCmd = `npx --yes vercel deploy --prebuilt --prod --yes --token=${token}`
  execSync(deployCmd, { stdio: 'inherit' })
  console.log('🎉 Vercel 部署成功完成！')

  if (!process.env.BLOG_URL) {
    console.log('')
    console.log('====================================================================')
    console.log('💡 [后续建议] 当前部署未设置 BLOG_URL 环境变量：')
    console.log('   当前博客已自动适配并使用上方 Vercel 分配的实际请求域名运行。')
    console.log('   若需要启用推送文章时自动触发边缘缓存刷新 Webhook，可后续配置：')
    console.log('   1. 前往 GitHub 仓库: Settings -> Secrets and variables -> Actions')
    console.log('   2. 点击 Variables 标签页 -> New repository variable')
    console.log('   3. Name 填入: BLOG_URL')
    console.log('   4. Value 填入上方 Vercel 域名 (如: https://your-project.vercel.app 或自定义域名)')
    console.log('====================================================================')
  }
}

main().catch((err) => {
  console.error('❌ Vercel 部署过程中发生错误:', err)
  process.exit(1)
})
