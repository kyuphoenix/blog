export interface PageViewInput {
  slug: string
  url: string
  referrer?: string
  userAgent?: string
  ip?: string
  country?: string
  sessionId?: string
}

export interface PostStat {
  slug: string
  views: number
  uv: number
}

export interface DatabaseClient {
  readonly type: 'd1' | 'supabase'
  recordPageView(input: PageViewInput): Promise<{ views: number; uv: number }>
  getTopPosts(limit?: number): Promise<PostStat[]>
  getPostStats(slug: string): Promise<{ views: number; uv: number }>
  getAllPostStats(): Promise<Record<string, { views: number; uv: number }>>
}
