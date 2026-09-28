import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { Layout } from '../components'
import { getSidebarData } from '../services/github'

const about = new Hono<AppEnv>()

about.get('/', async (c) => {
  const { categories, tags } = await getSidebarData(c.env)

  return c.html(
    <Layout
      title="关于"
      description="关于本站 - 了解博客的技术架构、个人介绍与建站初衷"
      currentPath="/about"
      isHomePage={false}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL}
      verification={{
        google: c.env.GOOGLE_SITE_VERIFICATION,
        bing: c.env.BING_SITE_VERIFICATION,
        baidu: c.env.BAIDU_SITE_VERIFICATION,
        yandex: c.env.YANDEX_VERIFICATION,
      }}
    >
      <div
        class="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-8 relative w-full fuwari-onload-animation"
        style="animation-delay: 150ms"
      >
        <div class="relative mb-6">
          <h1 class="transition w-full block font-bold text-3xl fuwari-text-90 md:before:w-1 before:h-5 before:rounded-md before:bg-(--fuwari-primary) before:absolute before:top-2.5 before:-left-4.5">
            关于本站
          </h1>
        </div>

        <div class="prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
          <p>
            欢迎来到我的个人博客！本站基于 <a href="https://hono.dev" target="_blank" rel="noreferrer">Hono</a> 框架与{' '}
            <a href="https://workers.cloudflare.com" target="_blank" rel="noreferrer">Cloudflare Workers</a> 构建，前端完整移植自{' '}
            <code>flare-stack-blog</code> 的 <strong>Fuwari</strong> 主题。
          </p>

          <h2>核心特性</h2>
          <ul>
            <li>🎨 <strong>1:1 Fuwari 主题还原</strong>：支持 OKLCH 动态色相调节（0–360°）、明暗模式平滑切换、Banner 负向重叠双栏网格。</li>
            <li>📝 <strong>Git 驱动的内容管理</strong>：所有文章以 Markdown 格式存放在 GitHub 仓库的 <code>posts/</code> 目录，构建产物零文章体积。</li>
            <li>🚀 <strong>零重部署动态更新</strong>：Worker 运行时从 GitHub Raw API 拉取文章并写入 Cloudflare KV 缓存，推送 Markdown 即可更新文章。</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
})

export default about
