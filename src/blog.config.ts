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

export interface FriendLink {
  title: string
  url: string
  description: string
  avatar: string
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
  // 友情链接列表配置
  friends: [
    {
      title: 'Fuwari',
      url: 'https://github.com/saicaca/fuwari',
      description: '✨ A static blog theme powered by Astro & Tailwind CSS',
      avatar: 'https://github.com/saicaca.png',
    },
    {
      title: 'Hono',
      url: 'https://hono.dev',
      description: 'Ultrafast web framework for the Cloudflare Workers & Edge',
      avatar: 'https://github.com/honojs.png',
    },
    {
      title: 'Cloudflare',
      url: 'https://cloudflare.com',
      description: 'Connect, protect, and build everywhere',
      avatar: 'https://github.com/cloudflare.png',
    },
  ] as FriendLink[],
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
}
