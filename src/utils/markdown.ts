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
