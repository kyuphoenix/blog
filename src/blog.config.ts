export interface SocialLink {
  platform: 'github' | 'email' | 'rss'
  url: string
  label: string
}

export interface GiscusConfig {
  enable: boolean
  repo: string           // GitHub 仓库名，例如: "username/repo"
  repoId: string         // 仓库 ID，在 giscus.app 生成，例如: "R_..."
  category: string       // Discussions 分类，例如: "Announcements"
  categoryId: string     // 分类 ID，在 giscus.app 生成，例如: "DIC_..."
  mapping?: 'pathname' | 'url' | 'title' | 'og:title'
  strict?: '0' | '1'
  reactionsEnabled?: '0' | '1'
  emitMetadata?: '0' | '1'
  inputPosition?: 'top' | 'bottom'
  theme?: string         // 浅色主题，默认 'light'
  darkTheme?: string     // 深色主题，默认 'dark'
  lang?: string          // 语言，默认 'zh-CN'
  loading?: 'lazy' | 'eager'
}

export const blogConfig = {
  title: 'Fuwari Blog',
  author: 'Blog Author',
  description:
    '这是我的个人网站和博客。在这里，我主要分享与技术和生活相关的内容。欢迎阅读！',
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
  // 评论系统配置 (Giscus - 基于 GitHub Discussions)
  comment: {
    giscus: {
      enable: true,
      repo: '',           // 填写你的公开 GitHub 仓库，如 'yourname/my-blog'
      repoId: '',         // 访问 https://giscus.app 输入仓库后自动获取
      category: 'Announcements',
      categoryId: '',     // 访问 https://giscus.app 选择分类后自动获取
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
      theme: 'light',
      darkTheme: 'dark',
      lang: 'zh-CN',
      loading: 'lazy',
    } as GiscusConfig,
  },
}
