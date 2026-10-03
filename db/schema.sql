-- ==============================================================================
-- Cloudflare D1 访问量统计数据库表结构 (参考 Umami 隐私优先架构设计)
-- ==============================================================================

-- 1. 访问事件明细表：记录真实访客阅读日志（支持来源追踪、设备分析与会话去重）
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,                   -- 文章标题或 slug
  url TEXT NOT NULL,                    -- 访问的相对路径
  referrer TEXT,                        -- 来源地址（document.referrer）
  user_agent TEXT,                      -- 客户端 User-Agent
  ip_hash TEXT,                         -- 匿名化哈希（GDPR 隐私保护，基于当日 salt 与客户端特征生成）
  country TEXT,                         -- 国家/地区代码（由 Cloudflare 边缘节点提供）
  session_id TEXT,                      -- 客户端会话唯一标识（Umami 风格，用于会话防刷）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_slug ON page_views(slug);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(slug, session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_ip ON page_views(slug, ip_hash);

-- 2. 文章访问聚合统计表：用于首页 Top 3 与文章详情秒级实时查询（极大降低 D1 读取行数）
CREATE TABLE IF NOT EXISTS post_stats (
  slug TEXT PRIMARY KEY,                -- 文章标题或 slug
  views INTEGER NOT NULL DEFAULT 0,     -- 累计浏览量（Page Views）
  uv INTEGER NOT NULL DEFAULT 0,        -- 累计独立访客（Unique Visitors）
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_stats_views ON post_stats(views DESC);
