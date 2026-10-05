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

/**
 * 将字符串清洗为合法的 Netlify 二级域名前缀 (符合 RFC 1123 DNS 规范)
 * 仅包含小写字母、数字与连字符，且首尾不为连字符，最大长度 37 字符
 */
function sanitizeSiteName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 37)
}

let siteId = (
  process.env.NETLIFY_SITE_ID ||
  process.env.SITE_ID
)?.trim()

const ghOwner = (process.env.GH_OWNER || process.env.GITHUB_OWNER || '').trim()
const ghRepo = (process.env.GH_REPO || process.env.GITHUB_REPO || 'blog').trim()
const ghBranch = (process.env.GH_BRANCH || process.env.GITHUB_BRANCH || 'main').trim()
const ghCiToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.PAT_TOKEN || '').trim()

// 根据 GH_OWNER, GH_REPO, GH_BRANCH 智能拼接唯一项目名称
// 例如：kyuphoenix + blog (+ main) -> kyuphoenix-blog
let autoSiteName = 'blog'
if (ghOwner && ghRepo) {
  autoSiteName = (ghBranch && ghBranch !== 'main' && ghBranch !== 'master')
    ? `${ghOwner}-${ghRepo}-${ghBranch}`
    : `${ghOwner}-${ghRepo}`
} else if (ghRepo) {
  autoSiteName = ghRepo
}

const rawSiteName = (
  process.env.NETLIFY_SITE_NAME ||
  process.env.SITE_NAME ||
  autoSiteName
).trim()

const siteName = sanitizeSiteName(rawSiteName)
const blogUrl = (process.env.BLOG_URL || '').trim()

