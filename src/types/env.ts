export type Bindings = {
  DB?: D1Database
  BLOG_CACHE: KVNamespace
  GITHUB_OWNER: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  GITHUB_TOKEN?: string
  PURGE_SECRET?: string
  BLOG_URL?: string
  GISCUS_REPO?: string
  GISCUS_REPO_ID?: string
  GISCUS_CATEGORY?: string
  GISCUS_CATEGORY_ID?: string
  GISCUS_THEME_LIGHT?: string
  GISCUS_THEME_DARK?: string
  GOOGLE_SITE_VERIFICATION?: string
  BING_SITE_VERIFICATION?: string
  BAIDU_SITE_VERIFICATION?: string
  YANDEX_VERIFICATION?: string
  INDEXNOW_KEY?: string
  BAIDU_PUSH_TOKEN?: string
}

export type Variables = {
  // 可扩展的请求级变量
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
