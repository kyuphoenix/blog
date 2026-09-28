import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { Layout, ArchivePanel } from '../components'
import { getManifest, getSidebarData } from '../services/github'

const archive = new Hono<AppEnv>()

archive.get('/', async (c) => {
  const manifest = (await getManifest(c.env))
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const { categories, tags } = await getSidebarData(c.env)

  return c.html(
    <Layout
      title="归档"
      description={`共 ${manifest.length} 篇文章的历史时间线与分类归档`}
      currentPath="/archive"
      isHomePage={false}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL}
    >
      <ArchivePanel posts={manifest} />
    </Layout>
  )
})

export default archive
