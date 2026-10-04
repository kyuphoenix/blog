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
 * 初始化 Swup 平滑无缝无刷新路由引擎
 */
function initSwup() {
  // 防止重复初始化
  if ((window as any).__fuwari_swup_initialized) return
  (window as any).__fuwari_swup_initialized = true

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
      reexecuteScripts(container)
    }
  })

  ;(window as any).swup = swup
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwup)
} else {
  initSwup()
}
