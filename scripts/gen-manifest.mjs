/**
 * 扫描 posts/ 目录，解析每篇文章的 frontmatter，
 * 生成 posts/manifest.json 清单文件。
 *
 * 用法: node scripts/gen-manifest.mjs
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'

const POSTS_DIR = join(process.cwd(), 'posts')
const MANIFEST_PATH = join(POSTS_DIR, 'manifest.json')

/**
 * 简易 frontmatter 解析
 */
function parseFrontmatter(raw) {
  const lines = raw.split('\n')
  if (lines[0].trim() !== '---') return null

  let closingIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i
      break
    }
  }
  if (closingIndex === -1) return null

  const yamlLines = lines.slice(1, closingIndex)
  const content = lines.slice(closingIndex + 1).join('\n').trim()
  const meta = {}
  let currentKey = ''
  let currentArray = null
  let blockMode = null // 'literal' (|) | 'folded' (>) | 'text'
  let blockLines = []
  let baseIndent = 0

  function flushBlock() {
    if (currentKey && blockMode) {
      const text = blockLines.join(blockMode === 'literal' ? '\n' : ' ')
      meta[currentKey] = text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
    }
    blockMode = null
    blockLines = []
    baseIndent = 0
  }

  for (let i = 0; i < yamlLines.length; i++) {
    const rawLine = yamlLines[i]
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

    if (trimmed === '' || trimmed.startsWith('#')) continue

    // 多行数组项: "  - item"
    const arrayItemMatch = rawLine.match(/^\s+-\s+(.+)/)
    if (arrayItemMatch && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItemMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      meta[currentKey] = currentArray
      continue
    }

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

      if (value.startsWith('[') && value.endsWith(']')) {
        meta[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
        continue
      }
      if (value === '') {
        const nextLine = yamlLines[i + 1]
        // 若下一行是纯文本缩进（非 - 开头的列表项），作为缩进多行文本收集
        if (nextLine && /^\s+\S/.test(nextLine) && !/^\s*-\s+/.test(nextLine)) {
          blockMode = 'text'
          blockLines = []
          baseIndent = 0
        } else {
          meta[currentKey] = ''
        }
        continue
      }
      const unquoted = value.replace(/^['"]|['"]$/g, '').trim()
      if (unquoted === 'true' || unquoted === 'yes') {
        meta[currentKey] = true
        continue
      }
      if (unquoted === 'false' || unquoted === 'no') {
        meta[currentKey] = false
        continue
      }
      meta[currentKey] = unquoted
    }
  }

  flushBlock()

  // 阅读时间估算
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = content
    .replace(/[\u4e00-\u9fff]/g, '')
    .split(/\s+/)
    .filter(Boolean).length
  const readingTime = Math.max(
    1,
    Math.ceil(chineseChars / 300 + englishWords / 200)
  )

  // 规范化并清洗 Frontmatter 摘要 (若 Frontmatter 未填写 excerpt，自动提取正文纯文本前 160 字作为 SEO 搜索结果摘要)
  let rawExcerpt = meta.excerpt || ''
  if (typeof rawExcerpt === 'string') {
    rawExcerpt = rawExcerpt.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
    // 防御性过滤：若为 YAML 块标记符号（如 |-、> 等），视为无效值
    if (/^[|>][+-]?$/.test(rawExcerpt)) {
      rawExcerpt = ''
    }
  } else {
    rawExcerpt = ''
  }

  let excerpt = rawExcerpt
  if (!excerpt && content) {
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
    excerpt = plain.length <= 160 ? plain : plain.slice(0, 160) + '...'
  }

  return { meta, readingTime, excerpt }
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'))
  const manifest = []

  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) {
      console.warn(`⚠️  跳过 ${file}：无法解析 frontmatter`)
      continue
    }

    const fileNameWithoutExt = basename(file, '.md')
    const { meta, readingTime } = parsed

    // 优先使用 frontmatter.title，未指定则使用文件名
    const title = meta.title || fileNameWithoutExt
    // slug 默认为 title，不再需要另外配置路径
    const slug = meta.slug || title

    const isDraft = typeof meta.draft === 'boolean'
      ? meta.draft
      : (meta.draft === 'true' || meta.draft === 'yes')

    const date = meta.date ? String(meta.date).trim().replace(/^['"]|['"]$/g, '') : new Date().toISOString().split('T')[0]
    const updated = meta.updated ? String(meta.updated).trim().replace(/^['"]|['"]$/g, '') : undefined

    manifest.push({
      title,
      slug,
      date,
      updated: updated || undefined,
      category: meta.category || '未分类',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      excerpt: meta.excerpt || parsed.excerpt || '',
      cover: meta.cover || meta.image || undefined,
      draft: isDraft,
      path: `posts/${file}`,
      readingTime,
    })
  }

  // 按日期降序排序
  manifest.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`✅ 已生成 manifest.json，共 ${manifest.length} 篇文章`)
}

main().catch(console.error)
