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

export interface ArticleMeta {
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  wordCount?: number
  readingTime?: number
}

export interface VerificationMeta {
  google?: string
  bing?: string
  baidu?: string
  yandex?: string
}

interface LayoutProps {
  title?: string
  description?: string
  keywords?: string[]
  currentPath?: string
  isHomePage?: boolean
  categories?: CategoryItem[]
  tags?: TagItem[]
  blogUrl?: string
  image?: string
  ogType?: 'website' | 'article'
  articleMeta?: ArticleMeta
  verification?: VerificationMeta
  children: any
}

const BANNER_HEIGHT_HOME = 65
const BANNER_HEIGHT_PAGE = 35
const MAIN_OVERLAP_REM = 3.5
const NAVBAR_HEIGHT_REM = 4.5

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  keywords = [],
  currentPath = '/',
  isHomePage = false,
  categories = [],
  tags = [],
  blogUrl,
  image,
  ogType,
  articleMeta,
  verification,
  children,
}) => {
  const pageTitle = title ? `${title} - ${blogConfig.title}` : blogConfig.title
  const bannerHeightVh = isHomePage ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE
  const defaultHue = blogConfig.theme.fuwari.primaryHue

  // 基础域名处理
  const cleanBlogUrl = (blogUrl || '').replace(/\/$/, '')
  const canonicalUrl = cleanBlogUrl ? `${cleanBlogUrl}${currentPath}` : undefined

  // 站长平台验证码（优先使用环境变量传入，其次使用 blogConfig.seo）
  const googleVerification = verification?.google || blogConfig.seo?.googleSiteVerification
  const bingVerification = verification?.bing || blogConfig.seo?.bingSiteVerification
  const baiduVerification = verification?.baidu || blogConfig.seo?.baiduSiteVerification
  const yandexVerification = verification?.yandex || blogConfig.seo?.yandexVerification

  // 图片绝对路径处理 (用于 OpenGraph / Twitter Card / Schema.org)
  const defaultImage = blogConfig.theme.fuwari.homeBg || blogConfig.theme.fuwari.avatar
  const rawImage = image || defaultImage
  const ogImage =
    rawImage.startsWith('http://') || rawImage.startsWith('https://')
      ? rawImage
      : cleanBlogUrl
      ? `${cleanBlogUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
      : rawImage

  // 关键词集合生成
  const computedKeywords = [
    ...(keywords || []),
    ...(blogConfig.seo?.keywords || []),
    ...(articleMeta?.tags || []),
    ...(tags?.map((t) => t.name) || []),
    blogConfig.author,
    '博客',
    '技术博客',
  ].filter(Boolean)
  const uniqueKeywords = Array.from(new Set(computedKeywords)).slice(0, 15).join(', ')

  // 结构化数据 (JSON-LD Schema.org)
  const jsonLdList: any[] = []

  // 1. 站点级结构化数据 WebSite (支持 Google Sitelinks 站内搜索框)
  if (isHomePage) {
    jsonLdList.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: blogConfig.title,
      url: cleanBlogUrl || '/',
      description: blogConfig.description,
      author: {
        '@type': 'Person',
        name: blogConfig.author,
      },
      inLanguage: 'zh-CN',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${cleanBlogUrl || ''}/?keyword={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    })
  }

  // 2. 文章级结构化数据 BlogPosting
  if (articleMeta) {
    jsonLdList.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl || currentPath,
      },
      headline: title || blogConfig.title,
      description: description || blogConfig.description,
      image: ogImage ? [ogImage] : undefined,
      datePublished: articleMeta.publishedTime,
      dateModified: articleMeta.modifiedTime || articleMeta.publishedTime,
      author: {
        '@type': 'Person',
        name: articleMeta.author || blogConfig.author,
      },
      publisher: {
        '@type': 'Organization',
        name: blogConfig.title,
        logo: {
          '@type': 'ImageObject',
          url: cleanBlogUrl ? `${cleanBlogUrl}/favicon.svg` : '/favicon.svg',
        },
      },
      articleSection: articleMeta.section,
      keywords: articleMeta.tags?.join(', '),
      wordCount: articleMeta.wordCount,
      timeRequired: articleMeta.readingTime ? `PT${articleMeta.readingTime}M` : undefined,
      inLanguage: 'zh-CN',
    })
  }

  // 3. 面包屑导航结构化数据 BreadcrumbList
  if (!isHomePage && currentPath !== '/') {
    const breadcrumbItems: any[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: cleanBlogUrl || '/',
      },
    ]

    if (articleMeta) {
      // 文章页拥有 3 级面包屑：首页 -> 所属分类 -> 文章标题
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: articleMeta.section || '文章',
        item: cleanBlogUrl
          ? `${cleanBlogUrl}/?category=${encodeURIComponent(articleMeta.section || '文章')}`
          : '/archive',
      })
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: title || '当前文章',
        item: canonicalUrl || currentPath,
      })
    } else {
      // 普通二级页面（归档、友链、关于）
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: title || '当前页面',
        item: canonicalUrl || currentPath,
      })
    }

    jsonLdList.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    })
  }

  return (
    <html lang="zh-CN" style={`--fuwari-hue: ${defaultHue};`}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description || blogConfig.description} />
        {uniqueKeywords && <meta name="keywords" content={uniqueKeywords} />}
        <meta name="author" content={articleMeta?.author || blogConfig.author} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />

        {/* 站长平台所有权验证 Meta 标记 */}
        {googleVerification && (
          <meta name="google-site-verification" content={googleVerification} />
        )}
        {bingVerification && <meta name="msvalidate.01" content={bingVerification} />}
        {baiduVerification && (
          <meta name="baidu-site-verification" content={baiduVerification} />
        )}
        {yandexVerification && (
          <meta name="yandex-verification" content={yandexVerification} />
        )}

        {/* 规范链接 Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

        {/* OpenGraph 协议元数据 */}
        <meta property="og:site_name" content={blogConfig.title} />
        <meta property="og:locale" content="zh_CN" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description || blogConfig.description} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:type" content={ogType || (isHomePage ? 'website' : 'article')} />
        {ogImage && <meta property="og:image" content={ogImage} />}

        {/* 文章专用 OpenGraph 元数据 */}
        {articleMeta && (
          <>
            {articleMeta.publishedTime && (
              <meta property="article:published_time" content={articleMeta.publishedTime} />
            )}
            {articleMeta.modifiedTime && (
              <meta property="article:modified_time" content={articleMeta.modifiedTime} />
            )}
            {articleMeta.author && (
              <meta property="article:author" content={articleMeta.author} />
            )}
            {articleMeta.section && (
              <meta property="article:section" content={articleMeta.section} />
            )}
            {articleMeta.tags?.map((t) => (
              <meta property="article:tag" content={t} />
            ))}
          </>
        )}

        {/* Twitter Card 元数据 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description || blogConfig.description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <meta name="twitter:creator" content={blogConfig.author} />

        {/* RSS 与 Sitemap 自动发现关联 */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${blogConfig.title} - RSS`}
          href={`${cleanBlogUrl || ''}/rss.xml`}
        />
        <link
          rel="sitemap"
          type="application/xml"
          title="Sitemap"
          href={`${cleanBlogUrl || ''}/sitemap.xml`}
        />

        {/* 搜索引擎结构化数据 (JSON-LD) */}
        {jsonLdList.map((data) => (
          <script type="application/ld+json">{raw(JSON.stringify(data))}</script>
        ))}

        {/* DNS-Prefetch 与 CDN Preconnect 优化 (显著降低 Core Web Vitals LCP 延迟) */}
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="icon" type="image/svg+xml" href={blogConfig.icons.faviconSvg} />
        <link rel="icon" href={blogConfig.icons.faviconIco} />
        <link rel="apple-touch-icon" href={blogConfig.icons.appleTouchIcon} />
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
