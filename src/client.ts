import Swup from 'swup'
import SwupPreloadPlugin from '@swup/preload-plugin'

// Fuwari banner and content layout constants
const BANNER_HEIGHT_HOME = 100
const BANNER_HEIGHT_PAGE = 50
const CONTENT_OFFSET_HOME = 65
const CONTENT_OFFSET_PAGE = 50
const MAIN_OVERLAP_REM = 3.5
const NAVBAR_HEIGHT_REM = 4.5

/**
 * 判断目标 URL 是否属于博客首页
 */
function isHomeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.pathname === '/' || parsed.pathname === ''
  } catch {
    return url === '/' || url.startsWith('/?')
  }
}

/**
 * 丝滑更新全屏大背景图高度及主内容区上外边距 (Fuwari 规范)
 */
function updateBannerAndLayout(targetUrl: string) {
  const isHome = isHomeUrl(targetUrl)
  const bannerVh = isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE
  const contentVh = isHome ? CONTENT_OFFSET_HOME : CONTENT_OFFSET_PAGE

  const bannerWrapper = document.getElementById('fuwari-banner-wrapper')
  if (bannerWrapper) {
    bannerWrapper.style.height = `${bannerVh}vh`
  }

  const mainWrapper = document.getElementById('fuwari-main-wrapper')
  if (mainWrapper) {
    mainWrapper.style.marginTop = `calc(${contentVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem)`
  }

  const navbarWrapper = document.getElementById('fuwari-navbar-wrapper')
  if (navbarWrapper) {
    navbarWrapper.setAttribute('data-banner-vh', String(contentVh))
  }
}

/**
 * 实时同步顶部导航栏的高亮状态 (Desktop & Mobile)
 */
function updateNavbarActive(targetUrl: string) {
  try {
    const parsed = new URL(targetUrl, window.location.origin)
    const path = parsed.pathname

    // 桌面端导航高亮切换
    const desktopLinks = document.querySelectorAll<HTMLAnchorElement>('#fuwari-navbar nav a')
    desktopLinks.forEach((link) => {
      const linkHref = link.getAttribute('href') || ''
      const isHomeLink = linkHref === '/'
      const isActive = isHomeLink
        ? path === '/'
        : path === linkHref || (linkHref !== '/' && path.startsWith(linkHref))

      if (isActive) {
        link.classList.add('text-(--fuwari-primary)')
        link.classList.remove('fuwari-text-75')
      } else {
        link.classList.remove('text-(--fuwari-primary)')
        link.classList.add('fuwari-text-75')
      }
    })

    // 移动端抽屉导航高亮切换
    const mobileLinks = document.querySelectorAll<HTMLAnchorElement>('#mobile-menu-panel nav a')
    mobileLinks.forEach((link) => {
      const linkHref = link.getAttribute('href') || ''
      const isHomeLink = linkHref === '/'
      const isActive = isHomeLink
        ? path === '/'
        : path === linkHref || (linkHref !== '/' && path.startsWith(linkHref))

      if (isActive) {
        link.classList.add('text-(--fuwari-primary)')
        link.classList.remove('fuwari-text-75')
      } else {
        link.classList.remove('text-(--fuwari-primary)')
        link.classList.add('fuwari-text-75')
      }
    })
  } catch (e) {
    console.error('Update navbar error:', e)
  }
}

/**
 * 重新执行新页面注入容器内部的内联脚本 (如代码高亮、文章目录滚动监听、阅读统计等)
 */
function reexecuteScripts(container: HTMLElement) {
  const scripts = container.querySelectorAll('script')
  scripts.forEach((oldScript) => {
    // 忽略显式标记为忽略的脚本
    if (oldScript.hasAttribute('data-swup-ignore-script')) return

    const newScript = document.createElement('script')
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value)
    })
    newScript.textContent = oldScript.textContent
    oldScript.parentNode?.replaceChild(newScript, oldScript)
  })
}

/**
 * 关闭移动端菜单抽屉
 */
function closeMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay')
  const panel = document.getElementById('mobile-menu-panel')
  if (overlay && panel) {
    overlay.classList.add('opacity-0', 'pointer-events-none', 'invisible')
    overlay.classList.remove('visible')
    panel.classList.add('-translate-y-4')
    overlay.setAttribute('aria-hidden', 'true')
  }
}

/**
 * 图片点击放大画廊 (Image Lightbox)
 */
let lightboxModal: HTMLElement | null = null
let lightboxImg: HTMLImageElement | null = null
let lightboxCaption: HTMLElement | null = null

function ensureLightbox() {
  if (lightboxModal) return lightboxModal

  lightboxModal = document.createElement('div')
  lightboxModal.id = 'fuwari-image-lightbox'
  lightboxModal.className = 'fuwari-lightbox'
  lightboxModal.setAttribute('aria-hidden', 'true')
  lightboxModal.innerHTML = `
    <div class="fuwari-lightbox__backdrop"></div>
    <div class="fuwari-lightbox__container">
      <button class="fuwari-lightbox__close" aria-label="关闭图片预览" title="关闭">&times;</button>
      <img class="fuwari-lightbox__image" src="" alt="" />
      <div class="fuwari-lightbox__caption"></div>
    </div>
  `

  document.body.appendChild(lightboxModal)

  lightboxImg = lightboxModal.querySelector<HTMLImageElement>('.fuwari-lightbox__image')
  lightboxCaption = lightboxModal.querySelector<HTMLElement>('.fuwari-lightbox__caption')

  const closeBtn = lightboxModal.querySelector<HTMLButtonElement>('.fuwari-lightbox__close')
  const backdrop = lightboxModal.querySelector<HTMLElement>('.fuwari-lightbox__backdrop')

  function closeLightbox() {
    if (!lightboxModal) return
    lightboxModal.classList.remove('is-open')
    lightboxModal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
    setTimeout(() => {
      if (lightboxImg && !lightboxModal?.classList.contains('is-open')) {
        lightboxImg.src = ''
      }
    }, 250)
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox)
  if (backdrop) backdrop.addEventListener('click', closeLightbox)
  if (lightboxImg) lightboxImg.addEventListener('click', closeLightbox)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal?.classList.contains('is-open')) {
      closeLightbox()
    }
  })

  return lightboxModal
}

function openLightbox(src: string, alt: string, captionText: string) {
  ensureLightbox()
  if (!lightboxModal || !lightboxImg) return

  lightboxImg.src = src
  lightboxImg.alt = alt || captionText || 'Enlarged image'
  if (lightboxCaption) {
    const text = captionText || alt || ''
    lightboxCaption.textContent = text
    lightboxCaption.style.display = text ? 'block' : 'none'
  }

  lightboxModal.classList.add('is-open')
  lightboxModal.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function initImageLightbox() {
  if ((window as any).__fuwari_lightbox_initialized) return
  ;(window as any).__fuwari_lightbox_initialized = true

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target && target.tagName === 'IMG') {
      const img = target as HTMLImageElement
      const isZoomable =
        img.classList.contains('zoomable') ||
        img.hasAttribute('data-zoomable') ||
        Boolean(img.closest('.prose'))

      const isExcluded =
        img.closest('.profile') ||
        img.closest('#fuwari-banner-wrapper') ||
        img.closest('nav') ||
        img.classList.contains('no-zoom')

      if (isZoomable && !isExcluded && img.src) {
        e.preventDefault()
        e.stopPropagation()
        const caption = img.getAttribute('title') || img.getAttribute('alt') || ''
        openLightbox(img.src, img.alt, caption)
      }
    }
  })
}

