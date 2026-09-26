/**
 * 读取环境变量并将变量填充进 wrangler.jsonc，供 GitHub Actions CI/CD 部署。
 *
 * 支持的环境变量：
 * - CLOUDFLARE_KV_ID (或 KV_NAMESPACE_ID): Cloudflare KV 命名空间 ID
 * - WORKER_NAME: Cloudflare Worker 服务名称 (可选)
 * - GITHUB_OWNER: GitHub 仓库所有者 (可选，默认取 GitHub Actions 环境变量)
 * - GITHUB_REPO: GitHub 仓库名 (可选，默认取 GitHub Actions 环境变量)
 * - GITHUB_BRANCH: GitHub 分支名 (可选，默认取当前分支或 main)
 * - GITHUB_TOKEN: GitHub 访问令牌 (可选，私有仓库拉取或提升 API 限额)
 * - PURGE_SECRET: 缓存刷新密钥 (可选)
 * - BLOG_URL: 博客完整访问地址 (可选，若为独立域名将自动解析并配置自定义域名路由)
 * - GISCUS_REPO: Giscus 评论仓库 (可选)
 * - GISCUS_REPO_ID: Giscus 仓库 ID (可选)
 * - GISCUS_CATEGORY: Giscus 讨论分类 (可选)
 * - GISCUS_CATEGORY_ID: Giscus 分类 ID (可选)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'wrangler.jsonc')
const rawContent = readFileSync(configPath, 'utf-8')

let content = rawContent

const kvId = process.env.CLOUDFLARE_KV_ID || process.env.KV_NAMESPACE_ID
const workerName = process.env.WORKER_NAME
const [defaultOwner, defaultRepo] = (process.env.GITHUB_REPOSITORY || '').split('/')
const githubOwner = process.env.GITHUB_OWNER || defaultOwner
const githubRepo = process.env.GITHUB_REPO || defaultRepo
const githubBranch = process.env.GITHUB_BRANCH || process.env.GITHUB_REF_NAME || 'main'
const purgeSecret = process.env.PURGE_SECRET
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

// 从 BLOG_URL 直接解析自定义域名（如 https://blog.example.com -> blog.example.com）
let customDomain = ''
const blogUrl = process.env.BLOG_URL
if (blogUrl && blogUrl.trim()) {
  try {
    const raw = blogUrl.trim()
    const parsed = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`)
    const hostname = parsed.hostname
    // Cloudflare 自带的 *.workers.dev 域名和 localhost 不需要也不支持配置自定义域名路由
    if (hostname && !hostname.endsWith('.workers.dev') && hostname !== 'localhost') {
      customDomain = hostname
    }
  } catch (err) {
    console.warn('⚠️ 无法从 BLOG_URL 解析域名:', err.message)
  }
}

const giscusRepo = process.env.GISCUS_REPO
const giscusRepoId = process.env.GISCUS_REPO_ID
const giscusCategory = process.env.GISCUS_CATEGORY
const giscusCategoryId = process.env.GISCUS_CATEGORY_ID

if (kvId && kvId.trim()) {
  content = content.replace(/"id":\s*"[^"]*"/, `"id": "${kvId.trim()}"`)
  console.log(`✓ 已注入 KV 命名空间 ID: ${kvId.trim()}`)
} else {
  console.warn('⚠️ 未检测到 CLOUDFLARE_KV_ID 环境变量，使用现有配置')
}

if (workerName && workerName.trim()) {
  content = content.replace(/"name":\s*"[^"]*"/, `"name": "${workerName.trim()}"`)
  console.log(`✓ 已设置 Worker 名称: ${workerName.trim()}`)
}

if (githubOwner && githubOwner.trim()) {
  content = content.replace(/"GITHUB_OWNER":\s*"[^"]*"/, `"GITHUB_OWNER": "${githubOwner.trim()}"`)
  console.log(`✓ 已设置 GITHUB_OWNER: ${githubOwner.trim()}`)
}

if (githubRepo && githubRepo.trim()) {
  content = content.replace(/"GITHUB_REPO":\s*"[^"]*"/, `"GITHUB_REPO": "${githubRepo.trim()}"`)
  console.log(`✓ 已设置 GITHUB_REPO: ${githubRepo.trim()}`)
}

if (githubBranch && githubBranch.trim()) {
  content = content.replace(/"GITHUB_BRANCH":\s*"[^"]*"/, `"GITHUB_BRANCH": "${githubBranch.trim()}"`)
  console.log(`✓ 已设置 GITHUB_BRANCH: ${githubBranch.trim()}`)
}

function injectVar(key, value) {
  if (!value || !value.trim()) return
  if (content.includes(`"${key}"`)) {
    content = content.replace(new RegExp(`"${key}":\\s*"[^"]*"`), `"${key}": "${value.trim()}"`)
  } else {
    content = content.replace(/"vars":\s*\{/, `"vars": {\n    "${key}": "${value.trim()}",`)
  }
  console.log(`✓ 已注入环境变量: ${key}`)
}

injectVar('PURGE_SECRET', purgeSecret)
injectVar('GITHUB_TOKEN', githubToken)
injectVar('GISCUS_REPO', giscusRepo)
injectVar('GISCUS_REPO_ID', giscusRepoId)
injectVar('GISCUS_CATEGORY', giscusCategory)
injectVar('GISCUS_CATEGORY_ID', giscusCategoryId)

if (customDomain) {
  // 检查是否已有 routes，没有则在倒数第一个右大括号前插入
  if (!content.includes('"routes"')) {
    const routeBlock = `,\n  // 自定义域名（自动从 BLOG_URL 解析）\n  "routes": [\n    {\n      "pattern": "${customDomain}",\n      "custom_domain": true\n    }\n  ]`
    content = content.replace(/(\n\})[\s]*$/, `${routeBlock}\n}`)
    console.log(`✓ 已从 BLOG_URL 自动解析并绑定自定义域名: ${customDomain}`)
  } else {
    content = content.replace(/"pattern":\s*"[^"]*"/, `"pattern": "${customDomain}"`)
    console.log(`✓ 已更新自定义域名: ${customDomain}`)
  }
}

writeFileSync(configPath, content, 'utf-8')
console.log('✅ wrangler.jsonc 配置准备完成')
