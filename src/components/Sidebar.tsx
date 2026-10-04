import { FC } from 'hono/jsx'
import { blogConfig, BlogConfig } from '../blog.config.js'
import { GithubIcon, MailIcon, RssIcon, BilibiliIcon, TwitterIcon, ExternalLinkIcon } from './Icons.js'

interface CategoryItem {
  name: string
  count: number
}

interface TagItem {
  name: string
  count: number
}

interface SidebarProps {
  className?: string
  categories?: CategoryItem[]
  tags?: TagItem[]
  siteConfig?: BlogConfig
}

const renderSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'github':
      return <GithubIcon size={20} strokeWidth={1.5} />
    case 'email':
      return <MailIcon size={20} strokeWidth={1.5} />
    case 'rss':
      return <RssIcon size={20} strokeWidth={1.5} />
    case 'bilibili':
      return <BilibiliIcon size={20} />
    case 'twitter':
    case 'x':
      return <TwitterIcon size={20} />
    default:
      return <ExternalLinkIcon size={18} strokeWidth={1.5} />
  }
}

export const Sidebar: FC<SidebarProps> = ({
  className = '',
  categories = [],
  tags = [],
  siteConfig,
}) => {
  const cfg = siteConfig || blogConfig

  return (
    <aside class={`flex flex-col gap-4 ${className}`}>
      {/* Profile Card (Exact flare-stack-blog profile.tsx port) */}
      <div class="fuwari-onload-animation" style="animation-delay: 100ms">
        <div class="fuwari-card-base p-4">
          <a
            href="/"
            class="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-hidden rounded-xl active:scale-95"
            aria-label="头像"
          >
            <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/30 group-active:bg-black/50 transition-colors pointer-events-none" />
            <img
              src={cfg.theme.fuwari.avatar}
              alt={cfg.author}
              class="w-full h-auto aspect-square object-cover"
            />
          </a>
          <div class="px-2 text-center">
            <div class="font-bold text-xl fuwari-text-90 mb-1">
              {cfg.author}
            </div>
            <div
              class="h-1 w-5 rounded-full mx-auto mb-2"
              style="background-color: var(--fuwari-primary)"
            />
            <div class="fuwari-text-50 text-sm mb-2.5">
              {cfg.description}
            </div>
            <div class="flex flex-wrap gap-2 justify-center">
              {cfg.social.map((link) => (
                <a
                  href={link.url}
                  target={link.platform === 'email' ? undefined : '_blank'}
                  rel={link.platform === 'email' ? undefined : 'me noreferrer'}
                  aria-label={link.label}
                  class="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-colors"
                >
                  {renderSocialIcon(link.platform)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Tags Sticky Column */}
      <div class="sticky top-4 flex flex-col gap-4">
        {categories.length > 0 && (
          <div
            class="fuwari-card-base pb-4 transition-all duration-300 fuwari-onload-animation"
            style="animation-delay: 125ms"
          >
            <div class="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
              <span
                class="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
                style="background-color: var(--fuwari-primary)"
              />
              分类
            </div>
            <div class="px-4 flex flex-col gap-1">
              {categories.map((cat) => (
                <a
                  href={`/?category=${encodeURIComponent(cat.name)}`}
                  class="fuwari-expand-animation rounded-lg h-9 px-3 flex items-center justify-between text-sm font-medium fuwari-text-75 hover:text-(--fuwari-primary) no-underline"
                >
                  <span>{cat.name}</span>
                  <span class="bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) rounded-md px-2 py-0.5 text-xs font-bold">
                    {cat.count}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div
            class="fuwari-card-base pb-4 transition-all duration-300 fuwari-onload-animation"
            style="animation-delay: 150ms"
          >
            <div class="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
              <span
                class="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
                style="background-color: var(--fuwari-primary)"
              />
              标签
            </div>
            <div class="px-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <a
                  href={`/?tag=${encodeURIComponent(tag.name)}`}
                  class="fuwari-btn-regular h-8 text-sm px-3 rounded-lg flex items-center gap-2 no-underline"
                >
                  <span>{tag.name}</span>
                  <span class="bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 text-xs opacity-70">
                    {tag.count}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