/**
 * 极速即时预加载引擎 (Instant Preload Engine)
 *
 * 彻底修复 @swup/preload-plugin 在链接内包含子元素 (span, svg, div) 时静默丢弃 hover 事件的缺陷：
 * 1. 鼠标悬停预加载：使用全局 mouseover 委托 + closest('a[href]')，光标无论接触到文字、图标、卡片任意区域，均立即发起预加载；
 * 2. 触控按压预加载：在移动端 touchstart 瞬间预加载，利用手指从触碰屏幕到抬起点击的 100~300ms 黄金时间差完成数据拉取，彻底抹平触控延迟；
 * 3. 键盘焦点预加载：在 focusin 发生时预加载；
 * 4. 浏览器空闲预取：页面初始化及每次切换完成后，在 requestIdleCallback 空闲时段自动静默预加载顶部核心页签（首页、归档、友链、关于），实现 100% 内存瞬开！
 */
function initInstantPreload(swup: Swup) {
  const preloadedUrls = new Set<string>()

  function shouldPreload(targetPath: string, link?: HTMLAnchorElement): boolean {
    if (!targetPath) return false
    try {
      const parsed = new URL(targetPath, window.location.origin)
      // 仅预加载站内同源链接
      if (parsed.origin !== window.location.origin) return false

      const cleanPath = parsed.pathname + parsed.search
      const currentPath = window.location.pathname + window.location.search
      // 排除当前正在浏览的页面
      if (cleanPath === currentPath) return false

      // 排除静态文件、API 接口及非 HTML 页面
      if (
        parsed.pathname.startsWith('/api/') ||
        parsed.pathname.startsWith('/css/') ||
        parsed.pathname.startsWith('/js/') ||
        parsed.pathname.startsWith('/images/') ||
        /\.(webp|jpg|jpeg|png|gif|svg|ico|css|js|json|xml|txt|pdf|woff2?)$/i.test(parsed.pathname)
      ) {
        return false
      }

      if (link) {
        if (link.target && link.target !== '_self') return false
        if (link.hasAttribute('download')) return false
        if (link.getAttribute('rel')?.includes('external')) return false
        if (link.hasAttribute('data-no-swup') || link.hasAttribute('data-swup-ignore')) return false
        // 遵循 Swup 自身的忽略规则
        if (typeof swup.shouldIgnoreVisit === 'function' && swup.shouldIgnoreVisit(link.href, { el: link })) {
          return false
        }
      }

      // 避免重复发起
      if (preloadedUrls.has(cleanPath)) return false
      const resolved = swup.resolveUrl(cleanPath)
      if (swup.cache?.has?.(resolved)) return false

      return true
    } catch {
      return false
    }
  }

  function triggerPreload(url: string, link?: HTMLAnchorElement) {
    try {
      const parsed = new URL(url, window.location.origin)
      const cleanPath = parsed.pathname + parsed.search
      if (!shouldPreload(cleanPath, link)) return

      preloadedUrls.add(cleanPath)

      // 优先调用 Swup 官方 preload API 填充其内部 cache
      if (typeof (swup as any).preload === 'function') {
        ;(swup as any).preload(cleanPath, { priority: true })
      } else if (typeof swup.fetchPage === 'function') {
        swup.fetchPage(cleanPath)
      }
    } catch (err) {
      console.warn('Instant preload error:', err)
    }
  }

  // 1. 鼠标悬停 (mouseover 无论光标落在链接内哪个 span、svg 或 div 都能 100% 捕获)
  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target as HTMLElement | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (link && link.href) {
        triggerPreload(link.href, link)
      }
    },
    { passive: true }
  )

  // 2. 移动端触摸开始瞬间预加载
  document.addEventListener(
    'touchstart',
    (e) => {
      const target = e.target as HTMLElement | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (link && link.href) {
        triggerPreload(link.href, link)
      }
    },
    { passive: true }
  )

  // 3. 键盘 Tab 键焦点预加载
  document.addEventListener(
    'focusin',
    (e) => {
      const target = e.target as HTMLElement | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (link && link.href) {
        triggerPreload(link.href, link)
      }
    },
    { passive: true }
  )

  // 4. 空闲调度预加载核心页签 (首页、归档、友链、关于)
  function preloadCoreLinks() {
    const coreLinks = document.querySelectorAll<HTMLAnchorElement>(
      '#fuwari-navbar nav a[href], #mobile-menu-panel nav a[href]'
    )
    coreLinks.forEach((link) => {
      if (link.href) {
        triggerPreload(link.href, link)
      }
    })
  }

  const runIdle = (cb: () => void) => {
    if (typeof (window as any).requestIdleCallback === 'function') {
      ;(window as any).requestIdleCallback(cb, { timeout: 2000 })
    } else {
      setTimeout(cb, 400)
    }
  }

  // 页面就绪后延迟 400ms 自动在后台静默预取核心页签
  runIdle(preloadCoreLinks)

  // 每次切页完成之后，亦在空闲时检查核心页签
  swup.hooks.on('page:view', () => {
    runIdle(preloadCoreLinks)
  })
}

