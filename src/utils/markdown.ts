import type { PostFrontmatter } from '../types/post.js'
import katex from 'katex'
import { i18n, I18nKey } from '../i18n/index.js'

/**
 * 解析 Markdown 文件的 frontmatter 和正文
 * 支持 YAML 格式的 frontmatter（--- 分隔）
 */
export function parseFrontmatter(raw: string): {
  frontmatter: PostFrontmatter
  content: string
} {
  const lines = raw.split('\n')

  if (lines[0].trim() !== '---') {
    throw new Error('Invalid frontmatter: missing opening ---')
  }

  let closingIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i
      break
    }
  }

  if (closingIndex === -1) {
    throw new Error('Invalid frontmatter: missing closing ---')
  }

  const yamlStr = lines.slice(1, closingIndex).join('\n')
  const content = lines.slice(closingIndex + 1).join('\n').trim()

  // 简易 YAML 解析（支持基本键值、多行块标量、列表和数组）
  const frontmatter = parseSimpleYaml(yamlStr) as PostFrontmatter

  // 规范化并清洗摘要
  if (typeof frontmatter.excerpt === 'string') {
    frontmatter.excerpt = frontmatter.excerpt.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
    if (/^[|>][+-]?$/.test(frontmatter.excerpt)) {
      frontmatter.excerpt = ''
    }
  }
  if (!frontmatter.excerpt && content) {
    frontmatter.excerpt = extractExcerpt(content)
  }

  return { frontmatter, content }
}

/**
 * 简易 YAML 解析器
 * 支持: 字符串、布尔值、数组（行内 [a, b] 和多行 - item 格式）、YAML 多行块标量（|、|-、>、>-）与缩进多行文本
 */
