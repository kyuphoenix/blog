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
      homeBg: '/images/home-bg.png',
      avatar: '/images/avatar.png',
      primaryHue: 250,
    },
  },
  // 搜索引擎收录与展示优化配置
  seo: {
    // 网站全局关键词（辅助搜索引擎识别站点主题）
    keywords: [
      '个人博客',
      '技术分享',
      '全栈开发',
      'Cloudflare Workers',
      'Hono',
      'TypeScript',
      '前端开发',
    ],
    // 站长平台 HTML 标签所有权验证码（可选；若在域名 DNS 中已添加 TXT 记录验证，此处可直接留空）
    googleSiteVerification: '', // Google Search Console: content 属性值
    bingSiteVerification: '',   // Bing Webmaster Tools: content 属性值 (msvalidate.01)
    baiduSiteVerification: '',  // 百度搜索资源平台: content 属性值
  },
}
