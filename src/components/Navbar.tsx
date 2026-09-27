import { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { blogConfig, NavItem } from '../blog.config'
import {
  HomeIcon,
  SearchIcon,
  MenuIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  PaletteIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
} from './Icons'

export const navOptions = blogConfig.nav

export const Navbar: FC<{ currentPath?: string; bannerHeightVh?: number }> = ({
  currentPath = '/',
  bannerHeightVh = 65,
}) => {
  return (
    <>
      {/* Mobile Menu Drawer */}
      <div
        id="mobile-menu-overlay"
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs opacity-0 pointer-events-none transition-opacity duration-300 md:hidden"
      >
        <div
          id="mobile-menu-panel"
          class="absolute right-4 top-20 w-64 fuwari-card-base p-4 shadow-xl -translate-y-4 transition-transform duration-300"
        >
          <div class="flex items-center justify-between pb-3 mb-2 border-b border-black/5 dark:border-white/10">
            <span class="font-bold text-sm fuwari-text-90">{blogConfig.title}</span>
            <button
              id="mobile-menu-close"
              type="button"
              class="fuwari-expand-animation rounded-lg w-8 h-8 flex items-center justify-center fuwari-text-75"
            >
              <XIcon size={16} />
            </button>
          </div>
          <nav class="flex flex-col gap-1">
            {blogConfig.nav.map((item) => {
              const isExternal =
                item.external ??
                (item.url.startsWith('http://') || item.url.startsWith('https://'))
              const isActive =
                !isExternal &&
                (currentPath === item.url ||
                  (item.url !== '/' && currentPath.startsWith(item.url)))
              return (
                <a
                  href={item.url}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer noopener' : undefined}
                  class={`fuwari-expand-animation rounded-lg h-11 font-bold px-4 flex items-center justify-between transition-colors no-underline ${
                    isActive
                      ? 'text-(--fuwari-primary)'
                      : 'fuwari-text-75 hover:text-(--fuwari-primary)'
                  }`}
                >
                  <span>{item.label}</span>
                  {isExternal && (
                    <ExternalLinkIcon size={14} class="opacity-60 shrink-0" />
                  )}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Top row: Navbar - sticky (exact flare-stack-blog structure) */}
      <div
        id="fuwari-navbar-wrapper"
        data-banner-vh={bannerHeightVh}
        class="z-50 sticky top-0 transition-all duration-300 ease-in-out translate-y-0 opacity-100"
      >
        <div
          id="fuwari-navbar"
          class="fuwari-onload-animation"
          style="animation-delay: 0ms"
        >
          <div class="fuwari-card-base overflow-visible! rounded-t-none! mx-auto flex items-center justify-between px-4 h-18 max-w-(--fuwari-page-width) shadow-xs">
            <a
              href="/"
              class="fuwari-expand-animation rounded-lg h-13 px-5 font-bold active:scale-95 flex items-center no-underline"
            >
              <HomeIcon
                size={26}
                strokeWidth={1.5}
                class="text-(--fuwari-primary) mr-2 shrink-0"
              />
              <span class="text-(--fuwari-primary) text-base">
                {blogConfig.title}
              </span>
            </a>

            <nav class="hidden md:flex items-center gap-1">
              {blogConfig.nav.map((item) => {
                const isExternal =
                  item.external ??
                  (item.url.startsWith('http://') || item.url.startsWith('https://'))
                const isActive =
                  !isExternal &&
                  (currentPath === item.url ||
                    (item.url !== '/' && currentPath.startsWith(item.url)))
                return (
                  <a
                    href={item.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer noopener' : undefined}
                    class={`fuwari-expand-animation rounded-lg h-11 font-bold px-4 lg:px-5 active:scale-95 flex items-center gap-1.5 no-underline ${
                      isActive
                        ? 'text-(--fuwari-primary)'
                        : 'fuwari-text-75 hover:text-(--fuwari-primary)'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isExternal && (
                      <ExternalLinkIcon size={13} class="opacity-50 shrink-0 -mt-0.5" />
                    )}
                  </a>
                )
              })}
            </nav>

            <div class="flex items-center gap-1">
              {/* Desktop Search Bar Button */}
              <button
                type="button"
                id="search-toggle-desktop"
                class="hidden lg:flex items-center h-11 mr-2 rounded-lg bg-black/4 hover:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 transition-all active:scale-95 group w-52 cursor-pointer border-none"
                aria-label="搜索"
              >
                <SearchIcon
                  size={18}
                  strokeWidth={1.25}
                  class="ml-3 transition-colors text-black/30 dark:text-white/30 group-hover:text-black/50 dark:group-hover:text-white/50"
                />
                <span class="ml-2 text-black/50 dark:text-white/50 text-sm bg-transparent outline-none truncate">
                  搜索文章...
                </span>
                <span class="ml-auto mr-3 text-xs text-black/30 dark:text-white/30 font-mono">
                  ⌘K
                </span>
              </button>

              {/* Mobile Search Icon Button */}
              <button
                type="button"
                id="search-toggle-mobile"
                class="lg:hidden fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) cursor-pointer border-none bg-transparent"
                aria-label="搜索"
              >
                <SearchIcon size={18} strokeWidth={1.25} />
              </button>

              {/* OKLCH Theme Hue Picker */}
              <div class="hue-picker-wrap">
                <button
                  type="button"
                  id="hue-toggle"
                  class="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) cursor-pointer border-none bg-transparent"
                  aria-label="主题色设置"
                  title="主题色设置 (OKLCH)"
                >
                  <PaletteIcon size={18} strokeWidth={1.5} />
                </button>
                <div class="hue-panel fuwari-card-base" id="hue-panel">
                  <div class="flex items-center justify-between mb-3 text-sm font-bold fuwari-text-90">
                    <span class="flex items-center gap-1.5">
                      <span class="w-1 h-4 rounded-md bg-(--fuwari-primary) inline-block" />
                      主题色相
                    </span>
                    <div class="flex items-center gap-1.5">
                      <span
                        id="hue-value"
                        class="text-xs font-mono px-2 py-0.5 rounded-md bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)"
                      >
                        {blogConfig.theme.fuwari.primaryHue}
                      </span>
                      <button
                        type="button"
                        id="hue-reset"
                        class="fuwari-btn-regular w-6 h-6 rounded-md text-xs cursor-pointer border-none"
                        title="重置默认色相"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={String(blogConfig.theme.fuwari.primaryHue)}
                    class="hue-slider"
                    id="hue-slider"
                    aria-label="Theme Hue Slider"
                  />
                </div>
              </div>

              {/* Dark / Light Theme Toggle */}
              <button
                type="button"
                id="theme-toggle"
                class="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) cursor-pointer border-none bg-transparent"
                aria-label="切换明暗主题"
              >
                <span id="theme-icon-sun" class="block dark:hidden">
                  <SunIcon size={18} strokeWidth={1.5} />
                </span>
                <span id="theme-icon-moon" class="hidden dark:block">
                  <MoonIcon size={18} strokeWidth={1.5} />
                </span>
              </button>

              {/* Mobile Hamburger Menu Button */}
              <button
                type="button"
                id="mobile-menu-open"
                class="fuwari-expand-animation rounded-lg w-11 h-11 flex items-center justify-center active:scale-90 md:hidden fuwari-text-75 hover:text-(--fuwari-primary) cursor-pointer border-none bg-transparent"
                aria-label="打开菜单"
              >
                <MenuIcon size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <div class="search-modal" id="search-modal" aria-hidden="true">
        <div class="search-modal__backdrop" id="search-backdrop"></div>
        <div class="fuwari-card-base relative w-[92%] max-w-xl p-0 overflow-hidden z-10 shadow-2xl">
          <div class="flex items-center px-4 py-3.5 border-b border-black/5 dark:border-white/10 gap-3">
            <SearchIcon size={18} class="text-(--fuwari-primary) shrink-0" />
            <input
              type="text"
              id="search-input"
              class="flex-1 bg-transparent border-none outline-none text-base fuwari-text-90"
              placeholder="输入关键词搜索文章标题或摘要..."
              autocomplete="off"
            />
            <button
              type="button"
              id="search-close"
              class="fuwari-btn-regular px-2 py-1 rounded-md text-xs border-none cursor-pointer"
            >
              ESC
            </button>
          </div>
          <div class="max-h-96 overflow-y-auto p-3" id="search-results">
            <div class="text-center py-8 text-sm fuwari-text-50">
              输入关键词开始搜索
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export const BackToTop: FC = () => {
  return (
    <div class="hidden lg:block absolute right-0 top-0 w-15 h-15 pointer-events-none">
      <div
        id="back-to-top-wrapper"
        class="fixed bottom-40 flex items-center rounded-2xl overflow-hidden transition-all duration-300 pointer-events-none opacity-0 translate-x-20 scale-90"
      >
        <button
          type="button"
          id="back-to-top-btn"
          aria-label="回到顶部"
          class="flex items-center justify-center w-15 h-15 fuwari-card-base hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) text-2xl font-bold transition-all active:scale-90 shadow-md cursor-pointer border-none"
        >
          <ArrowUpIcon size={26} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export const ThemeScript: FC = () => {
  return raw(`<script>
    (function() {
      // 1. Navbar scroll hide/show & BackToTop visibility (exact flare-stack-blog logic)
      var navbarWrapper = document.getElementById('fuwari-navbar-wrapper');
      var backToTopWrapper = document.getElementById('back-to-top-wrapper');
      var backToTopBtn = document.getElementById('back-to-top-btn');
      var bannerVh = navbarWrapper ? Number(navbarWrapper.getAttribute('data-banner-vh') || 65) : 65;

      function handleScroll() {
        var scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (navbarWrapper) {
          var bannerHeightPx = window.innerHeight * (bannerVh / 100);
          var threshold = bannerHeightPx - (4.5 * 16) - (3.5 * 16) - 16;
          if (scrollTop >= threshold) {
            navbarWrapper.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none');
            navbarWrapper.classList.remove('translate-y-0', 'opacity-100');
          } else {
            navbarWrapper.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
            navbarWrapper.classList.add('translate-y-0', 'opacity-100');
          }
        }
        if (backToTopWrapper) {
          var showBack = scrollTop > window.innerHeight * 0.35;
          if (showBack) {
            backToTopWrapper.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
            backToTopWrapper.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
          } else {
            backToTopWrapper.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
            backToTopWrapper.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
          }
        }
      }
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();

      if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // 2. Dark / Light Toggle
      var themeBtn = document.getElementById('theme-toggle');
      if (themeBtn) {
        themeBtn.addEventListener('click', function() {
          var isDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
          window.dispatchEvent(new CustomEvent('theme-change', { detail: { isDark: isDark } }));
        });
      }

      // 3. OKLCH Hue Slider
      var hueToggle = document.getElementById('hue-toggle');
      var huePanel = document.getElementById('hue-panel');
      var hueSlider = document.getElementById('hue-slider');
      var hueValue = document.getElementById('hue-value');
      var hueReset = document.getElementById('hue-reset');
      var defaultHue = '${blogConfig.theme.fuwari.primaryHue}';
      var savedHue = localStorage.getItem('hue') || defaultHue;

      if (hueSlider && hueValue) {
        hueSlider.value = savedHue;
        hueValue.textContent = savedHue;
        hueSlider.addEventListener('input', function(e) {
          var val = e.target.value;
          document.documentElement.style.setProperty('--fuwari-hue', val);
          hueValue.textContent = val;
          localStorage.setItem('hue', val);
        });
      }
      if (hueReset && hueSlider && hueValue) {
        hueReset.addEventListener('click', function() {
          document.documentElement.style.setProperty('--fuwari-hue', defaultHue);
          hueSlider.value = defaultHue;
          hueValue.textContent = defaultHue;
          localStorage.setItem('hue', defaultHue);
        });
      }
      if (hueToggle && huePanel) {
        hueToggle.addEventListener('click', function(e) {
          e.stopPropagation();
          huePanel.classList.toggle('is-open');
        });
        document.addEventListener('click', function(e) {
          if (!huePanel.contains(e.target) && !hueToggle.contains(e.target)) {
            huePanel.classList.remove('is-open');
          }
        });
      }

      // 4. Mobile Menu
      var menuOpen = document.getElementById('mobile-menu-open');
      var menuClose = document.getElementById('mobile-menu-close');
      var menuOverlay = document.getElementById('mobile-menu-overlay');
      var menuPanel = document.getElementById('mobile-menu-panel');
      function openMenu() {
        if (!menuOverlay || !menuPanel) return;
        menuOverlay.classList.remove('opacity-0', 'pointer-events-none');
        menuPanel.classList.remove('-translate-y-4');
      }
      function closeMenu() {
        if (!menuOverlay || !menuPanel) return;
        menuOverlay.classList.add('opacity-0', 'pointer-events-none');
        menuPanel.classList.add('-translate-y-4');
      }
      if (menuOpen) menuOpen.addEventListener('click', openMenu);
      if (menuClose) menuClose.addEventListener('click', closeMenu);
      if (menuOverlay) {
        menuOverlay.addEventListener('click', function(e) {
          if (e.target === menuOverlay) closeMenu();
        });
      }

      // 5. Search Modal
      var searchDesktop = document.getElementById('search-toggle-desktop');
      var searchMobile = document.getElementById('search-toggle-mobile');
      var searchModal = document.getElementById('search-modal');
      var searchBackdrop = document.getElementById('search-backdrop');
      var searchClose = document.getElementById('search-close');
      var searchInput = document.getElementById('search-input');
      var searchResults = document.getElementById('search-results');
      var debounceTimer = null;

      function openSearch() {
        if (!searchModal) return;
        searchModal.classList.add('is-open');
        setTimeout(function() { if (searchInput) searchInput.focus(); }, 50);
      }
      function closeSearch() {
        if (!searchModal) return;
        searchModal.classList.remove('is-open');
      }

      if (searchDesktop) searchDesktop.addEventListener('click', openSearch);
      if (searchMobile) searchMobile.addEventListener('click', openSearch);
      if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearch);
      if (searchClose) searchClose.addEventListener('click', closeSearch);
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          openSearch();
        } else if (e.key === 'Escape') {
          closeSearch();
          closeMenu();
        }
      });

      if (searchInput && searchResults) {
        searchInput.addEventListener('input', function(e) {
          var q = e.target.value.trim();
          clearTimeout(debounceTimer);
          if (!q) {
            searchResults.innerHTML = '<div class="text-center py-8 text-sm fuwari-text-50">输入关键词开始搜索</div>';
            return;
          }
          searchResults.innerHTML = '<div class="text-center py-8 text-sm fuwari-text-50">搜索中...</div>';
          debounceTimer = setTimeout(function() {
            fetch('/api/posts?keyword=' + encodeURIComponent(q))
              .then(function(r) { return r.json(); })
              .then(function(res) {
                var items = (res && res.data) || [];
                if (items.length === 0) {
                  searchResults.innerHTML = '<div class="text-center py-8 text-sm fuwari-text-50">未找到匹配的文章</div>';
                  return;
                }
                searchResults.innerHTML = items.map(function(p) {
                  return '<a href="/posts/' + encodeURIComponent(p.title) + '" class="block p-3 rounded-xl hover:bg-(--fuwari-btn-plain-bg-hover) transition-colors no-underline">' +
                    '<div class="font-bold text-(--fuwari-primary) mb-1">' + p.title + '</div>' +
                    '<div class="text-xs fuwari-text-50 mb-1">' + p.date + ' · ' + (p.category || '未分类') + '</div>' +
                    '<div class="text-sm fuwari-text-75 line-clamp-2">' + (p.excerpt || '') + '</div>' +
                  '</a>';
                }).join('');
              })
              .catch(function() {
                searchResults.innerHTML = '<div class="text-center py-8 text-sm fuwari-text-50">搜索出错，请稍后重试</div>';
              });
          }, 200);
        });
      }
    })();
  </script>`)
}
