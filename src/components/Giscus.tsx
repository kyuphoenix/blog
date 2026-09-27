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

          {/* GitHub 风格常用格式快捷工具条 */}
          <div class="mt-4 pt-3.5 border-t border-black/5 dark:border-white/10 flex flex-col gap-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5 text-xs">
                <span class="text-xs font-semibold fuwari-text-50 flex items-center gap-1.5 mr-1.5">
                  <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z"/>
                  </svg>
                  格式助手:
                </span>

                {/* Heading */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-bold transition cursor-pointer"
                  data-template="### 标题\n"
                  data-name="标题"
                  title="标题 (### 标题)"
                >
                  H
                </button>

                {/* Bold */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-bold transition cursor-pointer"
                  data-template="**粗体文本**"
                  data-name="粗体"
                  title="粗体 (**文本**)"
                >
                  B
                </button>

                {/* Italic */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 italic font-serif transition cursor-pointer"
                  data-template="*斜体文本*"
                  data-name="斜体"
                  title="斜体 (*文本*)"
                >
                  I
                </button>

                {/* Quote */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-semibold transition cursor-pointer"
                  data-template="> 引用内容\n"
                  data-name="引用"
                  title="引用 (> 内容)"
                >
                  ”
                </button>

                {/* Code */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer"
                  data-template="`行内代码`"
                  data-name="行内代码"
                  title="行内代码 (`代码`)"
                >
                  &lt;&gt;
                </button>

                {/* Code Block */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer"
                  data-template="```\n// 代码块\n```\n"
                  data-name="代码块"
                  title="多行代码块 (```代码块```)"
                >
                  &#123; &#125;
                </button>

                {/* Link */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer flex items-center"
                  data-template="[链接描述](https://example.com)"
                  data-name="链接"
                  title="超链接 ([文字](URL))"
                >
                  🔗
                </button>

                {/* Bullet List */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer"
                  data-template="- 列表项 1\n- 列表项 2\n"
                  data-name="无序列表"
                  title="无序列表 (- 列表项)"
                >
                  • ≡
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer font-mono text-[11px]"
                  data-template="1. 第一项\n2. 第二项\n"
                  data-name="有序列表"
                  title="有序列表 (1. 列表项)"
                >
                  1. ≡
                </button>

                {/* Task List */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer"
                  data-template="- [ ] 待办事项\n- [x] 已完成事项\n"
                  data-name="任务清单"
                  title="任务列表 (- [ ] 待办)"
                >
                  ☑
                </button>

                {/* Table */}
                <button
                  type="button"
                  class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer font-mono"
                  data-template="| 列 1 | 列 2 |\n| ---- | ---- |\n| 内容 | 内容 |\n"
                  data-name="表格"
                  title="Markdown 表格"
                >
                  ⊞
                </button>
              </div>

              {/* Cheatsheet Toggle */}
              <button
                type="button"
                id="toggle-markdown-cheatsheet"
                class="px-2.5 py-1 rounded-md text-xs font-medium text-(--fuwari-primary) bg-(--fuwari-primary)/10 hover:bg-(--fuwari-primary)/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>💡 语法速查</span>
                <span id="cheatsheet-chevron" class="transition-transform duration-200 text-[10px]">▼</span>
              </button>
            </div>

            {/* Collapsible Cheatsheet Panel */}
            <div id="markdown-cheatsheet-panel" class="hidden mt-2 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>粗体 / 斜体 / 删除线</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="**粗体** *斜体* ~~删除线~~" data-name="文字强调">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">**粗体** *斜体* ~~删除线~~</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>标题级别</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="## 二级标题\n### 三级标题\n" data-name="标题">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">## 标题 &nbsp; ### 子标题</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>代码与代码块</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="```ts\nconsole.log('Hello');\n```\n" data-name="代码块">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">`行内` 或 ```语言 ... ```</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>链接与图片</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="[链接文字](https://...)\n![图片说明](https://...)" data-name="链接与图片">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">[描述](url) / ![说明](img)</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>列表与清单</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="- [ ] 未完成事项\n- [x] 已完成事项\n" data-name="清单">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">- 列表 &nbsp; - [ ] 待办清单</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>折叠详情块</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-template="<details>\n<summary>点击展开详情</summary>\n\n折叠内容...\n</details>\n" data-name="折叠详情">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">&lt;details&gt;&lt;summary&gt;...</code>
                </div>
              </div>
            </div>
          </div>

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

              // 格式按钮点击一键复制模板并弹出轻量 Toast 提示
              function showToast(msg) {
                var existing = document.getElementById('fuwari-format-toast');
                if (existing) existing.remove();

                var toast = document.createElement('div');
                toast.id = 'fuwari-format-toast';
                toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-black/85 dark:bg-white/90 text-white dark:text-black text-xs font-medium shadow-2xl z-50 flex items-center gap-2 backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 translate-y-2';
                toast.textContent = msg;
                document.body.appendChild(toast);

                requestAnimationFrame(function() {
                  toast.classList.remove('opacity-0', 'translate-y-2');
                });

                setTimeout(function() {
                  toast.classList.add('opacity-0', 'translate-y-2');
                  setTimeout(function() { toast.remove(); }, 300);
                }, 2200);
              }

              document.querySelectorAll('.markdown-format-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                  e.preventDefault();
                  var template = this.getAttribute('data-template');
                  var name = this.getAttribute('data-name') || '格式';
                  if (!template) return;

                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(template).then(function() {
                      showToast('✅ 已复制「' + name + '」模板，可直接在输入框内 Ctrl+V 粘贴！');
                    }).catch(function() {
                      showToast('✅ 模板：' + template);
                    });
                  } else {
                    var ta = document.createElement('textarea');
                    ta.value = template;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showToast('✅ 已复制「' + name + '」模板，可直接在输入框内 Ctrl+V 粘贴！');
                  }
                });
              });

              // 折叠/展开语法速查面板
              var toggleBtn = document.getElementById('toggle-markdown-cheatsheet');
              var panel = document.getElementById('markdown-cheatsheet-panel');
              var chevron = document.getElementById('cheatsheet-chevron');
              if (toggleBtn && panel) {
                toggleBtn.addEventListener('click', function() {
                  var isHidden = panel.classList.toggle('hidden');
                  if (chevron) {
                    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
                  }
                });
              }
            })();
          </script>`)}
        </>
      )}
    </div>
  )
}
