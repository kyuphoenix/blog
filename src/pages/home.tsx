import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { Layout, PostCard, Pagination } from '../components/index.js'
import { PostCardItem } from '../components/PostCard.js'
import { getManifest, getSidebarData, getBlogConfig } from '../services/github.js'
import { getTopPosts, getAllPostStats, isStatsEnabled } from '../services/stats.js'
import { parsePagination } from '../utils/pagination.js'
import { setTieredCache } from '../utils/cache.js'
import { i18n, I18nKey } from '../i18n/index.js'

const home = new Hono<AppEnv>()

home.get('/', async (c) => {
  const { page, pageSize, offset } = parsePagination(c.req.query())
  const category = c.req.query('category')
  const tag = c.req.query('tag')

  let manifest = (await getManifest(c.env)).filter(
    (p) => p.draft !== true && (p.draft as any) !== 'true'
  )

  if (category) {
    manifest = manifest.filter((p) => p.category === category)
  }
  if (tag) {
    manifest = manifest.filter((p) => p.tags.includes(tag))
  }

  manifest.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const statsEnabled = isStatsEnabled(c.env)

  // 仅在开启统计功能时获取访问量映射
  const allStats = statsEnabled ? await getAllPostStats(c.env) : {}

  // 仅在首页主列表第一页（无分类/标签筛选）且开启统计功能时，置顶访问量最高的前 3 篇文章
  const isMainFeed = page === 1 && !category && !tag
  let topPosts: PostCardItem[] = []
  let regularList = manifest

  if (isMainFeed && statsEnabled) {
    try {
      const topStats = await getTopPosts(c.env, 3)
      if (topStats.length > 0) {
        const topMap = new Map(
          topStats.map((s, idx) => [s.slug, { rank: idx + 1, views: s.views }])
        )

        // 匹配已发布的文章
        topPosts = manifest
          .filter((p) => topMap.has(p.title) || (p.slug ? topMap.has(p.slug) : false))
          .map((p) => {
            const info = topMap.get(p.title) || (p.slug ? topMap.get(p.slug) : undefined)
            return {
              ...p,
              isTop: true,
              rank: info?.rank,
              views: info?.views,
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

  // 为常规文章列表补充阅读量数据（未开启统计时不注入 views）
  const regularWithStats: PostCardItem[] = regularList.map((p) => ({
    ...p,
    views: statsEnabled
      ? (allStats[p.title]?.views ?? (p.slug ? allStats[p.slug]?.views : undefined) ?? 0)
      : undefined,
  }))

  const total = regularList.length
  const totalPages = Math.ceil(total / pageSize)
  const pagedRegular = regularWithStats.slice(offset, offset + pageSize)

  // 第一页若有置顶文章，合并到最顶部展示
  const displayPosts: PostCardItem[] =
    isMainFeed && topPosts.length > 0
      ? [...topPosts, ...pagedRegular]
      : pagedRegular

  const [siteConfig, { categories, tags }] = await Promise.all([
    getBlogConfig(c.env),
    getSidebarData(c.env),
  ])

  let baseUrl = '/'
  if (category) baseUrl = `/?category=${encodeURIComponent(category)}`
  else if (tag) baseUrl = `/?tag=${encodeURIComponent(tag)}`

  let pageTitle = undefined
  let pageDescription = undefined
  if (category) {
    pageTitle = i18n(I18nKey.filterCategory, siteConfig.lang, { category })
    pageDescription = `${siteConfig.title} - “${category}”分类下的所有精选文章与技术分享（共 ${total} 篇）。`
  } else if (tag) {
    pageTitle = i18n(I18nKey.filterTag, siteConfig.lang, { tag })
    pageDescription = `${siteConfig.title} - 包含“#${tag}”标签的所有相关文章与教程（共 ${total} 篇）。`
  }

  setTieredCache(c, { tags: ['page', 'home'] })

  return c.html(
    <Layout
      title={pageTitle}
      description={pageDescription}
      currentPath={category ? `/?category=${encodeURIComponent(category)}` : tag ? `/?tag=${encodeURIComponent(tag)}` : '/'}
      isHomePage={!category && !tag}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL || new URL(c.req.url).origin}
      siteConfig={siteConfig}
      env={c.env}
    >
      {(category || tag) && (
        <div
          class="fuwari-card-base px-6 py-4 flex items-center justify-between fuwari-onload-animation"
          style="animation-delay: 120ms"
        >
          <div class="flex items-center gap-2 font-bold fuwari-text-90">
            <span class="w-1 h-4 rounded-md bg-(--fuwari-primary) inline-block" />
            <span>{category ? i18n(I18nKey.filterCategory, siteConfig.lang, { category: category || '' }) : i18n(I18nKey.filterTag, siteConfig.lang, { tag: tag || '' })}</span>
            <span class="text-sm font-normal fuwari-text-50">{i18n(I18nKey.postsCountTotal, siteConfig.lang, { count: total })}</span>
          </div>
          <a
            href="/"
            class="fuwari-btn-regular px-3 py-1.5 rounded-lg text-xs font-medium no-underline"
          >
            {i18n(I18nKey.clearFilter, siteConfig.lang)}
          </a>
        </div>
      )}

      {displayPosts.length === 0 ? (
        <div
          class="fuwari-card-base p-12 text-center fuwari-text-50 fuwari-onload-animation"
          style="animation-delay: 150ms"
        >
          {i18n(I18nKey.noPosts, siteConfig.lang)}
        </div>
      ) : (
        <div class="flex flex-col gap-4">
          {displayPosts.map((post, i) => (
            <PostCard post={post} index={i} lang={siteConfig.lang} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl={baseUrl} lang={siteConfig.lang} />
    </Layout>
  )
})

export default home
