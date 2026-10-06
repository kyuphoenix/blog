import { I18nKey, Translation } from './i18nKey.js'
import { zh_CN } from './languages/zh_CN.js'
import { zh_TW } from './languages/zh_TW.js'
import { en } from './languages/en.js'
import { ja } from './languages/ja.js'

export { I18nKey, Translation }

export type SupportedLanguage = 'zh_CN' | 'zh_TW' | 'en' | 'ja'

export const DEFAULT_LANG: SupportedLanguage = 'zh_CN'

export const translations: Record<SupportedLanguage, Translation> = {
  zh_CN,
  zh_TW,
  en,
  ja,
}

/**
 * 标准化语言代码
 */
export function normalizeLang(lang?: string): SupportedLanguage {
  if (!lang) return DEFAULT_LANG
  const clean = lang.trim().toLowerCase().replace('-', '_')

  if (clean === 'zh_cn' || clean === 'zh_hans' || clean === 'zh') {
    return 'zh_CN'
  }
  if (clean === 'zh_tw' || clean === 'zh_hk' || clean === 'zh_hant') {
    return 'zh_TW'
  }
  if (clean.startsWith('en')) {
    return 'en'
  }
  if (clean.startsWith('ja')) {
    return 'ja'
  }

  return DEFAULT_LANG
}

/**
 * 翻译文本并支持变量替换
 * 例如: i18n(I18nKey.postsCountTotal, 'en', { count: 12 }) -> '(12 posts)'
 */
export function i18n(
  key: I18nKey,
  lang?: string,
  params?: Record<string, string | number | undefined | null>
): string {
  const norm = normalizeLang(lang)
  let text = translations[norm]?.[key] || translations[DEFAULT_LANG][key] || key

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''))
    }
  }

  return text
}

/**
 * 获取 HTML 标签 lang 属性 (符合 BCP 47 规范)
 */
export function getHtmlLang(lang?: string): string {
  const norm = normalizeLang(lang)
  switch (norm) {
    case 'zh_CN':
      return 'zh-CN'
    case 'zh_TW':
      return 'zh-TW'
    case 'en':
      return 'en'
    case 'ja':
      return 'ja'
    default:
      return 'zh-CN'
  }
}

/**
 * 获取 Giscus 评论系统支持的语言代码
 */
export function getGiscusLang(lang?: string): string {
  const norm = normalizeLang(lang)
  switch (norm) {
    case 'zh_CN':
      return 'zh-CN'
    case 'zh_TW':
      return 'zh-TW'
    case 'en':
      return 'en'
    case 'ja':
      return 'ja'
    default:
      return 'zh-CN'
  }
}

const MONTH_NAMES_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * 格式化完整发布日期
 */
export function formatDate(dateInput?: string | Date, lang?: string): string {
  if (!dateInput) return ''
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return String(dateInput)

  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()
  const padMonth = String(month + 1).padStart(2, '0')
  const padDay = String(day).padStart(2, '0')

  const norm = normalizeLang(lang)
  switch (norm) {
    case 'en':
      return `${MONTH_NAMES_EN[month]} ${padDay}, ${year}`
    case 'ja':
      return `${year}/${padMonth}/${padDay}`
    case 'zh_TW':
    case 'zh_CN':
    default:
      return `${year}-${padMonth}-${padDay}`
  }
}

/**
 * 格式化归档时间线月日
 */
export function formatMonthDay(dateInput?: string | Date, lang?: string): string {
  if (!dateInput) return ''
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return String(dateInput)

  const month = d.getUTCMonth()
  const day = d.getUTCDate()
  const padMonth = String(month + 1).padStart(2, '0')
  const padDay = String(day).padStart(2, '0')

  const norm = normalizeLang(lang)
  switch (norm) {
    case 'en':
      return `${MONTH_NAMES_EN[month]} ${padDay}`
    case 'ja':
      return `${padMonth}/${padDay}`
    case 'zh_TW':
    case 'zh_CN':
    default:
      return `${padMonth}-${padDay}`
  }
}

const STANDARD_NAV_MATCHERS: Record<string, { key: I18nKey; defaults: string[] }> = {
  '/': {
    key: I18nKey.home,
    defaults: ['首页', '首頁', 'Home', 'ホーム', 'home'],
  },
  '/archive': {
    key: I18nKey.archive,
    defaults: ['归档', '歸檔', 'Archive', 'アーカイブ', 'archive'],
  },
  '/links': {
    key: I18nKey.links,
    defaults: ['友链', '友鏈', 'Links', 'リンク', 'links'],
  },
  '/about': {
    key: I18nKey.about,
    defaults: ['关于', '關於', 'About', 'アバウト', 'about'],
  },
}

/**
 * 获取智能国际化的导航项文字
 * 如果导航项是默认基础页面之一，按站点当前语言自动翻译；如果是用户个性化自定义的标签，则保持不变。
 */
export function getNavLabel(item: { label: string; url: string }, lang?: string): string {
  const cleanUrl = item.url.replace(/\/+$/, '') || '/'
  const matcher = STANDARD_NAV_MATCHERS[cleanUrl]

  if (matcher) {
    const trimmed = item.label.trim()
    if (!trimmed || matcher.defaults.includes(trimmed)) {
      return i18n(matcher.key, lang)
    }
  }

  return item.label
}