function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')

  let currentKey = ''
  let currentArray: string[] | null = null
  let blockMode: 'literal' | 'folded' | 'text' | null = null
  let blockLines: string[] = []
  let baseIndent = 0

  function flushBlock() {
    if (currentKey && blockMode) {
      const text = blockLines.join(blockMode === 'literal' ? '\n' : ' ')
      const cleaned = text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
      result[currentKey] = cleaned.replace(/^['"]|['"]$/g, '')
    }
    blockMode = null
    blockLines = []
    baseIndent = 0
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // 处于块文本模式时，处理缩进行
    if (blockMode) {
      if (trimmed === '') {
        blockLines.push('')
        continue
      }
      const indentMatch = rawLine.match(/^(\s+)/)
      const currentIndent = indentMatch ? indentMatch[1].length : 0

      // 如果仍有缩进，继续作为块内容收集
      if (currentIndent > 0) {
        if (baseIndent === 0) baseIndent = currentIndent
        const lineContent = rawLine.slice(Math.min(baseIndent, currentIndent)).trim()
        blockLines.push(lineContent)
        continue
      } else {
        // 遇到非缩进行，结束块模式
        flushBlock()
      }
    }

    // 跳过空行和注释
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    // 多行数组项: "  - item"
    const arrayItemMatch = rawLine.match(/^\s+-\s+(.+)/)
    if (arrayItemMatch && currentKey) {
      if (!currentArray) {
        currentArray = []
      }
      currentArray.push(arrayItemMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      result[currentKey] = currentArray
      continue
    }

    // 新的 key: value 对（要求 key 不带多余缩进）
    const kvMatch = rawLine.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/)
    if (kvMatch) {
      flushBlock()
      currentArray = null
      currentKey = kvMatch[1]
      let value = kvMatch[2].trim()

      // YAML 块标量语法: |, |-, |+, >, >-, >+
      if (/^[|>][+-]?$/.test(value)) {
        blockMode = value.startsWith('|') ? 'literal' : 'folded'
        blockLines = []
        baseIndent = 0
        continue
      }

      // 行内数组: [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        result[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
        continue
      }

      // 空值（可能是后续多行数组或多行缩进文本）
      if (value === '') {
        const nextLine = lines[i + 1]
        // 若下一行是普通缩进文本（不是以 - 开头），作为多行缩进文本收集
        if (nextLine && /^\s+\S/.test(nextLine) && !/^\s*-\s+/.test(nextLine)) {
          blockMode = 'text'
          blockLines = []
          baseIndent = 0
        } else {
          result[currentKey] = ''
        }
        continue
      }

      // 检查后续行是否是当前标量值的缩进续行 (Plain / Quoted Multiline Continuation)
      const nextLine = lines[i + 1]
      const hasContinuation = nextLine && /^\s+\S/.test(nextLine) && !/^\s*-\s+/.test(nextLine) && !/^\s*([a-zA-Z0-9_-]+)\s*:/.test(nextLine)

      if (hasContinuation) {
        blockMode = 'folded'
        blockLines = [value]
        baseIndent = 0
        continue
      }

      // 去掉两端引号与空格
      const unquoted = value.replace(/^['"]|['"]$/g, '').trim()

      // 布尔值
      if (unquoted === 'true' || unquoted === 'yes') { result[currentKey] = true; continue }
      if (unquoted === 'false' || unquoted === 'no') { result[currentKey] = false; continue }

      result[currentKey] = unquoted
    }
  }

  flushBlock()
  return result
}

/**
 * 估算阅读时间（分钟）
 * 中文按 300 字/分钟，英文按 200 词/分钟
 */
export function estimateReadingTime(content: string): number {
  // 计算中文字符数
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length
  // 计算英文单词数
  const englishWords = content
    .replace(/[\u4e00-\u9fff]/g, '')
    .split(/\s+/)
    .filter(Boolean).length

  const minutes = chineseChars / 300 + englishWords / 200
  return Math.max(1, Math.ceil(minutes))
}

/**
 * 提取纯文本摘要 (若文章未定义 excerpt，自动从正文提取作为 SEO 搜索结果与页面描述)
 */
export function extractExcerpt(content: string, maxLen: number = 160): string {
  if (!content) return ''
  const plain = content
    .replace(/```[\s\S]*?```/g, '') // 去除代码块
    .replace(/`([^`]+)`/g, '$1')     // 去除行内代码标记
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // 去除图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 提取超链接文本
    .replace(/<[^>]+>/g, '')         // 去除 HTML 标签
    .replace(/^#+\s+/gm, '')         // 去除标题符号
    .replace(/^>\s+/gm, '')          // 去除引用符号
    .replace(/[*_~]+/g, '')          // 去除强调符号
    .replace(/\s+/g, ' ')            // 压缩空白
    .trim()
  return plain.length <= maxLen ? plain : plain.slice(0, maxLen) + '...'
}

/**
 * 处理正文与 HTML 代码块中的嵌入式媒体标签（如 Bilibili、YouTube 等 iframe 及 video），
 * 严格防止视频在未经过用户主动点击的情况下意外自动播放：
 * 1. 检查 iframe 的 src 是否声明了 autoplay=0 / autoplay=false，或未明确声明自动播放权限。
 * 2. 针对 B站 (player.bilibili.com) 外链播放器自动补充 &autoplay=0 参数以对齐底层参数逻辑。
 * 3. 在 iframe 标签上显式注入/规范化 allow="autoplay 'none'; fullscreen"（Permissions Policy 级别硬拦截），
 *    彻底阻断第三方播放器内部脚本调用 video.play()，同时保证用户主动点击播放控件及全屏功能完全正常。
 * 4. 纠正原生 <video> 标签因手写 autoplay="false" 或 autoplay="0" 被 HTML5 规范视作 true 的解析缺陷。
 */
export function processEmbeddedMediaHtml(html: string): string {
  if (!html) return html

  // 1. 处理 iframe 嵌入标签
  let processed = html.replace(/<iframe\b([^>]*?)(\/?>)/gi, (_fullMatch: string, attrs: string, closeTag: string) => {
    let newAttrs = attrs

    // 针对 B站外链播放器：若未显式指定 autoplay=1，则确保其 src 携带 autoplay=0
    if (/player\.bilibili\.com/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/\bsrc=(["'])(.*?)\1/i, (srcMatch: string, quote: string, srcUrl: string) => {
        if (!/autoplay=(?:1|true)/i.test(srcUrl)) {
          if (!/autoplay=/i.test(srcUrl)) {
            const separator = srcUrl.includes('?') ? '&' : '?'
            return `src=${quote}${srcUrl}${separator}autoplay=0${quote}`
          } else {
            const normalizedUrl = srcUrl.replace(/autoplay=false/gi, 'autoplay=0')
            return `src=${quote}${normalizedUrl}${quote}`
          }
        }
        return srcMatch
      })
    }

    const hasAutoplayOff = /autoplay=(?:0|false)/i.test(newAttrs)
    const hasAutoplayOn = /autoplay=(?:1|true)/i.test(newAttrs)
    const allowMatch = newAttrs.match(/\ballow=(["'])(.*?)\1/i)

    if (hasAutoplayOff || !hasAutoplayOn) {
      if (allowMatch) {
        const quote = allowMatch[1]
        const currentAllow = allowMatch[2]
        const cleanedAllow = currentAllow
          .replace(/\bautoplay(?:\s+'[^']*')?/gi, '')
          .replace(/(?:^|;)\s*;\s*/g, ';')
          .replace(/^;\s*|\s*;$/g, '')
          .trim()
        const updatedAllow = `${cleanedAllow ? cleanedAllow + '; ' : ''}autoplay 'none'`
        newAttrs = newAttrs.replace(allowMatch[0], `allow=${quote}${updatedAllow}${quote}`)
      } else {
        newAttrs += ` allow="autoplay 'none'; fullscreen"`
      }
    }

    return `<iframe${newAttrs}${closeTag}`
  })

  // 2. 处理 原生 <video> 标签中因误写 autoplay="false" 或 autoplay="0" 导致的意外自动播放
  processed = processed.replace(/<video\b([^>]*?)(\/?>)/gi, (_match: string, attrs: string, closeTag: string) => {
    let newAttrs = attrs.replace(/\bautoplay\s*=\s*["'](?:false|0|off|no)["']/gi, '')
    return `<video${newAttrs}${closeTag}`
  })

  return processed
}

/**
 * 判断代码块语言标记是否声明为原生渲染 HTML 代码块
 * 完美支持:
 * - ```html:render
 * - ```html render
 * - ```html:raw / ```html raw
 */
export function isHtmlRenderCodeBlock(lang?: string): boolean {
  if (!lang) return false
  const clean = lang.trim().toLowerCase()
  return (
    clean === 'html:render' ||
    clean === 'html render' ||
    clean.startsWith('html:render') ||
    clean.startsWith('html render') ||
    clean === 'html:raw' ||
    clean === 'html raw' ||
    clean.startsWith('html:raw') ||
    clean.startsWith('html raw')
  )
}

/**
 * HTML 字符转义工具函数
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * LaTeX / KaTeX 数学公式渲染器 (SSR 零运行时延迟输出)
 * 保护代码块中的内容，支持独立块级公式 ($$...$$) 与行内公式 ($...$)
 */
export function renderKaTeXMath(markdown: string): string {
  if (!markdown || !markdown.includes('$')) return markdown

  // 1. 提取并保留所有代码块与行内代码，防止代码中的 $ 符号被误作为 LaTeX 公式解析
  const placeholders: string[] = []
  const placeholderPrefix = '@@KATEX_CODE_PLACEHOLDER_'

  let protectedMd = markdown.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `${placeholderPrefix}${idx}@@`
  })

  // 2. 匹配独立块级公式 $$...$$ (支持多行)
  protectedMd = protectedMd.replace(/\$\$([\s\S]+?)\$\$/g, (_match, mathExpr) => {
    try {
      const rendered = katex.renderToString(mathExpr.trim(), {
        displayMode: true,
        throwOnError: false,
      })
      return `\n\n<div class="fuwari-math-block my-5 overflow-x-auto text-center" data-latex="${escapeHtml(mathExpr.trim())}">${rendered}</div>\n\n`
    } catch {
      return _match
    }
  })

  // 3. 匹配行内公式 $...$（排除转义的 \$，以及空公式）
  protectedMd = protectedMd.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_match, mathExpr) => {
    const trimmed = mathExpr.trim()
    if (!trimmed) return _match
    try {
      const rendered = katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: false,
      })
      return `<span class="fuwari-math-inline" data-latex="${escapeHtml(trimmed)}">${rendered}</span>`
    } catch {
      return _match
    }
  })

  // 4. 还原保留的代码块
  return protectedMd.replace(new RegExp(`${placeholderPrefix}(\\d+)@@`, 'g'), (_m, idxStr) => {
    return placeholders[parseInt(idxStr, 10)] || ''
  })
}

/**
 * Admonitions (彩色告示/警告框) 渲染器
 * 1. 兼容 GitHub 官方规范引用块语法: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
 * 2. 兼容 Fuwari / Docusaurus 容器语法: :::note, :::tip, :::important, :::warning, :::caution
 */
export function renderAdmonitions(markdown: string, lang?: string): string {
  if (!markdown) return markdown

  // 1. 将 GitHub Alerts (> [!TYPE]) 规范化为容器语法 :::type
  let normalized = markdown.replace(
    /(?:^|\n)>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+([^\n]+))?\n((?:>[ \t]*.*(?:\n|$))+)/gi,
    (_full, type, alertTitle, bodyLines) => {
      const cleanBody = bodyLines
        .split('\n')
        .map((line: string) => line.replace(/^>[ \t]?/, ''))
        .join('\n')
        .trim()
      const titleAttr = alertTitle ? ` ${alertTitle.trim()}` : ''
      return `\n\n:::${type.toLowerCase()}${titleAttr}\n${cleanBody}\n:::\n\n`
    }
  )

  // 2. 解析 :::type 容器并生成结构化 HTML
  const admonitionRegex = /(?:^|\n):::([a-zA-Z]+)(?:\[(.*?)\]|\s+([^\n]*))?\r?\n([\s\S]*?)\r?\n:::\s*(?=\n|$)/g

  return normalized.replace(admonitionRegex, (_match, rawType, bracketTitle, spaceTitle, body) => {
    const type = rawType.toLowerCase()
    const customTitle = (bracketTitle || spaceTitle || '').trim()

    let defaultTitle = ''
    let borderClass = ''
    let bgClass = ''
    let titleColor = ''
    let iconSvg = ''

    switch (type) {
      case 'tip':
        defaultTitle = i18n(I18nKey.admonitionTip, lang)
        borderClass = 'border-emerald-500 dark:border-emerald-400'
        bgClass = 'bg-emerald-500/8 dark:bg-emerald-500/15'
        titleColor = 'text-emerald-600 dark:text-emerald-400'
        iconSvg = `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`
        break
      case 'important':
        defaultTitle = i18n(I18nKey.admonitionImportant, lang)
        borderClass = 'border-purple-500 dark:border-purple-400'
        bgClass = 'bg-purple-500/8 dark:bg-purple-500/15'
        titleColor = 'text-purple-600 dark:text-purple-400'
        iconSvg = `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`
        break
      case 'warning':
        defaultTitle = i18n(I18nKey.admonitionWarning, lang)
        borderClass = 'border-amber-500 dark:border-amber-400'
        bgClass = 'bg-amber-500/8 dark:bg-amber-500/15'
        titleColor = 'text-amber-600 dark:text-amber-400'
        iconSvg = `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        break
      case 'caution':
      case 'danger':
        defaultTitle = i18n(I18nKey.admonitionCaution, lang)
        borderClass = 'border-rose-500 dark:border-rose-400'
        bgClass = 'bg-rose-500/8 dark:bg-rose-500/15'
        titleColor = 'text-rose-600 dark:text-rose-400'
        iconSvg = `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        break
      case 'note':
      default:
        defaultTitle = i18n(I18nKey.admonitionNote, lang)
        borderClass = 'border-sky-500 dark:border-sky-400'
        bgClass = 'bg-sky-500/8 dark:bg-sky-500/15'
        titleColor = 'text-sky-600 dark:text-sky-400'
        iconSvg = `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
        break
    }

    const title = customTitle || defaultTitle

    return `\n\n<div class="admonition admonition-${type} my-6 rounded-2xl border-l-4 ${borderClass} ${bgClass} p-4 md:p-5 shadow-xs transition-all">
<div class="admonition-header flex items-center gap-2 mb-2 font-bold text-sm md:text-base ${titleColor}">
  <span class="admonition-icon flex shrink-0">${iconSvg}</span>
  <span class="admonition-title">${escapeHtml(title)}</span>
</div>
<div class="admonition-body text-sm md:text-[15px] leading-relaxed fuwari-text-75">

${body.trim()}

</div>
</div>\n\n`
  })
}

