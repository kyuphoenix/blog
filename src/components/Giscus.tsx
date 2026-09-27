import { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { AppEnv } from '../types/env'

interface GiscusProps {
  env?: AppEnv['Bindings']
}

export const Giscus: FC<GiscusProps> = ({ env }) => {
  // 直接从 Cloudflare Worker 环境变量读取
  const repo = env?.GISCUS_REPO || ''
  const repoId = env?.GISCUS_REPO_ID || ''
  const category = env?.GISCUS_CATEGORY || 'Announcements'
  const categoryId = env?.GISCUS_CATEGORY_ID || ''

  const isConfigured = Boolean(repo && repoId && categoryId)

  // 确定 Giscus 主题：自动适配 Fuwari 设计风格，支持暗色模式动态切换
  const owner = env?.GITHUB_OWNER || 'kyuphoenix'
  const repoName = env?.GITHUB_REPO || 'blog'
  const branch = env?.GITHUB_BRANCH || 'main'
  const cdnBase = `https://cdn.jsdelivr.net/gh/${owner}/${repoName}@${branch}/public`
  const configuredLight = env?.GISCUS_THEME_LIGHT || ''
  const configuredDark = env?.GISCUS_THEME_DARK || ''
  const configuredBlogUrl = (env?.BLOG_URL || '').replace(/\/$/, '')
  const themeVersion = '20260927v5'

  return (
    <div
      class="fuwari-card-base px-6 md:px-8 py-5 md:py-6 fuwari-onload-animation"
      style="animation-delay: 250ms"
      id="comments"
    >
      {!isConfigured ? (
        <div class="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center">
          <div class="text-3xl mb-2">💬</div>
          <div class="font-bold fuwari-text-90 mb-1.5">
            Giscus 评论系统尚未配置
          </div>
          <p class="text-sm fuwari-text-50 max-w-md mx-auto mb-4 leading-relaxed">
            只需 1 分钟即可启用基于 GitHub Discussions 的免数据库评论系统。
          </p>
          <div class="text-xs text-left bg-black/5 dark:bg-white/5 p-4 rounded-lg max-w-lg mx-auto mb-4 font-mono leading-relaxed fuwari-text-75">
            1. 确保你的 GitHub 仓库为公开且已在 Settings 开启 Discussions<br />
            2. 安装{' '}
            <a
              href="https://github.com/apps/giscus"
              target="_blank"
              rel="noreferrer"
              class="text-(--fuwari-primary) underline"
            >
              Giscus GitHub App
            </a><br />
            3. 打开{' '}
            <a
              href="https://giscus.app/zh-CN"
              target="_blank"
              rel="noreferrer"
              class="text-(--fuwari-primary) underline"
            >
              giscus.app
            </a>{' '}
            输入仓库名获取 repoId 与 categoryId<br />
            4. 在 GitHub 仓库变量中配置 <code>GISCUS_REPO</code>、<code>GISCUS_REPO_ID</code> 与 <code>GISCUS_CATEGORY_ID</code>
          </div>
        </div>
      ) : (
        <>
          <div class="giscus min-h-[160px]" id="giscus-container"></div>
          {raw(`<script>
            (function() {
              var origin = window.location.origin;
              var isHttps = origin && origin.startsWith('https://');
              var configuredUrl = '${configuredBlogUrl}';
              var cdnBase = '${cdnBase}';
              var v = '${themeVersion}';

              // 优先使用当前站点的 HTTPS 域名（直接加载 Worker 自身路由，无 CDN 缓存延迟）
              var baseUrl = (configuredUrl && configuredUrl.startsWith('https://'))
                ? configuredUrl
                : (isHttps ? origin : cdnBase);

              var lightTheme = '${configuredLight}' || (baseUrl + '/css/giscus-fuwari-light.css?v=' + v);
              var darkTheme = '${configuredDark}' || (baseUrl + '/css/giscus-fuwari-dark.css?v=' + v);

              var isDark = document.documentElement.classList.contains('dark');
              var theme = isDark ? darkTheme : lightTheme;

              var script = document.createElement('script');
              script.src = 'https://giscus.app/client.js';
              script.setAttribute('data-repo', '${repo}');
              script.setAttribute('data-repo-id', '${repoId}');
              script.setAttribute('data-category', '${category}');
              script.setAttribute('data-category-id', '${categoryId}');
              script.setAttribute('data-mapping', 'pathname');
              script.setAttribute('data-strict', '0');
              script.setAttribute('data-reactions-enabled', '1');
              script.setAttribute('data-emit-metadata', '0');
              script.setAttribute('data-input-position', 'bottom');
              script.setAttribute('data-theme', theme);
              script.setAttribute('data-lang', 'zh-CN');
              script.setAttribute('data-loading', 'lazy');
              script.crossOrigin = 'anonymous';
              script.async = true;

              var container = document.getElementById('giscus-container');
              if (container) {
                container.appendChild(script);
              }

              // 监听明暗模式切换，向 Giscus iframe 发送更新主题消息
              window.addEventListener('theme-change', function(e) {
                var iframe = document.querySelector('iframe.giscus-frame');
                if (!iframe) return;
                var currentTheme = e.detail && e.detail.isDark ? darkTheme : lightTheme;
                iframe.contentWindow.postMessage(
                  { giscus: { setConfig: { theme: currentTheme } } },
                  'https://giscus.app'
                );
              });
            })();
          </script>`)}
        </>
      )}
    </div>
  )
}