/**
 * 初始化 Swup 平滑无缝无刷新路由引擎
 */
function initSwup() {
  // 防止重复初始化
  if ((window as any).__fuwari_swup_initialized) return
  ;(window as any).__fuwari_swup_initialized = true

  // 初始化图片点击放大功能（全局委托）
  initImageLightbox()

  const swup = new Swup({
    containers: ['#swup-container'],
    animationSelector: '[class*="transition-swup-"]',
    cache: true,
    plugins: [
      new SwupPreloadPlugin({
        throttle: 5,
        preloadInitialPage: false,
        preloadHoveredLinks: false, // 禁用插件自带的有缺陷事件判定，由下方自研 Instant Preload 引擎全量接管
        preloadVisibleLinks: false,
      }),
    ],
  })

  // 启动极速即时预加载引擎 (支持子元素 hover 穿透、touchstart、focusin 与空闲时核心页签静默预取)
  initInstantPreload(swup)

  // 初始页面自注水：直接将初次加载的完整 HTML 存入 Swup 缓存，避免切回当前页时触发冗余网络请求
  try {
    const currentUrl = swup.resolveUrl(window.location.pathname + window.location.search)
    if (!swup.cache.has(currentUrl)) {
      swup.cache.set(currentUrl, {
        url: currentUrl,
        html: document.documentElement.outerHTML,
      })
    }
  } catch (err) {
    console.warn('Swup initial cache hydration warning:', err)
  }

  // 1. 链接点击或导航开始时：立即触发背景高度与导航栏高亮动画
  swup.hooks.on('visit:start', (visit) => {
    updateBannerAndLayout(visit.to.url)
    updateNavbarActive(visit.to.url)
    closeMobileMenu()
    closeMobileToc()
  })

  // 2. 页面内容替换完成时：滚动复位、执行脚本与重新高亮
  swup.hooks.on('content:replace', () => {
    // 滚动至顶部或目标锚点
    if (window.location.hash) {
      try {
        const target = document.querySelector(decodeURIComponent(window.location.hash))
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' })
        }
      } catch {}
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // 重置并更新阅读进度条
    updateReadingProgressBar()

    // 重新触发代码高亮
    if ((window as any).hljs) {
      try {
        ;(window as any).hljs.highlightAll()
      } catch {}
    }

    // 重新运行新内容内部的脚本（TOC Spy、统计等）
    const container = document.getElementById('swup-container')
    if (container) {
      sanitizeEmbeddedMedia(container)
      reexecuteScripts(container)
      fetchAndRenderPostViews(container)
    }
  })

  ;(window as any).swup = swup
}

/**
 * 客户端主动拦截与规范化嵌入式媒体（iframe、video），彻底禁止未经用户手势的自动播放行为
 */
