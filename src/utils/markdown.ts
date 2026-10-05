import type { PostFrontmatter } from '../types/post.js'

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
