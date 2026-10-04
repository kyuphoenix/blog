import type { AppEnv } from '../types/env.js'
import type { PostMeta, Post, Manifest, FriendLink } from '../types/post.js'
import { parseFrontmatter, estimateReadingTime, extractExcerpt } from '../utils/markdown.js'
import { getBlogStorage } from './storage.js'
import { blogConfig as defaultBlogConfig, BlogConfig } from '../blog.config.js'

const CACHE_TTL = 60 * 5 // 缓存 5 分钟
const MANIFEST_CACHE_KEY = 'manifest'
const FRIENDS_CACHE_KEY = 'friends'
const CONFIG_CACHE_KEY = 'site_config'

/**
 * 构建 GitHub Raw 内容 URL
 */
function rawUrl(owner: string, repo: string, branch: string, path: string): string {
  const safeBranch = branch && branch.trim() ? branch.trim() : 'main'
  return `https://raw.githubusercontent.com/${owner}/${repo}/${safeBranch}/${encodeURI(path)}`
}

/**
 * 解析并规范化 GitHub 环境变量（优先 GH_*，兼容 GITHUB_*）
 */
function getGhConfig(env: AppEnv['Bindings']) {
  const owner = env?.GH_OWNER || env?.GITHUB_OWNER || ''
  const repo = env?.GH_REPO || env?.GITHUB_REPO || ''
  const branch = env?.GH_BRANCH || env?.GITHUB_BRANCH || 'main'
  const token = env?.GH_TOKEN || env?.PAT_TOKEN || env?.GITHUB_TOKEN
  return { owner, repo, branch, token }
}

/**
 * 检查 GitHub 配置是否有效
 */
function isGitHubConfigured(env: AppEnv['Bindings']): boolean {
  const { owner, repo } = getGhConfig(env)
  return !!(
    owner &&
    repo &&
    !owner.startsWith('<') &&
    !repo.startsWith('<')
  )
}

/**
 * 从 GitHub 拉取文件内容
 */