function sanitizeEmbeddedMedia(container: Document | HTMLElement = document) {
  // 1. 规范化所有 iframe
  const iframes = container.querySelectorAll<HTMLIFrameElement>('iframe')
  iframes.forEach((iframe) => {
    let src = iframe.getAttribute('src') || ''
    // 若为 B站外链播放器，且未显式指定 autoplay=1，则确保其携带 autoplay=0
    if (/player\.bilibili\.com/i.test(src) && !/autoplay=(?:1|true)/i.test(src)) {
      if (!/autoplay=/i.test(src)) {
        const sep = src.includes('?') ? '&' : '?'
        iframe.setAttribute('src', `${src}${sep}autoplay=0`)
      }
    }

    // 检查 Permissions Policy，强制施加 autoplay 'none' 约束
    const allow = iframe.getAttribute('allow') || ''
    const outer = iframe.outerHTML
    const hasAutoplayOff = /autoplay=(?:0|false)/i.test(outer)
    const hasAutoplayOn = /autoplay=(?:1|true)/i.test(outer)

    if (hasAutoplayOff || !hasAutoplayOn) {
      if (!allow.includes("autoplay 'none'")) {
        const cleanedAllow = allow
          .replace(/\bautoplay(?:\s+'[^']*')?/gi, '')
          .replace(/(?:^|;)\s*;\s*/g, ';')
          .replace(/^;\s*|\s*;$/g, '')
          .trim()
        const newAllow = `${cleanedAllow ? cleanedAllow + '; ' : ''}autoplay 'none'`
        iframe.setAttribute('allow', newAllow)
      }
    }
  })

  // 2. 规范化所有原生 video
  const videos = container.querySelectorAll<HTMLVideoElement>('video')
  videos.forEach((video) => {
    const rawAutoplay = video.getAttribute('autoplay')
    if (rawAutoplay === 'false' || rawAutoplay === '0' || rawAutoplay === 'off' || rawAutoplay === 'no') {
      video.removeAttribute('autoplay')
      video.autoplay = false
    }
  })
}

/**
 * 顶部阅读进度条更新计算 (Reading Progress Bar)
 */
function updateReadingProgressBar() {
  const bar = document.getElementById('reading-progress-bar')
  if (!bar) return

  const totalScroll = document.documentElement.scrollHeight - window.innerHeight
  if (totalScroll <= 0) {
    bar.style.transform = 'scaleX(0)'
    return
  }

  const currentScroll = window.scrollY || document.documentElement.scrollTop
  const progress = Math.min(1, Math.max(0, currentScroll / totalScroll))
  bar.style.transform = `scaleX(${progress})`
}

function initReadingProgressBar() {
  if ((window as any).__fuwari_progress_bar_initialized) return
  ;(window as any).__fuwari_progress_bar_initialized = true

  window.addEventListener('scroll', updateReadingProgressBar, { passive: true })
  window.addEventListener('resize', updateReadingProgressBar, { passive: true })
  updateReadingProgressBar()
}

/**
 * 代码块一键复制监听器 (事件委托，无缝兼容 Swup 路由切换)
 */
function initCodeBlockCopy() {
  if ((window as any).__fuwari_code_copy_initialized) return
  ;(window as any).__fuwari_code_copy_initialized = true

  document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.code-copy-btn')
    if (!btn) return

    const wrapper = btn.closest('.code-block-wrapper')
    const codeEl = wrapper?.querySelector('code')
    const textToCopy = codeEl?.textContent || ''

    if (!textToCopy) return

    try {
      await navigator.clipboard.writeText(textToCopy)
      const textSpan = btn.querySelector('.copy-btn-text')
      const originalText = textSpan ? textSpan.textContent : ''

      if (textSpan) {
        textSpan.textContent = '✓'
      }
      btn.classList.add('text-emerald-500', 'dark:text-emerald-400')

      setTimeout(() => {
        if (textSpan) {
          textSpan.textContent = originalText
        }
        btn.classList.remove('text-emerald-500', 'dark:text-emerald-400')
      }, 2000)
    } catch (err) {
      console.error('Failed to copy code block:', err)
    }
  })
}

/**
 * 文章版权卡片链接复制监听器
 */
