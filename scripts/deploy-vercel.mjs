/**
 * 自动化 Vercel 部署脚本 (支持 GitHub Actions CI/CD)
 * 
 * 作用：
 * 1. 从 Action Secrets / 环境变量中解析出 Vercel API Token (VERCEL_TOKEN / VERCEL_API_KEY)
 * 2. 检查或自动通过 Vercel API 创建/发现项目
 * 3. 自动将当前博客所有环境变量 (BLOG_URL, GH_*, UMAMI_*, GISCUS_*) 批量同步写入 Vercel 项目
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
  'honoki'
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
      if (resolvedProject.framework !== null || resolvedProject.nodeVersion !== '22.x') {
        try {
          const patchRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
            method: 'PATCH',
            headers: apiHeaders,
            body: JSON.stringify({
              framework: null,
              nodeVersion: '22.x',
            }),
          })
          if (patchRes.ok) {
            console.log(`✓ 已将 Vercel 项目配置自动对齐为: Framework=Other, Node.js=22.x`)
          }
        } catch (e) {
          console.warn(`⚠️ 更新项目配置异常: ${e.message}`)
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
          nodeVersion: '22.x',
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
  // ⚠️ 仅当显式配置了 GH_TOKEN（例如私有文章仓库读取授权）时才同步给生产环境，严禁将 CI/CD 级别的 PAT_TOKEN 写入生产
  const ghToken = process.env.GH_TOKEN?.trim()

  const envVars = [
    { key: 'DEPLOY_PLATFORM', value: 'vercel' },
    { key: 'BLOG_URL', value: process.env.BLOG_URL },
    { key: 'GH_OWNER', value: ghOwner },
    { key: 'GH_REPO', value: ghRepo },
    { key: 'GH_BRANCH', value: ghBranch },
    { key: 'GH_TOKEN', value: ghToken },
    { key: 'GITHUB_OWNER', value: ghOwner },
    { key: 'GITHUB_REPO', value: ghRepo },
    { key: 'GITHUB_BRANCH', value: ghBranch },
    { key: 'UMAMI_HOST', value: process.env.UMAMI_HOST || process.env.UMAMI_URL },
    { key: 'UMAMI_WEBSITE_ID', value: process.env.UMAMI_WEBSITE_ID || process.env.UMAMI_ID },
    { key: 'UMAMI_API_KEY', value: process.env.UMAMI_API_KEY || process.env.UMAMI_TOKEN },
    { key: 'ENABLE_UMAMI_SCRIPT', value: process.env.ENABLE_UMAMI_SCRIPT },
    { key: 'UMAMI_SCRIPT_URL', value: process.env.UMAMI_SCRIPT_URL },
    { key: 'PURGE_SECRET', value: process.env.PURGE_SECRET },
    { key: 'GISCUS_REPO', value: process.env.GISCUS_REPO },
    { key: 'GISCUS_REPO_ID', value: process.env.GISCUS_REPO_ID },
    { key: 'GISCUS_CATEGORY', value: process.env.GISCUS_CATEGORY },
    { key: 'GISCUS_CATEGORY_ID', value: process.env.GISCUS_CATEGORY_ID },
  ].filter((item) => item.value && item.value.trim() !== '')

  // 3. 自动同步环境变量至 Vercel 项目（敏感密钥使用 sensitive 密文保护）
  const SENSITIVE_KEYS = new Set([
    'GH_TOKEN',
    'PAT_TOKEN',
    'GITHUB_TOKEN',
    'PURGE_SECRET',
    'UMAMI_API_KEY',
  ])

  console.log(`🔄 正在查询 Vercel 项目现有环境变量配置...`)
  let existingEnvs = []
  try {
    const listRes = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env`,
      { headers: apiHeaders }
    )
    if (listRes.ok) {
      const data = await listRes.json()
      existingEnvs = data.envs || []
      console.log(`✓ 获取到现有环境变量 ${existingEnvs.length} 项`)
    } else {
      const errText = await listRes.text()
      console.warn(`⚠️ 查询现有环境变量返回 [${listRes.status}]: ${errText}`)
    }
  } catch (err) {
    console.warn(`⚠️ 查询现有环境变量异常: ${err.message}`)
  }

  // 3.1 若未配置私有文章仓库 GH_TOKEN，主动清除 Vercel 中可能遗留的旧 GH_TOKEN / PAT_TOKEN
  if (!ghToken && existingEnvs.length > 0) {
    const legacyTokens = existingEnvs.filter((e) => e.key === 'GH_TOKEN' || e.key === 'PAT_TOKEN')
    for (const legacy of legacyTokens) {
      try {
        console.log(`   🧹 检测到未配置 GH_TOKEN，正在自动清除生产环境遗留的敏感变量: ${legacy.key} (${legacy.id})...`)
        await fetch(
          `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}/env/${legacy.id}`,
          {
            method: 'DELETE',
            headers: apiHeaders,
          }
        )
        console.log(`   ✓ 成功从 Vercel 生产环境移除遗留变量: ${legacy.key}`)
      } catch (err) {
        console.warn(`   ⚠️ 移除遗留变量 ${legacy.key} 异常: ${err.message}`)
      }
    }
  }

  console.log(`🔄 正在自动同步 ${envVars.length} 个环境变量至 Vercel 项目...`)
  for (const { key, value } of envVars) {
    const isSensitive = SENSITIVE_KEYS.has(key)
    const targetType = isSensitive ? 'sensitive' : 'plain'

    // 检查是否存在类型不一致的历史变量（如历史 plain 变量需升级为 sensitive 密文保护）
    // Vercel upsert 不允许直接更改变量类型，必须先删除旧类型变量后再以新类型创建
    const mismatchedEnvs = existingEnvs.filter(
      (e) => e.key === key && e.type !== targetType
    )

    for (const mismatched of mismatchedEnvs) {
      try {
        console.log(`   🔄 发现变量 ${key} 当前为 [${mismatched.type}] 类型，正在删除旧变量以升级为 [${targetType}]...`)
        const delRes = await fetch(
          `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}/env/${mismatched.id}`,
          {
            method: 'DELETE',
            headers: apiHeaders,
          }
        )
        if (delRes.ok) {
          console.log(`   ✓ 成功清理旧类型变量: ${key} (${mismatched.id})`)
        } else {
          console.warn(`   ⚠️ 清理旧变量 ${key} 状态 [${delRes.status}]`)
        }
      } catch (delErr) {
        console.warn(`   ⚠️ 清理旧变量 ${key} 异常: ${delErr.message}`)
      }
    }

    try {
      const bodyPayload = {
        key,
        value: value.trim(),
        type: targetType,
        target: ['production', 'preview', 'development'],
      }
      if (isSensitive) {
        bodyPayload.visibility = 'secret'
      }

      let envRes = await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
        {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(bodyPayload),
        }
      )

      // 容错 1：若带 visibility: 'secret' 请求失败，尝试去掉 visibility 仅保留 type: 'sensitive'
      if (!envRes.ok && isSensitive && bodyPayload.visibility) {
        delete bodyPayload.visibility
        const retryRes = await fetch(
          `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
          {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify(bodyPayload),
          }
        )
        if (retryRes.ok) {
          envRes = retryRes
        }
      }

      // 容错 2：若仍失败且属于类型冲突（可能由于 list 漏测），尝试主动删除同名变量后再次 POST
      if (!envRes.ok && envRes.status === 400) {
        try {
          const freshListRes = await fetch(
            `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env`,
            { headers: apiHeaders }
          )
          if (freshListRes.ok) {
            const freshData = await freshListRes.json()
            const toDelete = (freshData.envs || []).filter((e) => e.key === key)
            for (const item of toDelete) {
              await fetch(
                `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}/env/${item.id}`,
                {
                  method: 'DELETE',
                  headers: apiHeaders,
                }
              )
            }
            if (toDelete.length > 0) {
              envRes = await fetch(
                `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
                {
                  method: 'POST',
                  headers: apiHeaders,
                  body: JSON.stringify(bodyPayload),
                }
              )
            }
          }
        } catch {
          // 忽略二次容错异常
        }
      }

      if (envRes.ok) {
        console.log(`   ✓ 同步变量: ${key} [${targetType}${isSensitive ? ' (密文 Secret)' : ''}]`)
      } else {
        const errText = await envRes.text()
        console.warn(`   ⚠️ 同步变量 ${key} 返回: ${envRes.status} - ${errText}`)
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
