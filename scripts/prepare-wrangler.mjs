/**
 * 读取环境变量并将变量填充进 wrangler.jsonc，供 GitHub Actions CI/CD 部署。
 *
 * 支持的环境变量：
 * - CLOUDFLARE_KV_ID (或 KV_NAMESPACE_ID): Cloudflare KV 命名空间 ID
 * - WORKER_NAME: Cloudflare Worker 服务名称 (可选)
 * - GITHUB_OWNER: GitHub 仓库所有者 (可选)
 * - GITHUB_REPO: GitHub 仓库名 (可选)
 * - GITHUB_BRANCH: GitHub 分支名 (可选)
 * - CUSTOM_DOMAIN: 自定义域名 (可选，如 blog.example.com)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'wrangler.jsonc')
const rawContent = readFileSync(configPath, 'utf-8')

let content = rawContent

const kvId = process.env.CLOUDFLARE_KV_ID || process.env.KV_NAMESPACE_ID
const workerName = process.env.WORKER_NAME
const githubOwner = process.env.GITHUB_OWNER
const githubRepo = process.env.GITHUB_REPO
const githubBranch = process.env.GITHUB_BRANCH
const customDomain = process.env.CUSTOM_DOMAIN

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

if (customDomain && customDomain.trim()) {
  const domain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  // 检查是否已有 routes，没有则在倒数第一个右大括号前插入
  if (!content.includes('"routes"')) {
    const routeBlock = `,\n  // 自定义域名\n  "routes": [\n    {\n      "pattern": "${domain}",\n      "custom_domain": true\n    }\n  ]`
    content = content.replace(/(\n\})[\s]*$/, `${routeBlock}\n}`)
    console.log(`✓ 已绑定自定义域名: ${domain}`)
  } else {
    content = content.replace(/"pattern":\s*"[^"]*"/, `"pattern": "${domain}"`)
    console.log(`✓ 已更新自定义域名: ${domain}`)
  }
}

writeFileSync(configPath, content, 'utf-8')
console.log('✅ wrangler.jsonc 配置准备完成')
