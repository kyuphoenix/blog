// 跨平台环境类型声明（自带必要接口定义，彻底免去构建环境找不到 @cloudflare/workers-types 或 @types/node 的问题）
declare global {
  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement
    first<T = unknown>(colName?: string): Promise<T | null>
    all<T = unknown>(): Promise<{ results?: T[]; success: boolean; [key: string]: any }>
    run<T = unknown>(): Promise<{ success: boolean; meta: any; [key: string]: any }>
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement
    batch<T = unknown>(statements: any[]): Promise<any[]>
    exec(query: string): Promise<any>
  }

  interface KVNamespace {
    get(key: string, type?: any): Promise<any>
    put(key: string, value: any, options?: any): Promise<void>
    delete(key: string): Promise<void>
  }

  var process: {
    env: Record<string, string | undefined>
  }
}

export type Bindings = {
  DB?: D1Database
  BLOG_CACHE?: KVNamespace
  // GitHub 仓库配置 (统一采用 GH_ 前缀，避开 GitHub 变量保留名限制)
  GH_OWNER?: string
  GH_REPO?: string
  GH_BRANCH?: string
  GH_TOKEN?: string
  PAT_TOKEN?: string
  // 兼顾历史/兼容写法
  GITHUB_OWNER?: string
  GITHUB_REPO?: string
  GITHUB_BRANCH?: string
  GITHUB_TOKEN?: string
  PURGE_SECRET?: string
  BLOG_URL?: string
  GISCUS_REPO?: string
  GISCUS_REPO_ID?: string
  GISCUS_CATEGORY?: string
  GISCUS_CATEGORY_ID?: string
  GISCUS_THEME_LIGHT?: string
  GISCUS_THEME_DARK?: string
  // 数据库选型与 Supabase 访问配置（可选：none 或未配置时关闭统计）
  DATABASE_TYPE?: 'd1' | 'supabase' | 'none' | 'auto'
  SUPABASE_URL?: string
  SUPABASE_KEY?: string
  SUPABASE_ANON_KEY?: string
  ENABLE_STATS?: string | boolean
  DISABLE_STATS?: string | boolean
}

export type Variables = {
  // 可扩展的请求级变量
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
