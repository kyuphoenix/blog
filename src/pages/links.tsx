import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { Layout, Giscus } from '../components'
import { ExternalLinkIcon } from '../components/Icons'
import { getSidebarData, getFriends } from '../services/github'
import { blogConfig } from '../blog.config'

const links = new Hono<AppEnv>()

links.get('/', async (c) => {
  const [{ categories, tags }, friends] = await Promise.all([
    getSidebarData(c.env),
    getFriends(c.env),
  ])
  const baseUrl = (c.env.BLOG_URL || '').replace(/\/$/, '') || new URL(c.req.url).origin
  const avatarUrl = blogConfig.theme.fuwari.avatar.startsWith('http')
    ? blogConfig.theme.fuwari.avatar
    : `${baseUrl}${blogConfig.theme.fuwari.avatar}`

  return c.html(
    <Layout
      title="友链"
      currentPath="/links"
      isHomePage={false}
      categories={categories}
      tags={tags}
      blogUrl={c.env.BLOG_URL}
    >
      {/* 头部标题卡片 */}
      <div
        class="fuwari-card-base px-6 md:px-9 pt-6 pb-6 relative w-full fuwari-onload-animation"
        style="animation-delay: 100ms"
      >
        <div class="relative mb-2">
          <h1 class="transition w-full block font-bold text-3xl fuwari-text-90 md:before:w-1 before:h-5 before:rounded-md before:bg-(--fuwari-primary) before:absolute before:top-2.5 before:-left-4.5">
            友情链接
          </h1>
        </div>
        <p class="fuwari-text-50 text-sm leading-relaxed mt-2">
          海内存知己，天涯若比邻。欢迎各位志同道合的朋友交换友链！
        </p>
      </div>

      {/* 友链卡片网格列表 */}
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-4 fuwari-onload-animation"
        style="animation-delay: 150ms"
      >
        {friends.map((friend) => (
          <a
            href={friend.url}
            target="_blank"
            rel="noreferrer noopener"
            class="fuwari-card-base p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-(--fuwari-primary)/50 group no-underline relative"
          >
            <img
              src={friend.avatar}
              alt={friend.title}
              loading="lazy"
              class="w-14 h-14 rounded-full object-cover shrink-0 border border-black/5 dark:border-white/10 group-hover:rotate-6 transition-transform duration-300 bg-black/5 dark:bg-white/5"
            />
            <div class="min-w-0 flex-1">
              <div class="font-bold text-base fuwari-text-90 group-hover:text-(--fuwari-primary) transition-colors flex items-center gap-1.5 truncate">
                <span>{friend.title}</span>
                <ExternalLinkIcon size={13} class="opacity-50 shrink-0 group-hover:opacity-100" />
              </div>
              <p class="text-xs fuwari-text-50 line-clamp-2 mt-1 leading-relaxed">
                {friend.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* 申请友链与本站信息卡片 */}
      <div
        class="fuwari-card-base px-6 md:px-9 pt-6 pb-8 relative w-full fuwari-onload-animation"
        style="animation-delay: 200ms"
      >
        <div class="relative mb-4">
          <h2 class="font-bold text-xl fuwari-text-90 flex items-center gap-2">
            <span
              class="w-1 h-4 rounded-md inline-block"
              style="background-color: var(--fuwari-primary)"
            />
            交换友链
          </h2>
        </div>

        <div class="prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
          <p>
            欢迎交换友情链接！在申请前请先将本站添加至您的友链中，并在下方评论区留言。
          </p>

          <h3>本站信息</h3>
          <ul>
            <li><strong>名称：</strong>{blogConfig.title}</li>
            <li><strong>简介：</strong>{blogConfig.description}</li>
            <li><strong>链接：</strong><code>{baseUrl}</code></li>
            <li><strong>头像：</strong><code>{avatarUrl}</code></li>
          </ul>

          <h3>申请格式</h3>
          <pre><code>{`- 名称：您的博客名称
- 简介：一句话介绍
- 链接：https://example.com
- 头像：https://example.com/avatar.png`}</code></pre>
        </div>
      </div>

      {/* Giscus 评论留言区 */}
      <Giscus env={c.env} />
    </Layout>
  )
})

export default links
