export interface PageViewInput {
  slug: string
  url: string
  referrer?: string
  userAgent?: string
  ip?: string
  country?: string
  sessionId?: string
  clientTracked?: boolean
  language?: string
  screen?: string
}

export interface PostStat {
  slug: string
  views: number
  uv: number
}

export interface DatabaseClient {
  readonly type: 'umami'
  recordPageView(input: PageViewInput): Promise<{ views: number; uv: number }>
  getTopPosts(limit?: number): Promise<PostStat[]>
  getPostStats(slug: string): Promise<{ views: number; uv: number }>
  getAllPostStats(): Promise<Record<string, { views: number; uv: number }>>
}
