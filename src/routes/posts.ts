import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { getManifest, getPost, getFriends, getBlogConfig, getAboutContent, purgeCache } from '../services/github.js'
import { success, paginated, fail } from '../utils/response.js'
import { parsePagination } from '../utils/pagination.js'

const posts = new Hono<AppEnv>()

/**
 * 获取文章列表
 * GET /api/posts?page=1&pageSize=10&category=xxx&tag=xxx
 */
posts.get('/', async (c) => {
  const { page, pageSize, offset } = parsePagination(c.req.query())
  const category = c.req.query('category')
  const tag = c.req.query('tag')
  const keyword = c.req.query('keyword')

  let manifest = await getManifest(c.env)

  // 过滤草稿
  manifest = manifest.filter((p) => p.draft !== true && (p.draft as any) !== 'true')

  // 按分类筛选
  if (category) {
    manifest = manifest.filter((p) => p.category === category)
  }

  // 按标签筛选
  if (tag) {
    manifest = manifest.filter((p) => p.tags.includes(tag))
  }

  // 关键词搜索（标题和摘要）
  if (keyword) {
    const kw = keyword.toLowerCase()
    manifest = manifest.filter(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.excerpt.toLowerCase().includes(kw)
    )
  }

  // 按日期降序排序
  manifest.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const total = manifest.length
  const paged = manifest.slice(offset, offset + pageSize)

  return paginated(c, paged, total, page, pageSize)
})

/**
 * 获取所有分类
 * GET /api/posts/categories
 */
posts.get('/categories', async (c) => {
  const manifest = await getManifest(c.env)
  const published = manifest.filter((p) => p.draft !== true && (p.draft as any) !== 'true')

  const categoryMap = new Map<string, number>()
  for (const post of published) {
    categoryMap.set(post.category, (categoryMap.get(post.category) || 0) + 1)
  }

  const categories = Array.from(categoryMap, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return success(c, categories)
})

/**
 * 获取所有标签
 * GET /api/posts/tags
 */
posts.get('/tags', async (c) => {
  const manifest = await getManifest(c.env)
  const published = manifest.filter((p) => p.draft !== true && (p.draft as any) !== 'true')

  const tagMap = new Map<string, number>()
  for (const post of published) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    }
  }

  const tags = Array.from(tagMap, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return success(c, tags)
})

/**
 * 获取文章详情
 * GET /api/posts/:title
 */
posts.get('/:title', async (c) => {
  const rawTitle = c.req.param('title')
  const title = decodeURIComponent(rawTitle)

  const post = await getPost(title, c.env)
  if (!post) {
    return fail(c, 'Post not found', 404)
  }

  if (post.draft === true || (post.draft as any) === 'true') {
    return fail(c, 'Post not found', 404)
  }

  return success(c, post)
})

/**
 * 清除缓存（用于 Webhook 或手动触发）
 * POST /api/posts/purge
 */
posts.post('/purge', async (c) => {
  // 密钥验证（支持 PURGE_SECRET 或 GH_TOKEN / PAT_TOKEN）
  const secret = c.req.header('X-Purge-Secret')
  const expectedSecret = c.env.PURGE_SECRET || c.env.GH_TOKEN || c.env.PAT_TOKEN || c.env.GITHUB_TOKEN
  if (expectedSecret && secret !== expectedSecret) {
    return fail(c, 'Unauthorized', 401)
  }

  // 1. 清空旧文章及清单/友链/配置/关于页缓存
  await purgeCache(c.env)
  // 2. 立即拉取并重新缓存最新文章列表、友链、配置与关于页
  const [manifest, friends, siteConfig, aboutData] = await Promise.all([
    getManifest(c.env),
    getFriends(c.env),
    getBlogConfig(c.env),
    getAboutContent(c.env),
  ])

  return success(
    c,
    {
      reCachedCount: manifest.length,
      reCachedFriendsCount: friends.length,
      siteTitle: siteConfig.title,
      aboutTitle: aboutData.title,
    },
    'Cache purged and manifest, friends, config & about re-cached successfully'
  )
})

export default posts
