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
