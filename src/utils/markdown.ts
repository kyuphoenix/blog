import { PostFrontmatter } from '../types/post'

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

  // 简易 YAML 解析（支持基本的 key: value 和数组）
  const frontmatter = parseSimpleYaml(yamlStr) as PostFrontmatter

  return { frontmatter, content }
}

/**
 * 简易 YAML 解析器
 * 支持: 字符串、布尔值、数组（行内 [a, b] 和多行 - item 格式）
 */
function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')

  let currentKey = ''
  let currentArray: string[] | null = null

  for (const line of lines) {
    // 跳过空行和注释
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue
    }

    // 多行数组项: "  - item"
    const arrayItemMatch = line.match(/^\s+-\s+(.+)/)
    if (arrayItemMatch && currentKey) {
      if (!currentArray) {
        currentArray = []
      }
      currentArray.push(arrayItemMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      result[currentKey] = currentArray
      continue
    }

    // 新的 key: value 对
    const kvMatch = line.match(/^(\w+)\s*:\s*(.*)/)
    if (kvMatch) {
      // 保存之前的数组
      currentArray = null

      currentKey = kvMatch[1]
      let value = kvMatch[2].trim()

      // 行内数组: [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        result[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
        continue
      }

      // 空值（可能是多行数组的开始）
      if (value === '') {
        result[currentKey] = ''
        continue
      }

      // 布尔值
      if (value === 'true') { result[currentKey] = true; continue }
      if (value === 'false') { result[currentKey] = false; continue }

      // 去掉引号
      value = value.replace(/^['"]|['"]$/g, '')
      result[currentKey] = value
    }
  }

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
