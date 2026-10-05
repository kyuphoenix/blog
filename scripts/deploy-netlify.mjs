/**
 * 自动化 Netlify 部署脚本 (支持 GitHub Actions CI/CD)
 * 
 * 作用：
 * 1. 从 Action Secrets / 环境变量中解析出 Netlify API Token (NETLIFY_AUTH_TOKEN / NETLIFY_API_KEY)
 * 2. 检查已配置的 NETLIFY_SITE_ID，或智能复用现有 Netlify 站点（永久防止每次部署创建新项目导致域名变更）
 * 3. 自动将当前博客所有环境变量 (BLOG_URL, GITHUB_*, SUPABASE_*, GISCUS_*) 同步写入目标 Netlify 站点
 * 4. 自动生成 .netlify/state.json 建立非交互式 CI 绑定
 * 5. 调用 Netlify CLI 执行正式构建与生产部署 (netlify deploy --site="<siteId>" --build --prod)
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

let siteId = (
  process.env.NETLIFY_SITE_ID ||
  process.env.SITE_ID
)?.trim()

const rawSiteName = (
  process.env.NETLIFY_SITE_NAME ||
  process.env.SITE_NAME ||
  process.env.GH_REPO ||
  process.env.GITHUB_REPO ||
  'blog'
).trim()

const blogUrl = (process.env.BLOG_URL || '').trim()

console.log('----------------------------------------------------')
console.log('🚀 准备执行 Netlify 自动化部署 (Edge Functions)')
if (siteId) {
  console.log(`📌 指定站点 ID: ${siteId}`)
} else {
  console.log(`📌 目标站点名称/关键字: ${rawSiteName}`)
  if (blogUrl) {
    console.log(`📌 目标绑定域名 (BLOG_URL): ${blogUrl}`)
  }
}
console.log('----------------------------------------------------')

const apiHeaders = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 0. 执行完整 Netlify 前置构建（生成清单、编译 Tailwind CSS、Swup 客户端与打包 Edge Function）
  console.log('🏗️  正在执行 Netlify 前置构建 (build:netlify)...')
  try {
    execSync('node scripts/build-netlify.mjs', { stdio: 'inherit' })
  } catch (e) {
    console.warn(`⚠️ Netlify 前置构建失败: ${e.message}`)
  }

  // 1. 获取或智能复用已存在的 Netlify 站点（永久防止反复新建站点）
  let resolvedSite = null

  // 1.1 如果显式指定了 siteId，直接查询验证该站点
  if (siteId) {
    try {
      const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
        headers: apiHeaders,
      })
      if (res.ok) {
        resolvedSite = await res.json()
        console.log(`✓ 成功验证指定站点: ${resolvedSite.name} (ID: ${siteId}, URL: ${resolvedSite.ssl_url || resolvedSite.url})`)
      } else {
        console.warn(`⚠️ 无法通过指定的 NETLIFY_SITE_ID (${siteId}) 获取站点 [状态码 ${res.status}]，尝试自动寻找现有站点...`)
        siteId = null
      }
    } catch (err) {
      console.warn(`⚠️ 查询指定 Netlify 站点异常: ${err.message}`)
      siteId = null
    }
  }

  // 1.2 若未指定 siteId 或指定无效，智能检索账户下的所有站点并精确复用
  if (!siteId) {
    let allSites = []
    try {
      const res = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
        headers: apiHeaders,
      })
      if (res.ok) {
        allSites = await res.json()
        console.log(`ℹ️ 已检索到 Netlify 账户下现有的 ${allSites.length} 个站点`)
      } else {
        console.warn(`⚠️ 查询 Netlify 站点列表返回状态: ${res.status}`)
      }
    } catch (err) {
      console.warn(`⚠️ 查询 Netlify 站点异常: ${err.message}`)
    }

    if (allSites.length > 0) {
      // 策略 A: 优先根据 BLOG_URL 匹配（例如 https://cheery-dieffenbachia-c5852e.netlify.app）
      if (blogUrl) {
        try {
          const blogHost = new URL(blogUrl).hostname.toLowerCase()
          const blogSubdomain = blogHost.replace(/\.netlify\.app$/, '')
          resolvedSite = allSites.find((s) => {
            const sName = (s.name || '').toLowerCase()
            const sCustom = (s.custom_domain || '').toLowerCase()
            const sUrl = (s.url || '').toLowerCase()
            const sSsl = (s.ssl_url || '').toLowerCase()
            return (
              sName === blogSubdomain ||
              sCustom === blogHost ||
              sUrl.includes(blogHost) ||
              sSsl.includes(blogHost)
            )
          })
          if (resolvedSite) {
            siteId = resolvedSite.id
            console.log(`✓ [匹配策略 A] 成功根据 BLOG_URL (${blogUrl}) 锁定已有站点: ${resolvedSite.name} (ID: ${siteId})`)
          }
        } catch {}
      }

      // 策略 B: 根据显式指定的 NETLIFY_SITE_NAME 精确匹配站点名称
      if (!resolvedSite && rawSiteName && rawSiteName.toLowerCase() !== 'blog') {
        resolvedSite = allSites.find((s) => (s.name || '').toLowerCase() === rawSiteName.toLowerCase())
        if (resolvedSite) {
          siteId = resolvedSite.id
          console.log(`✓ [匹配策略 B] 成功根据站点名称 (${rawSiteName}) 锁定已有站点: ${resolvedSite.name} (ID: ${siteId})`)
        }
      }

      // 策略 C: 账户下仅有 1 个 Netlify 站点，毫不犹豫直接复用该站点
      if (!resolvedSite && allSites.length === 1) {
        resolvedSite = allSites[0]
        siteId = resolvedSite.id
        console.log(`✓ [匹配策略 C] 账户下仅存在 1 个站点，自动复用: ${resolvedSite.name} (ID: ${siteId})`)
      }

      // 策略 D: 查找包含博客仓库关键字的站点，或复用最近更新活跃的站点
      if (!resolvedSite) {
        const repoName = (process.env.GH_REPO || process.env.GITHUB_REPO || '').toLowerCase()
        if (repoName) {
          resolvedSite = allSites.find((s) => (s.name || '').toLowerCase().includes(repoName))
        }
        if (!resolvedSite) {
          // 按 updated_at 降序排序，锁定最近活跃的站点
          allSites.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
          resolvedSite = allSites[0]
        }
        if (resolvedSite) {
          siteId = resolvedSite.id
          console.log(`✓ [匹配策略 D] 自动锁定并复用已有站点: ${resolvedSite.name} (ID: ${siteId}, URL: ${resolvedSite.ssl_url || resolvedSite.url})`)
        }
      }
    }

    // 1.3 仅当账户下完全没有任何已有站点时，才自动创建初始站点
    if (!siteId) {
      console.log(`ℹ️ Netlify 账户下暂无任何站点，正在通过 API 自动创建初始站点...`)
      try {
        const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(rawSiteName.toLowerCase() !== 'blog' ? { name: rawSiteName } : {}),
        })
        if (createRes.ok) {
          resolvedSite = await createRes.json()
          siteId = resolvedSite.id
          console.log(`✓ 成功创建 Netlify 站点: ${resolvedSite.name} (ID: ${siteId})`)
        } else {
          // 若指定名称已被占用，创建随机子域名初始站点
          const fallbackRes = await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({}),
          })
          if (fallbackRes.ok) {
            resolvedSite = await fallbackRes.json()
            siteId = resolvedSite.id
            console.log(`✓ 成功创建 Netlify 初始站点: ${resolvedSite.name} (ID: ${siteId})`)
          } else {
            const errText = await fallbackRes.text()
            throw new Error(`创建 Netlify 站点失败: ${errText}`)
          }
        }
      } catch (err) {
        throw new Error(`调用 Netlify API 创建站点异常: ${err.message}`)
      }
    }
  }

  // 1.4 尝试将当前 siteId 自动持久化写入 GitHub 仓库变量 (需 GH_TOKEN 授权)
  if (process.env.GITHUB_ACTIONS && siteId && (process.env.GH_TOKEN || process.env.PAT_TOKEN || process.env.GITHUB_TOKEN)) {
    try {
      execSync(`gh variable set NETLIFY_SITE_ID --body "${siteId}"`, {
        stdio: 'ignore',
        env: {
          ...process.env,
          GH_TOKEN: process.env.GH_TOKEN || process.env.PAT_TOKEN || process.env.GITHUB_TOKEN,
        },
      })
      console.log(`✓ 已成功将 NETLIFY_SITE_ID (${siteId}) 自动写入 GitHub 仓库变量！`)
    } catch {
      // 忽略因 GITHUB_TOKEN 权限受限导致的写入警告
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
  const ghOwner = process.env.GH_OWNER || process.env.GITHUB_OWNER
  const ghRepo = process.env.GH_REPO || process.env.GITHUB_REPO
  const ghBranch = process.env.GH_BRANCH || process.env.GITHUB_BRANCH || 'main'
  const ghToken = process.env.GH_TOKEN || process.env.PAT_TOKEN || process.env.GITHUB_TOKEN

  const envVars = [
    { key: 'BLOG_URL', value: blogUrl || resolvedSite?.ssl_url || resolvedSite?.url },
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

  // 4. 自动同步环境变量至 Netlify 站点
  console.log(`🔄 正在自动同步 ${envVars.length} 个环境变量至 Netlify 站点 (${siteId})...`)
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

  // 5. 调用 Netlify CLI 执行构建并发布到生产环境（显式锁定 --site 防止任何漂移）
  console.log(`📦 正在调用 Netlify CLI 部署至目标生产站点 [${siteId}]...`)
  const deployCmd = `npx --yes netlify-cli deploy --site="${siteId}" --build --prod --dir=public`
  execSync(deployCmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NETLIFY_AUTH_TOKEN: token,
      NETLIFY_SITE_ID: siteId,
    },
  })

  const finalSiteUrl = resolvedSite?.ssl_url || resolvedSite?.url || (resolvedSite?.name ? `https://${resolvedSite.name}.netlify.app` : 'https://app.netlify.com')

  console.log('')
  console.log('====================================================================')
  console.log('🎉 Netlify 部署成功完成！')
  console.log(`🌐 站点线上访问地址: ${finalSiteUrl}`)
  console.log(`🆔 目标站点 ID:     ${siteId}`)
  console.log('====================================================================')
  console.log('💡 [永久锁定站点建议 - 确保 URL 恒定不变]：')
  console.log('   为确保未来每次触发部署均百分之百更新本站点，推荐前往 GitHub 仓库：')
  console.log('   Settings -> Secrets and variables -> Actions -> Variables 标签页')
  console.log('   点击 "New repository variable" 添加以下变量：')
  console.log(`   - Name:  NETLIFY_SITE_ID`)
  console.log(`   - Value: ${siteId}`)
  if (!process.env.BLOG_URL) {
    console.log('')
    console.log('   同时建议添加博客主域名变量：')
    console.log(`   - Name:  BLOG_URL`)
    console.log(`   - Value: ${finalSiteUrl}`)
  }
  console.log('====================================================================')

  console.log('')
  console.log('====================================================================')
  console.log('💡 [访问提示] 若访问该 Netlify 站点时提示重定向到登录页面：')
  console.log('   Netlify 对部分团队默认开启了访问保护 (Project visibility: Private)。')
  console.log('   请登录 Netlify 控制台将其调整为公开访问：')
  console.log('   1. 登录 https://app.netlify.com/ 进入对应站点')
  console.log('   2. 点击 Site configuration -> Access & security (或 Visitor access)')
  console.log('   3. 在 Project visibility 中将 Private 改为 Public，点击 Save 即可！')
  console.log('====================================================================')
}

main().catch((err) => {
  console.error('❌ Netlify 部署过程中发生错误:', err)
  process.exit(1)
})
