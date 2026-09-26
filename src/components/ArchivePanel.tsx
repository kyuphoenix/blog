import { FC } from 'hono/jsx'
import type { PostMeta } from '../types/post'

interface ArchivePanelProps {
  posts: PostMeta[]
}

export const ArchivePanel: FC<ArchivePanelProps> = ({ posts }) => {
  const groupedPosts = posts.reduce(
    (acc, post) => {
      if (!post.date) return acc
      const year = new Date(post.date).getUTCFullYear()
      acc[year] ??= []
      acc[year].push(post)
      return acc
    },
    {} as Record<number, PostMeta[]>
  )

  const years = Object.keys(groupedPosts)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div
      class="fuwari-card-base px-8 py-6 fuwari-onload-animation"
      style="animation-delay: 150ms"
    >
      {years.map((year) => (
        <div>
          {/* ArchiveYear */}
          <div class="flex flex-row w-full items-center h-15">
            <div class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right fuwari-text-75">
              {year}
            </div>
            <div class="w-[15%] md:w-[10%]">
              <div class="h-3 w-3 bg-none rounded-full outline-2 outline-(--fuwari-primary) mx-auto -outline-offset-2 z-50" />
            </div>
            <div class="w-[70%] md:w-[80%] transition text-left fuwari-text-50 text-sm">
              {groupedPosts[year].length} 篇文章
            </div>
          </div>

          {/* ArchivePost rows */}
          {groupedPosts[year].map((post) => {
            const dateObj = new Date(post.date)
            const mmdd = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
            const postUrl = `/posts/${encodeURIComponent(post.title)}`

            return (
              <a
                href={postUrl}
                class="group block! h-10 w-full rounded-lg hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-colors no-underline"
                aria-label={post.title}
              >
                <div class="flex flex-row justify-start items-center h-full">
                  {/* Date */}
                  <div class="w-[15%] md:w-[10%] transition text-sm text-right fuwari-text-50 font-mono">
                    {mmdd}
                  </div>

                  {/* Dot and Line */}
                  <div class="w-[15%] md:w-[10%] relative fuwari-timeline-dash h-full flex items-center">
                    <div
                      class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                        bg-black/50 dark:bg-white/50 group-hover:bg-(--fuwari-primary)
                        outline-4 z-50
                        outline-(--fuwari-card-bg)
                        group-hover:outline-(--fuwari-btn-plain-bg-hover)
                        group-active:outline-(--fuwari-btn-plain-bg-active)"
                    />
                  </div>

                  {/* Post Title */}
                  <div
                    class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                      group-hover:translate-x-1 transition-all group-hover:text-(--fuwari-primary)
                      fuwari-text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
                  >
                    {post.title}
                  </div>

                  {/* Tag List */}
                  <div class="hidden md:block md:w-[15%] text-left text-sm transition whitespace-nowrap overflow-ellipsis overflow-hidden fuwari-text-30">
                    {post.tags?.map((t) => `#${t}`).join(' ')}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
