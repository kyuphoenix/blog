import Swup from 'swup'

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
    overlay.classList.add('opacity-0', 'pointer-events-none')
    panel.classList.add('-translate-y-4')
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
      <button class="fuwari-lightbox__close" aria-label="关闭">&times;</button>
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
 * 初始化 Swup 平滑无缝无刷新路由引擎
 */
function initSwup() {
  // 防止重复初始化
  if ((window as any).__fuwari_swup_initialized) return
  (window as any).__fuwari_swup_initialized = true

  // 初始化图片点击放大功能（全局委托）
  initImageLightbox()

  const swup = new Swup({
    containers: ['#swup-container'],
    animationSelector: '[class*="transition-swup-"]',
    cache: true,
  })

  // 1. 链接点击或导航开始时：立即触发背景高度与导航栏高亮动画
  swup.hooks.on('visit:start', (visit) => {
    updateBannerAndLayout(visit.to.url)
    updateNavbarActive(visit.to.url)
    closeMobileMenu()
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    sanitizeEmbeddedMedia()
    initImageLightbox()
    initSwup()
  })
} else {
  sanitizeEmbeddedMedia()
  initImageLightbox()
  initSwup()
}
