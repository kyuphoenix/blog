import { Hono } from 'hono'
import { raw } from 'hono/html'
import { AppEnv } from '../types/env'
import { Layout, Giscus } from '../components'
import {
  FileTextIcon,
  ClockIcon,
  CalendarIcon,
  EditIcon,
  TagIcon,
  QuoteIcon,
  ChevronRightIcon,
} from '../components/Icons'
import { getPost, getManifest, getSidebarData } from '../services/github'
import { marked } from 'marked'

const postPage = new Hono<AppEnv>()

interface TocItem {
  id: string
  text: string
  level: number
}

postPage.get('/:title', async (c) => {
  const rawTitle = c.req.param('title')
  const title = decodeURIComponent(rawTitle)
  const post = await getPost(title, c.env)
  const { categories, tags } = await getSidebarData(c.env)

  if (!post || post.draft) {
    return c.html(
      <Layout title="404 - 文章不存在" currentPath="/posts" categories={categories} tags={tags}>
        <div class="fuwari-card-base p-12 text-center fuwari-onload-animation">
          <h1 class="text-4xl font-bold fuwari-text-90 mb-3">404</h1>
          <p class="fuwari-text-50 mb-6">抱歉，您访问的文章不存在或已下线。</p>
          <a
            href="/"
            class="fuwari-btn-primary inline-flex px-5 py-2.5 rounded-xl font-bold text-sm no-underline"
          >
            返回首页
          </a>
        </div>
      </Layout>,
      404
    )
  }

  // Extract TOC headings and render markdown
  const toc: TocItem[] = []
  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const cleanText = text.replace(/<[^>]+>/g, '')
    const id = 'heading-' + toc.length
    if (depth >= 1 && depth <= 3) {
      toc.push({ id, text: cleanText, level: depth })
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }

  const htmlContent = await marked.parse(post.content, {
    gfm: true,
    breaks: true,
    renderer,
  })

  // Approximate word count
  const chineseChars = (post.content.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = post.content
    .replace(/[\u4e00-\u9fff]/g, '')
    .split(/\s+/)
    .filter(Boolean).length
  const wordCount = Math.max(100, chineseChars + englishWords)

  // Compute minDepth for TOC numbering (exact flare-stack-blog TableOfContents logic)
  let minDepth = 10
  for (const h of toc) {
    if (h.level < minDepth) minDepth = h.level
  }
  let h1Count = 1

  // Compute Prev / Next posts from manifest
  const manifest = (await getManifest(c.env))
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const currentIndex = manifest.findIndex((p) => p.title === post.title || p.slug === post.title)
  const prevPost = currentIndex > 0 ? manifest[currentIndex - 1] : null
  const nextPost =
    currentIndex >= 0 && currentIndex < manifest.length - 1
      ? manifest[currentIndex + 1]
      : null

  return c.html(
    <Layout
      title={post.title}
      description={post.excerpt}
      currentPath={`/posts/${encodeURIComponent(post.title)}`}
      isHomePage={false}
      categories={categories}
      tags={tags}
    >
      <div class="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
        {/* Table Of Contents (Desktop Floating Right - Exact flare-stack-blog port) */}
        {toc.length > 0 && (
          <div
            class="hidden 2xl:block absolute top-0 h-full pl-4"
            style="right: calc(var(--fuwari-toc-width) * -1); width: var(--fuwari-toc-width);"
          >
            <nav
              id="toc-nav-wrapper"
              class="sticky top-14 self-start block w-full transition-all duration-500 opacity-100 translate-y-0"
            >
              <div
                id="toc-scroll-container"
                class="relative toc-root overflow-y-auto overflow-x-hidden fuwari-toc-scrollbar h-[calc(100vh-20rem)]"
                style="scroll-behavior: smooth; mask-image: linear-gradient(to bottom, transparent 0%, black 2rem, black calc(100% - 2rem), transparent 100%);"
              >
                <div class="h-8 w-full" />
                <div id="toc-links-container" class="group relative flex flex-col w-full">
                  {toc
                    .filter((h) => h.level < minDepth + 3)
                    .map((heading) => {
                      const isH1 = heading.level === minDepth
                      const isH2 = heading.level === minDepth + 1
                      const isH3 = heading.level === minDepth + 2

                      return (
                        <a
                          href={`#${heading.id}`}
                          data-toc-target={heading.id}
                          class="toc-item-link px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl py-2 z-10 items-center hover:bg-(--fuwari-toc-btn-hover) active:bg-(--fuwari-toc-btn-active) no-underline"
                        >
                          <div
                            class={`transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold ${
                              isH1
                                ? 'bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)'
                                : isH2
                                  ? 'ml-4'
                                  : 'ml-8'
                            }`}
                          >
                            {isH1 && h1Count++}
                            {isH2 && (
                              <div class="transition w-2 h-2 rounded-[0.1875rem] bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg)" />
                            )}
                            {isH3 && (
                              <div class="transition w-1.5 h-1.5 rounded-sm bg-black/15 dark:bg-white/20" />
                            )}
                          </div>
                          <div
                            class={`transition text-sm truncate ${
                              isH1 || isH2 ? 'fuwari-text-50' : 'fuwari-text-30'
                            }`}
                          >
                            {heading.text}
                          </div>
                        </a>
                      )
                    })}

                  {/* Active Indicator Backdrop */}
                  <div
                    id="toc-active-indicator"
                    class="absolute left-0 right-0 rounded-xl transition-all duration-300 ease-out -z-10 border-2 border-dashed pointer-events-none bg-(--fuwari-toc-btn-hover) border-(--fuwari-toc-btn-hover) group-hover:bg-transparent group-hover:border-(--fuwari-toc-btn-active)"
                    style="top: 0px; height: 36px; opacity: 0;"
                  />
                </div>
                <div class="h-8 w-full" />
              </div>
            </nav>
          </div>
        )}

        {/* Main Post Container (Exact flare-stack-blog PostPage port) */}
        <div class="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full fuwari-onload-animation">
          {/* Word count and reading time */}
          <div class="flex flex-row flex-wrap fuwari-text-30 gap-5 mb-3 transition">
            <div class="flex flex-row items-center">
              <div class="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                <FileTextIcon strokeWidth={1.5} size={16} />
              </div>
              <div class="text-sm">{wordCount} 字</div>
            </div>
            <div class="flex flex-row items-center">
              <div class="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                <ClockIcon strokeWidth={1.5} size={16} />
              </div>
              <div class="text-sm">{post.readingTime} 分钟</div>
            </div>
          </div>

          {/* Title */}
          <div class="relative">
            <h1
              class="transition w-full block font-bold mb-3
                text-3xl md:text-[2.25rem]/[2.75rem]
                fuwari-text-90
                md:before:w-1 before:h-5 before:rounded-md before:bg-(--fuwari-primary)
                before:absolute before:top-3 before:-left-4.5"
            >
              {post.title}
            </h1>
          </div>

          {/* PostMeta (Exact flare-stack-blog PostMeta port) */}
          <div class="flex flex-wrap text-black/50 dark:text-white/40 items-center gap-4 gap-x-4 gap-y-2 mb-5">
            <div class="flex items-center">
              <div class="fuwari-meta-icon">
                <CalendarIcon strokeWidth={1.5} size={20} />
              </div>
              <span class="text-sm font-medium fuwari-text-50">{post.date}</span>
            </div>

            {post.updated && post.updated !== post.date && (
              <div class="flex items-center">
                <div class="fuwari-meta-icon">
                  <EditIcon strokeWidth={1.5} size={20} />
                </div>
                <span class="text-sm font-medium fuwari-text-50">
                  {post.updated}
                </span>
              </div>
            )}

            <div class="flex items-center">
              <div class="fuwari-meta-icon">
                <TagIcon strokeWidth={1.5} size={20} />
              </div>
              <div class="flex flex-row flex-wrap items-center gap-x-1.5">
                {post.category && (
                  <span class="flex items-center">
                    <a
                      href={`/?category=${encodeURIComponent(post.category)}`}
                      class="transition fuwari-text-50 text-sm font-medium hover:text-(--fuwari-primary) whitespace-nowrap no-underline"
                    >
                      {post.category}
                    </a>
                    {post.tags.length > 0 && (
                      <span class="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                        /
                      </span>
                    )}
                  </span>
                )}
                {post.tags.map((tag, i) => (
                  <span class="flex items-center">
                    {i > 0 && (
                      <span class="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                        /
                      </span>
                    )}
                    <a
                      href={`/?tag=${encodeURIComponent(tag)}`}
                      class="transition fuwari-text-50 text-sm font-medium hover:text-(--fuwari-primary) whitespace-nowrap no-underline"
                    >
                      {tag}
                    </a>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PostSummary (Exact flare-stack-blog PostSummary port) */}
          {post.excerpt && (
            <div
              class="mb-4 md:mb-6 rounded-2xl bg-(--fuwari-primary)/5 border border-black/5 dark:border-white/10 p-4 md:p-5 flex items-start gap-3 md:gap-4 transition-all hover:bg-(--fuwari-primary)/10 fuwari-onload-animation backdrop-blur-xs"
              style="animation-delay: 200ms"
            >
              <div class="shrink-0 text-(--fuwari-primary) bg-(--fuwari-primary)/10 p-2 md:p-2.5 rounded-xl flex items-center justify-center mt-0.5">
                <QuoteIcon size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-[11px] md:text-xs font-bold text-(--fuwari-primary) flex items-center mb-1 md:mb-1.5 uppercase tracking-[0.2em] opacity-80">
                  文章摘要
                </h3>
                <p class="text-sm md:text-[15px] leading-relaxed fuwari-text-70 font-medium m-0">
                  {post.excerpt}
                </p>
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <div class="mb-6 prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
            {raw(htmlContent)}
          </div>

          {/* End of Content Notice */}
          <div class="my-8 flex items-center justify-center w-full">
            <div class="h-px w-full bg-linear-to-r from-transparent via-(--fuwari-meta-divider) to-transparent opacity-20" />
            <span class="mx-4 text-sm font-mono tracking-widest text-(--fuwari-meta-divider) opacity-50 whitespace-nowrap">
              END
            </span>
            <div class="h-px w-full bg-linear-to-r from-(--fuwari-meta-divider) via-transparent to-transparent opacity-20" />
          </div>
        </div>

        {/* Giscus Comments Section */}
        <Giscus />

        {/* Prev / Next Navigation Cards (Fuwari style) */}
        <div
          class="flex flex-col md:flex-row justify-between w-full gap-4 overflow-hidden fuwari-onload-animation"
          style="animation-delay: 200ms"
        >
          {prevPost ? (
            <a
              href={`/posts/${encodeURIComponent(prevPost.title)}`}
              class="fuwari-card-base w-full h-15 px-4 flex items-center gap-3 hover:bg-(--fuwari-btn-plain-bg-hover) active:scale-98 transition no-underline"
            >
              <span class="rotate-180 text-(--fuwari-primary) flex shrink-0">
                <ChevronRightIcon size={24} />
              </span>
              <div class="overflow-hidden">
                <div class="text-xs fuwari-text-50">上一篇</div>
                <div class="font-bold fuwari-text-75 truncate">{prevPost.title}</div>
              </div>
            </a>
          ) : (
            <div class="w-full hidden md:block" />
          )}

          {nextPost ? (
            <a
              href={`/posts/${encodeURIComponent(nextPost.title)}`}
              class="fuwari-card-base w-full h-15 px-4 flex items-center justify-end gap-3 text-right hover:bg-(--fuwari-btn-plain-bg-hover) active:scale-98 transition no-underline"
            >
              <div class="overflow-hidden">
                <div class="text-xs fuwari-text-50">下一篇</div>
                <div class="font-bold fuwari-text-75 truncate">{nextPost.title}</div>
              </div>
              <span class="text-(--fuwari-primary) flex shrink-0">
                <ChevronRightIcon size={24} />
              </span>
            </a>
          ) : (
            <div class="w-full hidden md:block" />
          )}
        </div>
      </div>

      {/* TOC Active Indicator Scroll Spy Script */}
      {toc.length > 0 &&
        raw(`<script>
        (function() {
          var links = Array.from(document.querySelectorAll('.toc-item-link'));
          var indicator = document.getElementById('toc-active-indicator');
          if (!links.length || !indicator) return;

          var headings = links.map(function(l) {
            return document.getElementById(l.getAttribute('data-toc-target'));
          }).filter(Boolean);

          function updateTocIndicator() {
            var scrollY = window.scrollY + 140;
            var activeIdx = 0;
            for (var i = 0; i < headings.length; i++) {
              if (headings[i].offsetTop <= scrollY) {
                activeIdx = i;
              }
            }
            var activeLink = links[activeIdx];
            if (activeLink) {
              indicator.style.top = activeLink.offsetTop + 'px';
              indicator.style.height = activeLink.offsetHeight + 'px';
              indicator.style.opacity = '1';
            }
          }
          window.addEventListener('scroll', updateTocIndicator, { passive: true });
          window.addEventListener('resize', updateTocIndicator);
          setTimeout(updateTocIndicator, 100);
        })();
      </script>`)}
    </Layout>
  )
})

export default postPage
