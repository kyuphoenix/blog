export interface NavItem {
  label: string
  url: string
  external?: boolean // 是否为外部超链接（在新标签页打开，并附带外链小图标）
}

export interface SocialLink {
  platform: 'github' | 'email' | 'rss'
  url: string
  label: string
}

export const blogConfig = {
  title: 'Fuwari Blog',
  author: 'Blog Author',
  description:
    '这是我的个人网站和博客。在这里，我主要分享与技术和生活相关的内容。欢迎阅读！',
  // 顶部导航栏栏位配置（支持站内路径如 '/about' 或外部链接如 'https://github.com/...'）
  nav: [
    { label: '首页', url: '/' },
    { label: '归档', url: '/archive' },
    { label: '友链', url: '/links' },
    { label: '关于', url: '/about' },
  ] as NavItem[],
  social: [
    { platform: 'github', url: 'https://github.com', label: 'GitHub' },
    { platform: 'email', url: 'mailto:example@email.com', label: 'Email' },
    { platform: 'rss', url: '/rss.xml', label: 'RSS' },
  ] as SocialLink[],
  icons: {
    faviconSvg: '/favicon.svg',
    faviconIco: '/favicon.ico',
    favicon96: '/favicon-96x96.png',
    appleTouchIcon: '/apple-touch-icon.png',
  },
  theme: {
    fuwari: {
      homeBg: '/images/home-bg.webp',
      avatar: '/images/avatar.png',
      primaryHue: 250,
    },
  },
  // 搜索引擎收录与站长验证配置
  seo: {
    // 网站主关键词
    keywords: [
      '个人博客',
      '技术分享',
      '全栈开发',
      'Cloudflare Workers',
      'Hono',
      'TypeScript',
      '前端开发',
    ],
    // 站长平台所有权验证（可选，也可通过环境变量覆盖）
    googleSiteVerification: '', // Google Search Console 验证码
    bingSiteVerification: '',   // Bing Webmaster Tools (msvalidate.01)
    baiduSiteVerification: '',  // 百度搜索资源平台验证码
    yandexVerification: '',     // Yandex 验证码
    // IndexNow 密钥（用于 Bing / Yandex 秒级推送收录）
    indexnowKey: '',
  },
}