/**
 * 增强型代码块渲染器 (Expressive Code 风格)
 * 支持:
 * 1. 一键复制代码按钮 (带 Tooltip 与已复制状态反馈)
 * 2. 代码块文件名 / 标题标签 (如 ```ts:app.ts 或 ```ts title="app.ts")
 * 3. macOS 风格 3 色装饰圆点
 * 4. 语言徽标
 */
export function renderEnhancedCodeBlock(token: any, siteLang?: string): string {
  const rawCode = token?.text || ''
  const rawLang = token?.lang || ''

  // 1. 如果是 HTML 媒体渲染块 (如 ```html:render)，交由嵌入媒体处理器原生渲染
  if (isHtmlRenderCodeBlock(rawLang)) {
    return processEmbeddedMediaHtml(rawCode)
  }

  // 2. 解析文件名与语言
  let cleanLang = ''
  let filename = ''

  const titleMatch = rawLang.match(/(?:title|filename)=(?:["']([^"']+)["']|([^\s]+))/i)
  if (titleMatch) {
    filename = titleMatch[1] || titleMatch[2] || ''
    cleanLang = rawLang.replace(/(?:title|filename)=(?:["']([^"']+)["']|([^\s]+))/i, '').trim()
  } else if (rawLang.includes(':')) {
    const colonIdx = rawLang.indexOf(':')
    cleanLang = rawLang.slice(0, colonIdx).trim()
    filename = rawLang.slice(colonIdx + 1).trim()
  } else {
    cleanLang = rawLang.trim().split(/\s+/)[0] || ''
  }

  const copyText = i18n(I18nKey.copyCode, siteLang)
  const escapedCode = escapeHtml(rawCode)

  return `<div class="code-block-wrapper relative my-6 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-[oklch(0.97_0.01_var(--fuwari-hue))] dark:bg-[oklch(0.18_0.015_var(--fuwari-hue))] shadow-xs group">
  <div class="code-block-header flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/10 bg-black/3 dark:bg-white/5 text-xs font-mono">
    <div class="flex items-center gap-2 overflow-hidden">
      <div class="flex gap-1.5 items-center mr-1 shrink-0 opacity-75">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-400/80 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block"></span>
      </div>
      ${filename ? `<span class="code-filename font-semibold truncate text-black/80 dark:text-white/85" title="${escapeHtml(filename)}">${escapeHtml(filename)}</span>` : ''}
      ${cleanLang ? `<span class="code-lang uppercase text-[10px] tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-70 shrink-0">${escapeHtml(cleanLang)}</span>` : ''}
    </div>
    <button
      type="button"
      class="code-copy-btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans transition-all active:scale-95 cursor-pointer border-none bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-black/70 dark:text-white/80"
      aria-label="${copyText}"
      title="${copyText}"
    >
      <svg class="copy-icon-svg w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <span class="copy-btn-text text-xs pointer-events-none">${copyText}</span>
    </button>
  </div>
  <pre class="overflow-x-auto p-4 m-0! text-sm leading-relaxed"><code class="hljs language-${cleanLang || 'plaintext'}">${escapedCode}</code></pre>
</div>`
}