async function fetchFromGitHub(
  url: string,
  token?: string
): Promise<string | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Blog-Worker',
  }
  if (token) {
    headers['Authorization'] = `token ${token}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`GitHub fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

/**
 * 获取文章清单（带 KV 缓存）
 */
export async function getManifest(env: AppEnv['Bindings']): Promise<Manifest> {
  const storage = getBlogStorage(env)

  // 先查缓存
  try {
    const cached = await storage.getItem<Manifest>(MANIFEST_CACHE_KEY)
    if (cached) {
      return cached
    }
  } catch {
    // 缓存不可用时忽略
  }

  // GitHub 未配置时返回示例数据
  if (!isGitHubConfigured(env)) {
    return getBuiltinManifest()
  }

  // 从 GitHub 拉取
  const { owner, repo, branch, token } = getGhConfig(env)
  const url = rawUrl(owner, repo, branch, 'posts/manifest.json')
  const content = await fetchFromGitHub(url, token)

  if (!content) {
    return getBuiltinManifest()
  }

  const manifest = JSON.parse(content) as Manifest

  // 写入缓存
  try {
    await storage.setItem(MANIFEST_CACHE_KEY, manifest, {
      ttl: CACHE_TTL,
    })
  } catch {
    // 写入异常时忽略
  }

  return manifest
}

/**
 * 获取单篇文章完整内容
 * @param identifier 文章标题（支持中文、空格、URL 编码字符）
 */
export async function getPost(
  identifier: string,
  env: AppEnv['Bindings']
): Promise<Post | null> {
  // 解码可能传入的 URL 编码标题
  let decoded = identifier
  try {
    decoded = decodeURIComponent(identifier)
  } catch {
    // 忽略解码错误
  }

  const cacheKey = `post:${decoded}`
  const storage = getBlogStorage(env)

  // 先查缓存
  try {
    const cached = await storage.getItem<Post>(cacheKey)
    if (cached) {
      return cached
    }
  } catch {
    // 缓存不可用时忽略
  }

  // 从清单查找对应文章以获取真实文件路径
  const manifest = await getManifest(env)
  const meta = manifest.find(
    (p) =>
      p.title === decoded ||
      p.title === identifier ||
      p.slug === decoded ||
      p.slug === identifier ||
      encodeURIComponent(p.title) === identifier
  )

  // GitHub 未配置时返回示例文章
  if (!isGitHubConfigured(env)) {
    return getBuiltinPost(decoded)
  }

  const { owner, repo, branch, token } = getGhConfig(env)
  const filePath = meta ? meta.path : `posts/${decoded}.md`
  const url = rawUrl(owner, repo, branch, filePath)
  const raw = await fetchFromGitHub(url, token)

  if (!raw) {
    return null
  }

  // 解析 frontmatter 和内容
  const { frontmatter, content } = parseFrontmatter(raw)

  const postTitle = meta?.title || frontmatter.title || decoded

  const post: Post = {
    title: postTitle,
    date: meta?.date || frontmatter.date || new Date().toISOString().split('T')[0],
    category: meta?.category || frontmatter.category || '未分类',
    tags: meta?.tags || frontmatter.tags || [],
    excerpt: meta?.excerpt || frontmatter.excerpt || extractExcerpt(content),
    cover: meta?.cover || frontmatter.cover || frontmatter.image,
    draft: meta?.draft ?? frontmatter.draft ?? false,
    slug: postTitle,
    path: filePath,
    readingTime: estimateReadingTime(content),
    content,
  }

  // 写入缓存
  try {
    await storage.setItem(cacheKey, post, {
      ttl: CACHE_TTL,
    })
  } catch {
    // 写入异常时忽略
  }

  return post
}

/**
 * 获取友情链接列表（带 KV 缓存）
 */
export async function getFriends(env: AppEnv['Bindings']): Promise<FriendLink[]> {
  const storage = getBlogStorage(env)

  // 1. 先查缓存
  try {
    const cached = await storage.getItem<any>(FRIENDS_CACHE_KEY)
    if (cached) {
      if (Array.isArray(cached)) return cached
      if (cached && Array.isArray(cached.friends)) return cached.friends
    }
  } catch {
    // 缓存不可用时忽略
  }

  // 2. GitHub 未配置时返回内置示例数据
  if (!isGitHubConfigured(env)) {
    return getBuiltinFriends()
  }

  // 3. 从 GitHub 拉取 friends.json
  const { owner, repo, branch, token } = getGhConfig(env)
  const url = rawUrl(owner, repo, branch, 'friends.json')
  const content = await fetchFromGitHub(url, token)

  if (!content) {
    return getBuiltinFriends()
  }

  try {
    const data = JSON.parse(content)
    const list: FriendLink[] = Array.isArray(data)
      ? data
      : data && Array.isArray(data.friends)
      ? data.friends
      : []

    // 写入缓存
    try {
      await storage.setItem(FRIENDS_CACHE_KEY, list, {
        ttl: CACHE_TTL,
      })
    } catch {
      // 写入异常时忽略
    }

    return list
  } catch (err) {
    console.warn('Failed to parse friends.json:', err)
    return getBuiltinFriends()
  }
}

/**
 * 获取站点全局配置（优先从 KV/内存 缓存读取；支持从 GitHub 动态同步 blog.config.json）
 */
export async function getBlogConfig(env?: AppEnv['Bindings']): Promise<BlogConfig> {
  const storage = getBlogStorage(env)

  // 1. 先查缓存
  try {
    const cached = await storage.getItem<BlogConfig>(CONFIG_CACHE_KEY)
    if (cached && typeof cached === 'object' && cached.title) {
      return cached
    }
  } catch {
    // 缓存不可用时忽略
  }

  // 2. 如果 GitHub 未配置，返回本地默认配置
  if (!env || !isGitHubConfigured(env)) {
    return defaultBlogConfig
  }

  // 3. 从 GitHub 拉取最新的 blog.config.json
  try {
    const { owner, repo, branch, token } = getGhConfig(env)
    const url = rawUrl(owner, repo, branch, 'blog.config.json')
    const content = await fetchFromGitHub(url, token)
    if (content) {
      const parsed = JSON.parse(content)
      const merged: BlogConfig = {
        title: parsed.title || defaultBlogConfig.title,
        author: parsed.author || defaultBlogConfig.author,
        description: parsed.description || defaultBlogConfig.description,
        repository: parsed.repository || defaultBlogConfig.repository,
        nav: Array.isArray(parsed.nav) ? parsed.nav : defaultBlogConfig.nav,
        social: Array.isArray(parsed.social) ? parsed.social : defaultBlogConfig.social,
        icons: {
          ...defaultBlogConfig.icons,
          ...(parsed.icons || {}),
        },
        theme: {
          fuwari: {
            ...defaultBlogConfig.theme.fuwari,
            ...(parsed.theme?.fuwari || {}),
          },
        },
        seo: {
          ...defaultBlogConfig.seo,
          ...(parsed.seo || {}),
        },
      }

      // 写入缓存
      try {
        await storage.setItem(CONFIG_CACHE_KEY, merged, {
          ttl: CACHE_TTL,
        })
      } catch {
        // 忽略写入缓存失败
      }

      return merged
    }
  } catch (err) {
    console.warn('动态拉取 blog.config.json 异常，回退至默认配置:', err)
  }

  return defaultBlogConfig
}

/**
 * 清除所有缓存（文章、友链或站点配置更新后调用）
 */
export async function purgeCache(env: AppEnv['Bindings']): Promise<void> {
  const storage = getBlogStorage(env)

  try {
    // 清除 manifest、friends 与 site_config 缓存
    await Promise.all([
      storage.removeItem(MANIFEST_CACHE_KEY),
      storage.removeItem(FRIENDS_CACHE_KEY),
      storage.removeItem(CONFIG_CACHE_KEY),
    ])

    // 列出并清除所有文章缓存
    const postKeys = await storage.getKeys('post:')
    if (postKeys.length > 0) {
      await Promise.all(postKeys.map((key) => storage.removeItem(key)))
    }
  } catch (err) {
    console.warn('清除缓存失败:', err)
  }
}

/**
 * 获取侧边栏分类与标签统计数据
 */
export async function getSidebarData(env: AppEnv['Bindings']) {
  const manifest = (await getManifest(env)).filter((p) => !p.draft)
  const categoryMap = new Map<string, number>()
  const tagMap = new Map<string, number>()

  for (const p of manifest) {
    if (p.category) {
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1)
    }
    for (const t of p.tags) {
      tagMap.set(t, (tagMap.get(t) || 0) + 1)
    }
  }

  const categories = Array.from(categoryMap, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const tags = Array.from(tagMap, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return { categories, tags }
}

// ============================
// 内置示例数据（本地开发用）
// ============================

function getBuiltinManifest(): Manifest {
  return [
    {
      title: '使用 Hono 构建博客 API',
      slug: '使用 Hono 构建博客 API',
      date: '2024-01-20',
      category: '技术',
      tags: ['Hono', 'Cloudflare Workers', 'TypeScript'],
      excerpt: '本文介绍如何使用 Hono 框架在 Cloudflare Workers 上构建一个轻量级博客 API。',
      draft: false,
      path: 'posts/使用 Hono 构建博客 API.md',
      readingTime: 3,
    },
    {
      title: 'Hello World',
      slug: 'Hello World',
      date: '2024-01-15',
      category: '技术',
      tags: ['博客', '入门'],
      excerpt: '这是我的第一篇博客文章，欢迎来到我的博客！',
      cover: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80',
      draft: false,
      path: 'posts/Hello World.md',
      readingTime: 1,
    },
  ]
}

function getBuiltinPost(identifier: string): Post | null {
  const posts: Record<string, Post> = {
    'Hello World': {
      title: 'Hello World',
      slug: 'Hello World',
      date: '2024-01-15',
      category: '技术',
      tags: ['博客', '入门'],
      excerpt: '这是我的第一篇博客文章，欢迎来到我的博客！',
      cover: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80',
      draft: false,
      path: 'posts/Hello World.md',
      readingTime: 1,
      content: `# Hello World

欢迎来到我的博客！🎉

这是一篇示例文章，用于展示博客系统的基本功能。

## 特性

- 📝 文章存储在 Git 仓库中
- 🚀 通过 GitHub Raw API 动态拉取，无需重新部署
- ⚡ KV 缓存加速访问
- 🏷️ 支持分类和标签
- 🔗 直接通过 \`/posts/文章标题\` 访问，无需单独指定 slug

## 代码示例

\`\`\`typescript
const greeting = 'Hello, World!'
console.log(greeting)
\`\`\`

## 如何添加新文章

1. 在 \`posts/\` 目录下创建 \`.md\` 文件
2. 填写 frontmatter（只需标题、日期、分类等，无需写 slug）
3. 运行 \`pnpm gen:manifest\` 更新文章清单
4. 推送到 GitHub，文章自动生效！`,
    },
    '使用 Hono 构建博客 API': {
      title: '使用 Hono 构建博客 API',
      slug: '使用 Hono 构建博客 API',
      date: '2024-01-20',
      category: '技术',
      tags: ['Hono', 'Cloudflare Workers', 'TypeScript'],
      excerpt: '本文介绍如何使用 Hono 框架在 Cloudflare Workers 上构建一个轻量级博客 API。',
      draft: false,
      path: 'posts/使用 Hono 构建博客 API.md',
      readingTime: 3,
      content: `# 使用 Hono 构建博客 API

Hono 是一个小巧、快速的 Web 框架，专为 Edge Runtime 设计。

## 为什么选择 Hono？

- **超快**：基于 Web 标准 API，零开销
- **轻量**：核心包只有几 KB
- **类型安全**：原生 TypeScript 支持
- **中间件丰富**：内置 CORS、JWT、Logger 等

## 架构设计

我们的博客采用了一种独特的架构：

\`\`\`
用户请求 → Cloudflare Worker → KV 缓存?
                                  ├─ 命中 → 返回缓存
                                  └─ 未命中 → GitHub Raw API → 缓存 → 返回
\`\`\`

这种方式的好处是内容和代码完全解耦，更新文章无需触发构建和部署。`,
    },
  }

  // 同时也支持原有的兼容 key
  if (posts[identifier]) return posts[identifier]
  if (identifier === 'hello-world') return posts['Hello World']
  if (identifier === 'building-blog-with-hono') return posts['使用 Hono 构建博客 API']

  return null
}

function getBuiltinFriends(): FriendLink[] {
  return [
    {
      title: 'Fuwari',
      url: 'https://github.com/saicaca/fuwari',
      description: '✨ A static blog theme powered by Astro & Tailwind CSS',
      avatar: 'https://github.com/saicaca.png',
    },
    {
      title: 'Hono',
      url: 'https://hono.dev',
      description: 'Ultrafast web framework for the Cloudflare Workers & Edge',
      avatar: 'https://github.com/honojs.png',
    },
    {
      title: 'Cloudflare',
      url: 'https://cloudflare.com',
      description: 'Connect, protect, and build everywhere',
      avatar: 'https://github.com/cloudflare.png',
    },
  ]
}
