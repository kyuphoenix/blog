import { FC } from 'hono/jsx'
import type { PostMeta } from '../types/post.js'
import { i18n, I18nKey, formatDate } from '../i18n/index.js'
import {
  CalendarIcon,
  EditIcon,
  TagIcon,
  ClockIcon,
  ChevronRightIcon,
  EyeIcon,
  FireIcon,
} from './Icons.js'

export interface PostCardItem extends PostMeta {
  isTop?: boolean
  rank?: number
  views?: number
}

interface PostCardProps {
  post: PostCardItem
  index?: number
  lang?: string
}

export const PostCard: FC<PostCardProps> = ({ post, index = 0, lang }) => {
  const delay = 150 + index * 50
  const postUrl = `/posts/${encodeURIComponent(post.title)}`
  const cleanTitle = post.title.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  const hasCover = Boolean(post.cover && post.cover.trim())

  return (
    <div
      class="fuwari-card-base flex flex-col-reverse md:flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative fuwari-onload-animation"
      style={`animation-delay: ${delay}ms`}
    >
      <div
        class={`pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full ${
          hasCover
            ? 'md:w-[calc(100%-28%-12px)] md:pr-4'
            : 'md:w-[calc(100%-52px-12px)] md:pr-6'
        }`}
      >
        {/* Title with left vertical accent bar */}
        <a
          href={postUrl}
          class="transition group w-full block font-bold mb-3 text-2xl md:text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary) no-underline"
        >
          {cleanTitle}
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
              {formatDate(post.date, lang)}
            </time>
          </div>

          {post.updated && (
            <div class="flex items-center">
              <div class="fuwari-meta-icon">
                <EditIcon size={20} strokeWidth={1.5} />
              </div>
              <time datetime={post.updated} class="text-sm font-medium">
                {formatDate(post.updated, lang)}
              </time>
            </div>
          )}

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

        {/* Read time and views */}
        <div class="text-sm fuwari-text-50 flex flex-wrap items-center gap-4">
          <span class="inline-flex items-center gap-1.5">
            <ClockIcon size={14} />
            {post.readingTime} {i18n(post.readingTime === 1 ? I18nKey.minuteCount : I18nKey.minutesCount, lang)}
          </span>
          {/* 异步阅读量徽章 (默认 hidden，客户端异步拉取成功且 views > 0 时展示；失败则保持隐藏不渲染) */}
          <span
            class="post-views-badge inline-flex items-center gap-1.5 text-(--fuwari-primary) font-medium hidden"
            data-slug={post.title}
          >
            <EyeIcon size={14} />
            <span class="post-views-num"></span>
            <span>{i18n(I18nKey.viewsCount, lang)}</span>
          </span>
        </div>
      </div>

      {/* Cover Image (Fuwari Layout) */}
      {hasCover && (
        <a
          href={postUrl}
          aria-label={post.title}
          class="group max-h-[22vh] md:max-h-none mx-4 mt-4 -mb-2 md:mb-0 md:mx-0 md:mt-0 md:w-[28%] md:max-w-[18rem] relative md:absolute md:top-3 md:bottom-3 md:right-3 rounded-xl overflow-hidden active:scale-98 transition no-underline block"
        >
          <div class="absolute inset-0 pointer-events-none z-10 w-full h-full group-hover:bg-black/30 group-active:bg-black/50 transition duration-300" />
          <div class="absolute inset-0 pointer-events-none z-20 w-full h-full flex items-center justify-center">
            <ChevronRightIcon
              class="transition-all duration-300 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 text-white"
              size={40}
              strokeWidth={2}
            />
          </div>
          <img
            src={post.cover}
            alt={post.title}
            loading="lazy"
            decoding="async"
            class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        </a>
      )}

      {/* Right-side full-height Enter button (when no cover) */}
      {!hasCover && (
        <a
          href={postUrl}
          aria-label={post.title}
          class="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95 no-underline items-center justify-center"
        >
          <ChevronRightIcon
            size={32}
            strokeWidth={2}
            class="text-(--fuwari-primary) mx-auto"
          />
        </a>
      )}
    </div>
  )
}
