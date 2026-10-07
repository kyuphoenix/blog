import rawConfig from '../blog.config.json' with { type: 'json' }

export interface NavItem {
  label: string
  url: string
  external?: boolean // 是否为外部超链接（在新标签页打开，并附带外链小图标）
}

export interface SocialLink {
  platform: 'github' | 'email' | 'rss' | 'bilibili' | 'twitter' | string
  url: string
  label: string
}

export interface BlogConfig {
  title: string
  author: string
  description: string
  lang?: string
  repository?: string
  pagination?: {
    pageSize: number // 每页展示文章数，若设为 0 则不分页展示全部
  }
  pageSize?: number // 顶层配置别名兼容
  nav: NavItem[]
  social: SocialLink[]
  icons: {
    faviconSvg: string
    faviconIco: string
    favicon96: string
    appleTouchIcon: string
  }
  theme: {
    fuwari: {
      homeBg: string
      avatar: string
      primaryHue: number
    }
  }
  seo: {
    keywords: string[]
    googleSiteVerification?: string
    bingSiteVerification?: string
  }
}

export const blogConfig: BlogConfig = {
  title: rawConfig.title || 'Honoki',
  author: rawConfig.author || 'Blog Author',
  description:
    rawConfig.description ||
    '这是我的个人网站和博客。在这里，我主要分享与技术和生活相关的内容。欢迎阅读！',
  lang: (rawConfig as any).lang || 'zh_CN',
  repository: (rawConfig as any).repository || 'https://github.com/kyuphoenix/blog',
  pagination: {
    pageSize: Number((rawConfig as any).pagination?.pageSize ?? (rawConfig as any).pageSize ?? 10),
  },
  pageSize: Number((rawConfig as any).pagination?.pageSize ?? (rawConfig as any).pageSize ?? 10),
  nav: (rawConfig.nav as NavItem[]) || [
    { label: '首页', url: '/' },
    { label: '归档', url: '/archive' },
    { label: '友链', url: '/links' },
    { label: '关于', url: '/about' },
  ],
  social: (rawConfig.social as SocialLink[]) || [
    { platform: 'github', url: 'https://github.com', label: 'GitHub' },
    { platform: 'email', url: 'mailto:example@email.com', label: 'Email' },
    { platform: 'rss', url: '/rss.xml', label: 'RSS' },
  ],
  icons: {
    faviconSvg: rawConfig.icons?.faviconSvg || '/favicon.svg',
    faviconIco: rawConfig.icons?.faviconIco || '/favicon.ico',
    favicon96: rawConfig.icons?.favicon96 || '/favicon-96x96.png',
    appleTouchIcon: rawConfig.icons?.appleTouchIcon || '/apple-touch-icon.png',
  },
  theme: {
    fuwari: {
      homeBg: rawConfig.theme?.fuwari?.homeBg || '/images/home-bg.webp',
      avatar: rawConfig.theme?.fuwari?.avatar || '/images/avatar.webp',
      primaryHue: Number(rawConfig.theme?.fuwari?.primaryHue ?? 250),
    },
  },
  seo: {
    keywords: rawConfig.seo?.keywords || [
      '个人博客',
      '技术分享',
      '全栈开发',
      'Cloudflare Workers',
      'Hono',
      'TypeScript',
      '前端开发',
    ],
    googleSiteVerification: rawConfig.seo?.googleSiteVerification || '',
    bingSiteVerification: rawConfig.seo?.bingSiteVerification || '',
  },
}
