import { FC } from 'hono/jsx'
import { blogConfig, BlogConfig } from '../blog.config.js'

export const Footer: FC<{ siteConfig?: BlogConfig }> = ({ siteConfig }) => {
  const currentYear = new Date().getFullYear()
  const cfg = siteConfig || blogConfig

  return (
    <>
      <div class="border-t border-black/10 dark:border-white/15 my-10 border-dashed mx-4 md:mx-32" />
      <div class="border-dashed border-black/10 dark:border-white/15 rounded-2xl mb-12 flex flex-col items-center justify-center px-6 py-8">
        <div class="fuwari-text-50 text-sm text-center leading-relaxed">
          © {currentYear} {cfg.author}. All Rights Reserved. /{' '}
          <a
            href="/sitemap.xml"
            target="_blank"
            data-no-swup
            class="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary) no-underline"
          >
            Sitemap
          </a>
          <br />
          Powered by{' '}
          <a
            href="https://hono.dev"
            target="_blank"
            rel="noreferrer"
            class="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary) no-underline"
          >
            Hono
          </a>{' '}
          &{' '}
          <a
            href="https://github.com/kyuphoenix/honoki"
            target="_blank"
            rel="noreferrer"
            class="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary) no-underline"
          >
            Honoki
          </a>
        </div>
      </div>
    </>
  )
}
