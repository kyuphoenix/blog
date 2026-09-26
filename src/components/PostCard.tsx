import { FC } from 'hono/jsx'
import type { PostMeta } from '../types/post'
import {
  CalendarIcon,
  TagIcon,
  ClockIcon,
  ChevronRightIcon,
} from './Icons'

interface PostCardProps {
  post: PostMeta
  index?: number
}

export const PostCard: FC<PostCardProps> = ({ post, index = 0 }) => {
  const delay = 150 + index * 50
  const postUrl = `/posts/${encodeURIComponent(post.title)}`

  return (
    <div
      class="fuwari-card-base flex flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative fuwari-onload-animation"
      style={`animation-delay: ${delay}ms`}
    >
      <div class="pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full md:pr-24">
        {/* Title with left vertical accent bar */}
        <a
          href={postUrl}
          class="transition group w-full block font-bold mb-3 text-2xl md:text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary) no-underline"
        >
          {post.title}
          <ChevronRightIcon
            size={28}
            class="inline-block md:hidden text-(--fuwari-primary) align-middle -mt-1 ml-1"
          />
          <ChevronRightIcon
            size={28}
            class="text-(--fuwari-primary) transition hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 ml-1"
          />
        </a>

        {/* Metadata */}
        <div class="flex flex-wrap fuwari-text-50 items-center gap-4 gap-x-4 gap-y-2 mb-4">
          <div class="flex items-center">
            <div class="fuwari-meta-icon">
              <CalendarIcon size={20} strokeWidth={1.5} />
            </div>
            <time datetime={post.date} class="text-sm font-medium">
              {post.date}
            </time>
          </div>

          {(post.category || (post.tags && post.tags.length > 0)) && (
            <div class="flex items-center">
              <div class="fuwari-meta-icon">
                <TagIcon size={20} strokeWidth={1.5} />
              </div>
              <div class="flex flex-row flex-wrap items-center gap-x-1.5">
                {post.category && (
                  <span class="flex items-center">
                    <a
                      href={`/?category=${encodeURIComponent(post.category)}`}
                      class="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary) fuwari-text-50 no-underline"
                    >
                      {post.category}
                    </a>
                    {post.tags && post.tags.length > 0 && (
                      <span class="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                        /
                      </span>
                    )}
                  </span>
                )}
                {post.tags?.map((name, i) => (
                  <span class="flex items-center">
                    {i > 0 && (
                      <span class="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                        /
                      </span>
                    )}
                    <a
                      href={`/?tag=${encodeURIComponent(name)}`}
                      class="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary) fuwari-text-50 no-underline"
                    >
                      {name}
                    </a>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Excerpt / Description */}
        {post.excerpt && (
          <div class="fuwari-text-75 pr-4 mb-3.5 line-clamp-2 md:line-clamp-1">
            {post.excerpt}
          </div>
        )}

        {/* Read time */}
        <div class="text-sm fuwari-text-50 flex items-center gap-4">
          <span class="inline-flex items-center gap-1.5">
            <ClockIcon size={14} />
            {post.readingTime} 分钟阅读
          </span>
        </div>
      </div>

      {/* Right-side full-height Enter button */}
      <a
        href={postUrl}
        aria-label={post.title}
        class="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95"
      >
        <ChevronRightIcon
          size={32}
          strokeWidth={2}
          class="text-(--fuwari-primary) mx-auto"
        />
      </a>
    </div>
  )
}
