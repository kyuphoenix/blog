-- ==============================================================================
-- Fuwari Blog - Supabase PostgreSQL 初始化脚本
-- ==============================================================================
-- 本脚本用于在 Supabase 项目中创建文章阅读量与 UV 统计表及可选的原子自增函数。
-- 可以在 Supabase 控制台的 SQL Editor 中直接粘贴并执行。
-- ==============================================================================

-- 1. 访问明细表 (page_views)
CREATE TABLE IF NOT EXISTS public.page_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  ip_hash TEXT DEFAULT '',
  country TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 索引提升查询与去重性能
CREATE INDEX IF NOT EXISTS idx_page_views_slug ON public.page_views (slug);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views (slug, session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_ip ON public.page_views (slug, ip_hash);

-- 2. 文章汇总统计表 (post_stats)
CREATE TABLE IF NOT EXISTS public.post_stats (
  slug TEXT PRIMARY KEY,
  views BIGINT NOT NULL DEFAULT 0,
  uv BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 索引用于热门排行榜排序
CREATE INDEX IF NOT EXISTS idx_post_stats_views ON public.post_stats (views DESC, uv DESC);

-- 3. 配置行级安全策略 (RLS - Row Level Security)
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_stats ENABLE ROW LEVEL SECURITY;

-- 允许匿名/公开用户读取 post_stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'post_stats' AND policyname = 'Allow public read post_stats'
  ) THEN
    CREATE POLICY "Allow public read post_stats" ON public.post_stats FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'post_stats' AND policyname = 'Allow public insert post_stats'
  ) THEN
    CREATE POLICY "Allow public insert post_stats" ON public.post_stats FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'post_stats' AND policyname = 'Allow public update post_stats'
  ) THEN
    CREATE POLICY "Allow public update post_stats" ON public.post_stats FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'page_views' AND policyname = 'Allow public insert page_views'
  ) THEN
    CREATE POLICY "Allow public insert page_views" ON public.page_views FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'page_views' AND policyname = 'Allow public read page_views'
  ) THEN
    CREATE POLICY "Allow public read page_views" ON public.page_views FOR SELECT USING (true);
  END IF;
END $$;

-- 4. 可选：原子自增存储过程 (increment_page_view)
-- 主程序会自动检测并优先调用此 RPC 函数；若未创建该函数，程序会自动优雅降级为 REST 表操作。
CREATE OR REPLACE FUNCTION public.increment_page_view(
  p_slug TEXT,
  p_url TEXT DEFAULT '',
  p_referrer TEXT DEFAULT '',
  p_user_agent TEXT DEFAULT '',
  p_ip_hash TEXT DEFAULT '',
  p_country TEXT DEFAULT '',
  p_session_id TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_new_uv INTEGER := 1;
  v_views BIGINT;
  v_uv BIGINT;
BEGIN
  -- 检查 30 分钟内是否有同 session_id 或同 ip_hash 的访问记录（UV 去重）
  IF EXISTS (
    SELECT 1 FROM public.page_views
    WHERE slug = p_slug
      AND (
        (p_session_id <> '' AND session_id = p_session_id)
        OR (p_ip_hash <> '' AND ip_hash = p_ip_hash AND created_at > (now() - INTERVAL '30 minutes'))
      )
    LIMIT 1
  ) THEN
    v_is_new_uv := 0;
  END IF;

  -- 记录明细
  INSERT INTO public.page_views (slug, url, referrer, user_agent, ip_hash, country, session_id, created_at)
  VALUES (p_slug, p_url, p_referrer, p_user_agent, p_ip_hash, p_country, p_session_id, now());

  -- 原子更新或插入 post_stats 汇总
  INSERT INTO public.post_stats (slug, views, uv, updated_at)
  VALUES (p_slug, 1, v_is_new_uv, now())
  ON CONFLICT (slug) DO UPDATE
  SET views = public.post_stats.views + 1,
      uv = public.post_stats.uv + v_is_new_uv,
      updated_at = now()
  RETURNING views, uv INTO v_views, v_uv;

  RETURN json_build_object('views', v_views, 'uv', v_uv);
END;
$$;

-- 5. 权限配置 (确保 anon / Publishable key / authenticated / service_role 具备读写与 RPC 执行权限)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.page_views TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.post_stats TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_page_view TO anon, authenticated, service_role;

