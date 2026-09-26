export interface PostFrontmatter {
  title: string
  slug?: string       // 可选，默认直接以 title 为访问路径
  date: string
  updated?: string
  category?: string
  tags?: string[]
  excerpt?: string
  cover?: string
  draft?: boolean
}

export interface PostMeta extends PostFrontmatter {
  path: string        // 仓库中的文件路径（如 posts/文章标题.md）
  readingTime: number // 预估阅读时间（分钟）
  tags: string[]      // 确保 tags 始终为数组
  category: string    // 确保 category 存在
  excerpt: string     // 确保摘要存在
}

export interface Post extends PostMeta {
  content: string     // Markdown 正文
}

export interface PostListResponse {
  posts: PostMeta[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type Manifest = PostMeta[]
