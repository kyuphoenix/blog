import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { Layout, ArchivePanel } from '../components/index.js'
import { getManifest, getSidebarData, getBlogConfig } from '../services/github.js'

const archive = new Hono<AppEnv>()

archive.get('/', async (c) => {
  const [manifestRaw, { categories, tags }, siteConfig] = await Promise.all([
    getManifest(c.env),
    getSidebarData(c.env),
    getBlogConfig(c.env),
  ])

  const manifest = manifestRaw
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return c.html(
    <Layout
      title="归档"
      description={`共 ${manifest.length} 篇文章的历史时间线与分类归档`}
      currentPath="/archive"
      isHomePage={false}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL || new URL(c.req.url).origin}
      siteConfig={siteConfig}
    >
      <ArchivePanel posts={manifest} />
    </Layout>
  )
})

export default archive