console.log('----------------------------------------------------')
console.log('🚀 准备执行 Netlify 自动化部署 (Edge Functions)')
if (siteId) {
  console.log(`📌 指定站点 ID: ${siteId}`)
} else {
  console.log(`📌 目标站点名称: ${siteName} (来源: ${rawSiteName === autoSiteName ? '自动拼接 GH_OWNER-GH_REPO' : '自定义配置'})`)
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
      // 策略 A: 优先根据命名规则计算出的唯一站点名称 (如 kyuphoenix-blog) 精确匹配已有站点
      if (siteName) {
        resolvedSite = allSites.find((s) => (s.name || '').toLowerCase() === siteName)
        if (resolvedSite) {
          siteId = resolvedSite.id
          console.log(`✓ [精确匹配] 成功在当前账户下匹配到专属站点: ${resolvedSite.name} (ID: ${siteId}, URL: ${resolvedSite.ssl_url || resolvedSite.url})`)
        }
      }

      // 策略 B: 其次若用户明确配置了 BLOG_URL，检查是否与某个站点的域名/子域名精确对应
      if (!resolvedSite && blogUrl) {
        try {
          const blogHost = new URL(blogUrl).hostname.toLowerCase()
          const blogSubdomain = blogHost.replace(/\.netlify\.app$/, '')
          resolvedSite = allSites.find((s) => {
            const sName = (s.name || '').toLowerCase()
            const sCustom = (s.custom_domain || '').toLowerCase()
            return sName === blogSubdomain || sCustom === blogHost
          })
          if (resolvedSite) {
            siteId = resolvedSite.id
            console.log(`✓ [域名匹配] 成功根据 BLOG_URL (${blogUrl}) 锁定已有站点: ${resolvedSite.name} (ID: ${siteId})`)
          }
        } catch {}
      }
    }

    // 1.3 仅当账户下未找到匹配的专属站点时，严格按照命名规则创建新站点（严禁盲目覆盖账户下的其他项目）
    if (!siteId) {
      console.log(`ℹ️ 账户下未找到名称为 "${siteName}" 的专属站点，正在严格按照命名规则创建新站点...`)
      try {
        const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ name: siteName }),
        })
        if (createRes.ok) {
          resolvedSite = await createRes.json()
          siteId = resolvedSite.id
          console.log(`✓ 成功创建 Netlify 站点: ${resolvedSite.name} (ID: ${siteId}, URL: https://${resolvedSite.name}.netlify.app)`)
        } else {
          const createErrText = await createRes.text()
          console.warn(`⚠️ 无法以名称 "${siteName}" 创建站点 [${createRes.status}]: ${createErrText}`)

          // 若万一该名称已被 Netlify 全局其他用户占用，尝试使用带分支名或简短唯一后缀的备用名称
          const fallbackName = sanitizeSiteName(
            ghBranch && ghBranch !== 'main' && ghBranch !== 'master'
              ? `${siteName}-${ghBranch}`
              : `${siteName}-${Date.now().toString(36).slice(-4)}`
          )
          console.warn(`⚠️ 站点名称 "${siteName}" 已被全局占用，尝试使用备用名称 "${fallbackName}" 创建...`)
          const fallbackRes = await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({ name: fallbackName }),
          })
          if (fallbackRes.ok) {
            resolvedSite = await fallbackRes.json()
            siteId = resolvedSite.id
            console.log(`✓ 成功创建 Netlify 站点: ${resolvedSite.name} (ID: ${siteId}, URL: https://${resolvedSite.name}.netlify.app)`)
          } else {
            const fallbackErrText = await fallbackRes.text()
            console.warn(`⚠️ 备用名称 "${fallbackName}" 创建失败 [${fallbackRes.status}]: ${fallbackErrText}，尝试由 Netlify 自动生成唯一随机名称创建...`)
            // 最后兜底：不传 name，由 Netlify 自动生成全局唯一的随机二级域名，确保部署 100% 成功
            const autoRes = await fetch('https://api.netlify.com/api/v1/sites', {
              method: 'POST',
              headers: apiHeaders,
              body: JSON.stringify({}),
            })
            if (autoRes.ok) {
              resolvedSite = await autoRes.json()
              siteId = resolvedSite.id
              console.log(`✓ 成功由 Netlify 自动分配唯一站点: ${resolvedSite.name} (ID: ${siteId}, URL: https://${resolvedSite.name}.netlify.app)`)
            } else {
              const autoErrText = await autoRes.text()
              throw new Error(`创建 Netlify 站点彻底失败 [${autoRes.status}]: ${autoErrText}`)
            }
          }
        }
      } catch (err) {
        throw new Error(`调用 Netlify API 创建站点异常: ${err.message}`)
      }
    }
  }

  // 1.4 尝试将当前 siteId 自动持久化写入 GitHub 仓库变量 (需 GitHub API 授权)
  if (process.env.GITHUB_ACTIONS && siteId && ghCiToken) {
    try {
      execSync(`gh variable set NETLIFY_SITE_ID --body "${siteId}"`, {
        stdio: 'ignore',
        env: {
          ...process.env,
          GH_TOKEN: ghCiToken,
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
  // ⚠️ 仅当显式配置了 GH_TOKEN（例如私有文章仓库读取授权）时才同步给生产环境，严禁将 CI/CD 级别的 PAT_TOKEN 写入生产
  const ghToken = process.env.GH_TOKEN?.trim()

  const allEnvVars = [
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
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { key: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { key: 'PURGE_SECRET', value: process.env.PURGE_SECRET },
    { key: 'GISCUS_REPO', value: process.env.GISCUS_REPO },
    { key: 'GISCUS_REPO_ID', value: process.env.GISCUS_REPO_ID },
    { key: 'GISCUS_CATEGORY', value: process.env.GISCUS_CATEGORY },
    { key: 'GISCUS_CATEGORY_ID', value: process.env.GISCUS_CATEGORY_ID },
    { key: 'GISCUS_THEME_LIGHT', value: process.env.GISCUS_THEME_LIGHT },
    { key: 'GISCUS_THEME_DARK', value: process.env.GISCUS_THEME_DARK },
  ].filter((item) => item.value && item.value.trim() !== '')

  const SENSITIVE_KEYS = new Set([
    'PURGE_SECRET',
    'SUPABASE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
    'GH_TOKEN',
  ])

  const plainEnvVars = allEnvVars.filter((item) => !SENSITIVE_KEYS.has(item.key))
  const secretEnvVars = allEnvVars.filter((item) => SENSITIVE_KEYS.has(item.key))

  // 4. 自动同步环境变量至 Netlify 站点
  console.log(`🔄 正在自动同步环境变量至 Netlify 站点 (${siteId})...`)

  // 4.1 若未配置私有仓库 GH_TOKEN，主动清除 Netlify 生产环境中可能遗留的旧 GH_TOKEN / PAT_TOKEN
  if (!ghToken) {
    for (const legacyKey of ['GH_TOKEN', 'PAT_TOKEN']) {
      try {
        execSync(`npx --yes netlify-cli env:unset ${legacyKey}`, {
          stdio: 'ignore',
          env: {
            ...process.env,
            NETLIFY_AUTH_TOKEN: token,
            NETLIFY_SITE_ID: siteId,
          },
        })
        console.log(`   🧹 已从 Netlify 生产环境清理遗留变量: ${legacyKey}`)
      } catch {
        // 不存在则忽略
      }
    }
  }

  // 4.2 普通变量通过 env:import 批量导入
  if (plainEnvVars.length > 0) {
    const tempEnvPath = resolve(process.cwd(), '.env.netlify.tmp')
    try {
      const envLines = plainEnvVars.map(({ key, value }) => `${key}=${value.trim()}`).join('\n')
      writeFileSync(tempEnvPath, envLines, 'utf-8')

      execSync(`npx --yes netlify-cli env:import "${tempEnvPath}"`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NETLIFY_AUTH_TOKEN: token,
          NETLIFY_SITE_ID: siteId,
        },
      })
      console.log(`✓ 已同步 ${plainEnvVars.length} 项常规配置变量`)
    } catch (err) {
      console.warn(`⚠️ 常规环境变量同步警告: ${err.message}`)
    } finally {
      if (existsSync(tempEnvPath)) {
        unlinkSync(tempEnvPath)
      }
    }
  }

  // 4.3 敏感密钥通过 env:set --secret 作为密文注入
  for (const { key, value } of secretEnvVars) {
    try {
      execSync(`npx --yes netlify-cli env:set ${key} "${value.trim()}" --secret`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NETLIFY_AUTH_TOKEN: token,
          NETLIFY_SITE_ID: siteId,
        },
      })
      console.log(`   ✓ 同步密文: ${key} (Netlify Secret)`)
    } catch {
      try {
        execSync(`npx --yes netlify-cli env:set ${key} "${value.trim()}"`, {
          stdio: 'inherit',
          env: {
            ...process.env,
            NETLIFY_AUTH_TOKEN: token,
            NETLIFY_SITE_ID: siteId,
          },
        })
        console.log(`   ✓ 同步变量: ${key}`)
      } catch (e) {
        console.warn(`   ⚠️ 同步密文 ${key} 失败: ${e.message}`)
      }
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
