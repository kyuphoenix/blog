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

  for (const line of yamlLines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue

    const arrayItemMatch = line.match(/^\s+-\s+(.+)/)
    if (arrayItemMatch && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItemMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      meta[currentKey] = currentArray
      continue
    }

    const kvMatch = line.match(/^(\w+)\s*:\s*(.*)/)
    if (kvMatch) {
      currentArray = null
      currentKey = kvMatch[1]
      let value = kvMatch[2].trim()

      if (value.startsWith('[') && value.endsWith(']')) {
        meta[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
        continue
      }
      if (value === '') {
        meta[currentKey] = ''
        continue
      }
      if (value === 'true') {
        meta[currentKey] = true
        continue
      }
      if (value === 'false') {
        meta[currentKey] = false
        continue
      }
      meta[currentKey] = value.replace(/^['"]|['"]$/g, '')
    }
  }

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

  return { meta, readingTime }
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

    manifest.push({
      title,
      slug,
      date: meta.date || new Date().toISOString().split('T')[0],
      updated: meta.updated || undefined,
      category: meta.category || '未分类',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      excerpt: meta.excerpt || '',
      cover: meta.cover || undefined,
      draft: meta.draft || false,
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
