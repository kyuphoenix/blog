import { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { css } from '../styles'
import { blogConfig } from '../blog.config'
import { Navbar, BackToTop, ThemeScript } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

interface CategoryItem {
  name: string
  count: number
}

interface TagItem {
  name: string
  count: number
}

interface LayoutProps {
  title?: string
  description?: string
  currentPath?: string
  isHomePage?: boolean
  categories?: CategoryItem[]
  tags?: TagItem[]
  children: any
}

const BANNER_HEIGHT_HOME = 65
const BANNER_HEIGHT_PAGE = 35
const MAIN_OVERLAP_REM = 3.5
const NAVBAR_HEIGHT_REM = 4.5

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  currentPath = '/',
  isHomePage = false,
  categories = [],
  tags = [],
  children,
}) => {
  const pageTitle = title ? `${title} - ${blogConfig.title}` : blogConfig.title
  const bannerHeightVh = isHomePage ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE
  const defaultHue = blogConfig.theme.fuwari.primaryHue

  return (
    <html lang="zh-CN" style={`--fuwari-hue: ${defaultHue};`}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description || blogConfig.description} />
        <link rel="icon" type="image/svg+xml" href={blogConfig.icons.faviconSvg} />
        <link rel="icon" href={blogConfig.icons.faviconIco} />
        {/* Tailwind CSS v4 Browser Runtime for full utility support */}
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        {raw(`<style type="text/tailwindcss">
          @custom-variant dark (&:where(.dark, .dark *));
        </style>`)}
        {/* Highlight.js for code syntax highlighting */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
        {/* Anti-FOUC: apply theme & OKLCH hue before render */}
        {raw(`<script>
          (function() {
            var theme = localStorage.getItem('theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
            var hue = localStorage.getItem('hue');
            if (hue) {
              document.documentElement.style.setProperty('--fuwari-hue', hue);
            }
          })();
        </script>`)}
        <style>{raw(css)}</style>
      </head>
      <body>
        {/* Exact flare-stack-blog PublicLayout structure */}
        <div class="relative min-h-screen bg-(--fuwari-page-bg) transition-colors">
          {/* Top row: Navbar - sticky */}
          <div class="sticky top-0 z-50 pointer-events-none">
            <div class="pointer-events-auto max-w-(--fuwari-page-width) mx-auto px-0 md:px-4">
              <Navbar currentPath={currentPath} bannerHeightVh={bannerHeightVh} />
            </div>
          </div>

          {/* Banner - full width background */}
          <div
            class="absolute left-0 right-0 top-0 z-10 overflow-hidden transition-[height] duration-300 ease-in-out"
            style={`height: ${bannerHeightVh}vh`}
          >
            <img
              src={blogConfig.theme.fuwari.homeBg}
              alt="banner"
              fetchpriority="high"
              class="w-full h-full object-cover object-center"
            />
          </div>

          {/* Main content - overlaps banner by MAIN_OVERLAP_REM */}
          <div
            class="relative z-30 transition-[margin-top] duration-300 ease-in-out"
            style={`margin-top: calc(${bannerHeightVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem);`}
          >
            <div
              class="relative mx-auto px-0 md:px-4 pb-8 grid grid-cols-1 lg:grid-cols-[17.5rem_1fr] gap-4"
              style="max-width: var(--fuwari-page-width);"
            >
              {/* Sidebar Column */}
              <Sidebar
                className="order-2 lg:order-1"
                categories={categories}
                tags={tags}
              />

              {/* Main Content Column */}
              <main class="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
                {children}
              </main>

              {/* Footer Column (Desktop: below main, Mobile: below sidebar) */}
              <div
                class="order-3 lg:col-start-2 fuwari-onload-animation mt-auto"
                style="animation-delay: 250ms"
              >
                <Footer />
              </div>

              <BackToTop />
            </div>
          </div>
        </div>
        <ThemeScript />
        {raw(`<script>hljs.highlightAll();</script>`)}
      </body>
    </html>
  )
}
