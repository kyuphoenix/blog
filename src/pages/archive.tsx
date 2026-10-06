import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { Layout, ArchivePanel } from '../components/index.js'
import { getManifest, getSidebarData, getBlogConfig } from '../services/github.js'
import { setTieredCache } from '../utils/cache.js'
import { i18n, I18nKey } from '../i18n/index.js'

const archive = new Hono<AppEnv>()

archive.get('/', async (c) => {
  const [manifestRaw, { categories, tags }, siteConfig] = await Promise.all([
    getManifest(c.env),
    getSidebarData(c.env),
    getBlogConfig(c.env),
  ])

  const manifest = manifestRaw
    .filter((p) => p.draft !== true && (p.draft as any) !== 'true')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  setTieredCache(c, { tags: ['page', 'archive'] })

  return c.html(
    <Layout
      title={i18n(I18nKey.archiveTitle, siteConfig.lang)}
      description={i18n(I18nKey.archiveSubtitle, siteConfig.lang, { count: manifest.length })}
      currentPath="/archive"
      isHomePage={false}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL || new URL(c.req.url).origin}
      siteConfig={siteConfig}
    >
      <ArchivePanel posts={manifest} lang={siteConfig.lang} />
    </Layout>
  )
})

export default archive
