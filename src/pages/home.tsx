import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { Layout, PostCard, Pagination } from '../components'
import { PostCardItem } from '../components/PostCard'
import { getManifest, getSidebarData } from '../services/github'
import { getTopPosts, getAllPostStats } from '../services/stats'
import { parsePagination } from '../utils/pagination'

const home = new Hono<AppEnv>()

home.get('/', async (c) => {
  const { page, pageSize, offset } = parsePagination(c.req.query())
  const category = c.req.query('category')
  const tag = c.req.query('tag')

  let manifest = (await getManifest(c.env)).filter((p) => !p.draft)

  if (category) {
    manifest = manifest.filter((p) => p.category === category)
  }
  if (tag) {
    manifest = manifest.filter((p) => p.tags.includes(tag))
  }

  manifest.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // 获取所有文章的访问量统计
  const allStats = await getAllPostStats(c.env.DB)

  // 仅在首页主列表第一页（无分类/标签筛选）时，置顶访问量最高的前 3 篇文章
  const isMainFeed = page === 1 && !category && !tag
  let topPosts: PostCardItem[] = []
  let regularList = manifest

  if (isMainFeed && c.env.DB) {
    try {
      const topStats = await getTopPosts(c.env.DB, 3)
      if (topStats.length > 0) {
        const topMap = new Map(
          topStats.map((s, idx) => [s.slug, { rank: idx + 1, views: s.views }])
        )

        // 匹配已发布的文章
        topPosts = manifest
          .filter((p) => topMap.has(p.title) || topMap.has(p.slug))
          .map((p) => {
            const info = topMap.get(p.title) || topMap.get(p.slug)!
            return {
              ...p,
              isTop: true,
              rank: info.rank,
              views: info.views,
            }
          })
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))

        // 常规流中排除已置顶的文章，避免在首页重复出现
        const topTitles = new Set(topPosts.map((p) => p.title))
        regularList = manifest.filter((p) => !topTitles.has(p.title))
      }
    } catch (err) {
      console.warn('获取热门置顶文章失败:', err)
    }
  }

  // 为常规文章列表补充阅读量数据
  const regularWithStats: PostCardItem[] = regularList.map((p) => ({
    ...p,
    views: allStats[p.title]?.views || allStats[p.slug]?.views || 0,
  }))

  const total = regularList.length
  const totalPages = Math.ceil(total / pageSize)
  const pagedRegular = regularWithStats.slice(offset, offset + pageSize)

  // 第一页若有置顶文章，合并到最顶部展示
  const displayPosts: PostCardItem[] =
    isMainFeed && topPosts.length > 0
      ? [...topPosts, ...pagedRegular]
      : pagedRegular

  const { categories, tags } = await getSidebarData(c.env)

  let baseUrl = '/'
  if (category) baseUrl = `/?category=${encodeURIComponent(category)}`
  else if (tag) baseUrl = `/?tag=${encodeURIComponent(tag)}`

  let pageTitle = undefined
  if (category) pageTitle = `分类: ${category}`
  if (tag) pageTitle = `标签: ${tag}`

  return c.html(
    <Layout
      title={pageTitle}
      currentPath="/"
      isHomePage={!category && !tag}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL}
    >
      {(category || tag) && (
        <div
          class="fuwari-card-base px-6 py-4 flex items-center justify-between fuwari-onload-animation"
          style="animation-delay: 120ms"
        >
          <div class="flex items-center gap-2 font-bold fuwari-text-90">
            <span class="w-1 h-4 rounded-md bg-(--fuwari-primary) inline-block" />
            <span>{category ? `分类：${category}` : `标签：#${tag}`}</span>
            <span class="text-sm font-normal fuwari-text-50">（共 {total} 篇）</span>
          </div>
          <a
            href="/"
            class="fuwari-btn-regular px-3 py-1.5 rounded-lg text-xs font-medium no-underline"
          >
            ✕ 清除筛选
          </a>
        </div>
      )}

      {displayPosts.length === 0 ? (
        <div
          class="fuwari-card-base p-12 text-center fuwari-text-50 fuwari-onload-animation"
          style="animation-delay: 150ms"
        >
          暂无相关文章
        </div>
      ) : (
        <div class="flex flex-col gap-4">
          {displayPosts.map((post, i) => (
            <PostCard post={post} index={i} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl={baseUrl} />
    </Layout>
  )
})

export default home
