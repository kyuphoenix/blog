import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { Layout, PostCard, Pagination } from '../components'
import { getManifest, getSidebarData } from '../services/github'
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

  const total = manifest.length
  const totalPages = Math.ceil(total / pageSize)
  const posts = manifest.slice(offset, offset + pageSize)

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

      {posts.length === 0 ? (
        <div
          class="fuwari-card-base p-12 text-center fuwari-text-50 fuwari-onload-animation"
          style="animation-delay: 150ms"
        >
          暂无相关文章
        </div>
      ) : (
        <div class="flex flex-col gap-4">
          {posts.map((post, i) => (
            <PostCard post={post} index={i} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl={baseUrl} />
    </Layout>
  )
})

export default home
