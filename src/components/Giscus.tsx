import { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import type { AppEnv } from '../types/env.js'

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
  const owner = env?.GH_OWNER || env?.GITHUB_OWNER || 'kyuphoenix'
  const repoName = env?.GH_REPO || env?.GITHUB_REPO || 'blog'
  const branch = env?.GH_BRANCH || env?.GITHUB_BRANCH || 'main'
  const cdnBase = `https://cdn.jsdelivr.net/gh/${owner}/${repoName}@${branch}/public`
  const configuredLight = env?.GISCUS_THEME_LIGHT || ''
  const configuredDark = env?.GISCUS_THEME_DARK || ''
  const configuredBlogUrl = (env?.BLOG_URL || '').replace(/\/$/, '')
  const themeVersion = '20260927v6'

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
                <span class="text-xs font-semibold fuwari-text-50 flex items-center gap-1 mr-1">
                  <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z"/>
                  </svg>
                  常用格式:
                </span>

                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-bold transition cursor-pointer" data-format="heading" data-name="标题" title="标题 (### 标题)">H</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-bold transition cursor-pointer" data-format="bold" data-name="粗体" title="粗体 (**文本**)">B</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 italic font-serif transition cursor-pointer" data-format="italic" data-name="斜体" title="斜体 (*文本*)">I</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-semibold transition cursor-pointer" data-format="quote" data-name="引用" title="引用 (> 内容)">”</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer" data-format="code" data-name="行内代码" title="行内代码 (`代码`)">&lt;&gt;</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer" data-format="codeblock" data-name="代码块" title="多行代码块 (```代码```)">&#123; &#125;</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer" data-format="link" data-name="链接" title="超链接 ([文字](URL))">🔗</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer" data-format="bullet" data-name="无序列表" title="无序列表 (- 列表项)">• ≡</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer" data-format="number" data-name="有序列表" title="有序列表 (1. 列表项)">1. ≡</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer" data-format="task" data-name="任务清单" title="任务清单 (- [ ] 事项)">☑</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer" data-format="table" data-name="表格" title="表格 (| 标题 |)">⊞</button>
                <button type="button" class="markdown-format-btn px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 font-mono text-[11px] transition cursor-pointer" data-format="details" data-name="折叠内容" title="折叠块 (<details>)">&lt;details&gt;</button>
              </div>

              {/* 语法速查展开按钮 */}
              <button
                type="button"
                id="toggle-markdown-cheatsheet"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 fuwari-text-75 transition cursor-pointer font-medium ml-auto"
              >
                <span>💡 语法速查</span>
                <svg id="cheatsheet-chevron" class="w-3 h-3 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            {/* 可折叠的语法速查面板 */}
            <div id="markdown-cheatsheet-panel" class="hidden mt-2 p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 text-xs fuwari-text-75">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>文本强调</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_emphasis" data-name="文本强调">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">**粗体** *斜体* ~~删除~~</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>各级标题</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_heading" data-name="标题">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">## 标题 &nbsp; ### 子标题</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>代码与代码块</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_code" data-name="代码块">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">`行内` 或 ```语言 ... ```</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>链接与图片</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_link" data-name="链接与图片">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">[描述](url) / ![说明](img)</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>列表与清单</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_list" data-name="清单">复制</button>
                  </div>
                  <code class="text-[11px] font-mono fuwari-text-50">- 列表 &nbsp; - [ ] 待办清单</code>
                </div>

                <div class="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 flex flex-col justify-between gap-1.5">
                  <div class="font-bold fuwari-text-75 flex justify-between items-center">
                    <span>折叠详情块</span>
                    <button type="button" class="markdown-format-btn text-[11px] text-(--fuwari-primary) hover:underline cursor-pointer" data-format="card_details" data-name="折叠详情">复制</button>
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

              // 格式模板定义（所有换行均显式构造真实换行字符，确保粘贴至输入框时产生真正的换行）
              var LF = String.fromCharCode(10);
              var B = String.fromCharCode(96);
              var BBB = B + B + B;

              var FORMAT_TEMPLATES = {
                heading: '### 标题' + LF + LF,
                bold: '**粗体文本**',
                italic: '*斜体文本*',
                quote: '> 引用内容' + LF + LF,
                code: B + '行内代码' + B,
                codeblock: BBB + 'language' + LF + '// 在此输入代码' + LF + BBB + LF,
                link: '[链接描述](https://example.com)',
                bullet: '- 列表项 1' + LF + '- 列表项 2' + LF,
                number: '1. 第一项' + LF + '2. 第二项' + LF,
                task: '- [ ] 待办事项 1' + LF + '- [x] 已完成事项' + LF,
                table: '| 列 1 | 列 2 |' + LF + '| :--- | :--- |' + LF + '| 内容 1 | 内容 2 |' + LF,
                details: '<details>' + LF + '<summary>点击展开详情</summary>' + LF + LF + '折叠内容...' + LF + '</details>' + LF,
                card_emphasis: '**粗体** *斜体* ~~删除线~~',
                card_heading: '## 二级标题' + LF + '### 三级标题' + LF,
                card_code: BBB + 'ts' + LF + 'console.log("Hello World");' + LF + BBB + LF,
                card_link: '[链接文字](https://example.com)' + LF + '![图片说明](https://example.com/pic.jpg)',
                card_list: '- 列表项' + LF + '- [ ] 未完成清单' + LF + '- [x] 已完成清单' + LF,
                card_details: '<details>' + LF + '<summary>点击展开详情</summary>' + LF + LF + '折叠内容...' + LF + '</details>' + LF
              };
              window.FUWARI_FORMAT_TEMPLATES = FORMAT_TEMPLATES;

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

              function copyFormattedText(rawText, name) {
                // 双重防御：将所有反斜杠+n（\\n）也强制替换为真实换行符
                var text = rawText.split(String.fromCharCode(92) + 'n').join(LF);

                function onDone() {
                  showToast('✅ 已复制「' + name + '」格式，可在输入框内 Ctrl+V 粘贴！');
                }

                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text).then(onDone).catch(function() {
                    fallbackCopy(text, onDone);
                  });
                } else {
                  fallbackCopy(text, onDone);
                }
              }

              function fallbackCopy(text, onDone) {
                try {
                  var ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  ta.style.left = '-9999px';
                  ta.style.top = '0';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  var ok = document.execCommand('copy');
                  document.body.removeChild(ta);
                  if (ok) onDone();
                  else showToast('❌ 复制失败，请手动输入');
                } catch (e) {
                  showToast('❌ 复制失败，请手动输入');
                }
              }

              document.querySelectorAll('.markdown-format-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                  e.preventDefault();
                  var formatKey = this.getAttribute('data-format');
                  var name = this.getAttribute('data-name') || '格式';
                  var template = (formatKey && FORMAT_TEMPLATES[formatKey]) || this.getAttribute('data-template') || '';
                  if (!template) return;
                  copyFormattedText(template, name);
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