function initLicenseLinkCopy() {
  if ((window as any).__fuwari_license_copy_initialized) return
  ;(window as any).__fuwari_license_copy_initialized = true

  document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#license-copy-btn')
    if (!btn) return

    const url = btn.getAttribute('data-url') || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      btn.classList.add('text-emerald-500', 'dark:text-emerald-400')
      setTimeout(() => {
        btn.classList.remove('text-emerald-500', 'dark:text-emerald-400')
      }, 2000)
    } catch (err) {
      console.error('Failed to copy article URL:', err)
    }
  })
}

/**
 * 移动端悬浮目录抽屉逻辑
 */
function closeMobileToc() {
  const drawer = document.getElementById('mobile-toc-drawer')
  const panel = document.getElementById('mobile-toc-panel')
  if (drawer && panel) {
    drawer.classList.add('opacity-0', 'pointer-events-none', 'invisible')
    drawer.classList.remove('visible')
    panel.classList.add('translate-y-full')
    drawer.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }
}

function openMobileToc() {
  const drawer = document.getElementById('mobile-toc-drawer')
  const panel = document.getElementById('mobile-toc-panel')
  if (drawer && panel) {
    drawer.classList.remove('opacity-0', 'pointer-events-none', 'invisible')
    drawer.classList.add('visible')
    panel.classList.remove('translate-y-full')
    drawer.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
  }
}

function initMobileToc() {
  if ((window as any).__fuwari_mobile_toc_initialized) return
  ;(window as any).__fuwari_mobile_toc_initialized = true

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement

    // 打开抽屉
    if (target.closest('#mobile-toc-open')) {
      openMobileToc()
      return
    }

    // 关闭抽屉
    if (target.closest('#mobile-toc-close')) {
      closeMobileToc()
      return
    }

    // 点击抽屉背景遮罩关闭
    const drawer = document.getElementById('mobile-toc-drawer')
    if (target === drawer) {
      closeMobileToc()
      return
    }

    // 点击目录链接跳转并自动收起抽屉
    const tocLink = target.closest<HTMLAnchorElement>('.mobile-toc-link')
    if (tocLink) {
      closeMobileToc()
      const href = tocLink.getAttribute('href')
      if (href && href.startsWith('#')) {
        const targetHeading = document.getElementById(href.slice(1))
        if (targetHeading) {
          e.preventDefault()
          targetHeading.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('mobile-toc-drawer')
      if (drawer && !drawer.classList.contains('pointer-events-none')) {
        closeMobileToc()
      }
    }
  })
}

/**
 * 客户端异步拉取并渲染文章卡片的浏览量（如果请求失败或无数据则保持隐藏不渲染）
 */
async function fetchAndRenderPostViews(container: Document | HTMLElement = document) {
  const badges = container.querySelectorAll<HTMLElement>('.post-views-badge[data-slug]')
  if (!badges || badges.length === 0) return

  try {
    const res = await fetch('/api/stats/all')
    if (!res.ok) return
    const json = await res.json().catch(() => null)
    if (!json || !json.success || !json.data) return

    const stats = json.data as Record<string, { views: number; uv: number }>
    badges.forEach((badge) => {
      const rawSlug = badge.getAttribute('data-slug')
      if (!rawSlug) return

      let stat = stats[rawSlug]
      if (!stat) {
        try {
          stat = stats[decodeURIComponent(rawSlug)]
        } catch {}
      }
      if (!stat) {
        try {
          stat = stats[encodeURIComponent(rawSlug)]
        } catch {}
      }

      const views = typeof stat?.views === 'number' ? stat.views : 0
      if (views > 0) {
        const numSpan = badge.querySelector('.post-views-num')
        if (numSpan) {
          numSpan.textContent = String(views)
        }
        badge.classList.remove('hidden')
      }
    })
  } catch {
    // 请求失败或离线时静默跳过，徽章保持 hidden，绝不渲染空数据或报错
  }
}

function initAllClientFeatures() {
  sanitizeEmbeddedMedia()
  initImageLightbox()
  initReadingProgressBar()
  initCodeBlockCopy()
  initLicenseLinkCopy()
  initMobileToc()
  fetchAndRenderPostViews()
  initSwup()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllClientFeatures)
} else {
  initAllClientFeatures()
}

