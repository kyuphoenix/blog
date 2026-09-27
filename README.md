# ✦ Fuwari Blog (Hono on Cloudflare Workers)

基于 [Hono](https://hono.dev/) 框架与 [Cloudflare Workers](https://workers.cloudflare.com/) 构建的轻量级、高性能个人博客系统，前端风格深度移植自优雅清爽的 [Fuwari](https://github.com/saicaca/fuwari) 主题。

---

## ✨ 核心特性

- ⚡ **全球边缘渲染 (SSR)**：基于 Cloudflare Workers 边缘节点运行，使用 Hono JSX 服务端渲染，首屏直出，零水合延迟。
- 🎨 **Fuwari 视觉体验**：
  - 经典双栏自适应卡片布局，支持移动端单栏响应式设计。
  - 基于 OKLCH 色彩空间的动态主题色与明暗（Dark / Light）无缝平滑切换。
  - 文章页大纲目录（TOC）浮动侧边栏与滚动高亮指示器（ScrollSpy）。
  - 文章摘要引用卡片、字数统计、阅读用时估算。
- 📝 **Git 驱动与零打包体积**：
  - 文章存放于 `posts/` 目录的 Markdown 文件中，Worker 代码体积极小（不包含任何文章正文）。
  - 运行时动态拉取 GitHub Raw 内容，结合 **Cloudflare KV** 进行多级缓存加速。
- 🔗 **极简直接的文章路径**：
  - 文章访问路径统一采用 `/posts/文章标题`（如 `/posts/Hello World`），无需在 Frontmatter 中繁琐编写 `slug`。
- 💬 **Giscus 评论系统**：
  - 基于 GitHub Discussions 的现代化免数据库评论，支持与博客明暗主题实时联动。
- 🤖 **GitHub Actions 双工作流 CI/CD**：
  - **手动部署 Worker (`deploy.yml`)**：代码变动时手动触发部署，通过 GitHub Secrets/Variables 动态注入配置，零硬编码。
  - **自动同步与热刷新 (`sync-posts.yml`)**：推送 `posts/**` 触发，自动生成/更新文章清单，并向 Worker 发起 Webhook 立即清空并重新预热 KV 缓存，**秒级生效，无需重新部署 Worker**。

---

## 📁 目录结构

```text
.
├── .github/workflows/
│   ├── deploy.yml            # Cloudflare Workers 手动部署工作流
│   └── sync-posts.yml        # 文章自动同步与 KV 缓存热刷新工作流
├── posts/                    # 文章存放目录 (Markdown)
│   ├── manifest.json         # 自动生成的文章元数据清单
│   └── *.md                  # 文章源文件
├── public/                   # 静态资源 (头像、背景图、Favicon 等)
├── scripts/
│   ├── gen-manifest.mjs      # 文章清单生成脚本
│   └── prepare-wrangler.mjs  # CI/CD 环境变量动态注入脚本
├── src/
│   ├── components/           # Hono JSX 页面组件 (Layout, Navbar, Giscus 等)
│   ├── pages/                # 页面路由控制器 (首页、文章详情、归档、关于)
│   ├── routes/               # API 路由 (/api/posts, /api/posts/purge 等)
│   ├── services/             # GitHub Raw 拉取与 KV 缓存交互逻辑
│   ├── types/                # TypeScript 类型定义
│   ├── blog.config.ts        # 博客全局基础信息与配置
│   ├── styles.ts             # Tailwind / Fuwari 核心样式表
│   └── index.ts              # 应用入口
├── wrangler.jsonc            # Cloudflare Worker 配置文件模板
└── package.json
```

---

## 🛠️ 本地开发

### 环境准备

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [pnpm](https://pnpm.io/) (推荐)

### 安装与运行

```bash
# 1. 安装依赖
pnpm install

# 2. 生成本地文章清单
pnpm gen:manifest

# 3. 启动本地开发服务 (支持模拟 Cloudflare KV)
pnpm dev
```

本地服务启动后，可在浏览器访问 `http://localhost:8787` 预览博客。

---

## ✍️ 撰写与管理文章

在 `posts/` 目录下创建 `.md` 文件即可撰写新文章。

### Frontmatter 格式示例

```markdown
---
title: 使用 Hono 构建边缘博客
date: 2026-09-26
category: 技术
tags: [Hono, Cloudflare Workers, TypeScript]
excerpt: 本文记录了如何结合 Hono 与 Cloudflare Workers 搭建全功能 Fuwari 博客。
cover: https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80
draft: false
---

# 这里是文章正文

你的 Markdown 内容...
```

> **提示**：
> - `title` 即为文章标题，访问地址将自动对应为 `/posts/使用 Hono 构建边缘博客`。
> - `draft: true` 的文章仅在本地预览，线上不会公开展示。
> - 本地可随时执行 `pnpm gen:manifest` 重新生成 `posts/manifest.json` 清单。

---

## 🚀 部署与 CI/CD 配置

本项目采用纯 GitHub Actions 实现安全自动化部署，代码库中不包含任何敏感信息与私有凭据。

### 1. 准备 Cloudflare 资源

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **KV**，创建一个名为 `blog-cache` 的命名空间，复制其 **Namespace ID**。
3. 进入 **Workers & Pages** -> **D1**，创建一个名为 `blog-db` 的数据库，复制其 **Database ID**（用于访问量统计与热门文章置顶）。
4. 创建具有 Worker 部署权限的 **API Token**（可使用 `Edit Cloudflare Workers` 模板），并记录你的 **Account ID**。

### 2. 配置 GitHub 仓库变量与密钥

在 GitHub 仓库的 **Settings** -> **Secrets and variables** -> **Actions** 中进行配置：

#### 🔒 Repository Secrets（保密凭据）
| 密钥名称 | 必填 | 说明 |
| :--- | :---: | :--- |
| `CLOUDFLARE_API_TOKEN` | **是** | Cloudflare API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | **是** | Cloudflare 账户 ID |
| `CLOUDFLARE_KV_ID` | **是** | 上一步创建的 KV 命名空间 ID |
| `CLOUDFLARE_D1_ID` | 推荐 | 上一步创建的 D1 数据库 ID（配置后自动开启访问量统计与 Top 3 热门置顶） |
| `PURGE_SECRET` | 推荐 | 自定义缓存刷新密钥（如任意随机字符串），用于保护缓存刷新接口 |
| `PAT_TOKEN` | 可选 | GitHub Personal Access Token（仅在仓库为私有仓库或需提高 API 速率时配置） |

#### 🌐 Repository Variables（公开变量）
| 变量名称 | 必填 | 示例 | 说明 |
| :--- | :---: | :--- | :--- |
| `BLOG_URL` | **是** | `https://blog.example.com` 或 `https://blog.yourname.workers.dev` | 博客完整访问地址。**若为自有独立域名，部署工作流将自动为其配置自定义域名路由**；同时供文章同步工作流调用刷新缓存。 |
| `WORKER_NAME` | 否 | `blog` | Cloudflare Worker 实例名称（默认为 `blog`） |
| `GISCUS_REPO` | 否 | `kyuphoenix/blog` | Giscus 绑定的公开仓库（开启评论用） |
| `GISCUS_REPO_ID` | 否 | `R_...` | 从 [giscus.app](https://giscus.app) 获取的仓库 ID |
| `GISCUS_CATEGORY` | 否 | `Announcements` | Giscus 讨论分区名称 |
| `GISCUS_CATEGORY_ID` | 否 | `DIC_...` | 从 [giscus.app](https://giscus.app) 获取的分区 ID |
| `GISCUS_THEME_LIGHT` | 否 | `https://.../css/giscus-fuwari-light.css` | 自定义 Giscus 亮色主题地址（默认自动使用内置 Fuwari 风格） |
| `GISCUS_THEME_DARK` | 否 | `https://.../css/giscus-fuwari-dark.css` | 自定义 Giscus 暗色主题地址（默认自动使用内置 Fuwari 风格） |

> 🎨 **Fuwari 评论区风格适配**：
> 系统默认已将 Giscus Markdown 评论框深度定制为 **Fuwari** 风格：
> - 摒弃默认 GitHub 刻板标签页与硬边角，采用现代分段圆角胶囊选项卡（Write / Preview）与 `1rem` 大圆角设计。
> - 评论输入框、提交按钮、徽章及代码预览全面采用 Fuwari OKLCH 主题配色（Hue 250）。
> - 完美支持全站明暗模式无缝联动切换，样式表支持跨域 CORS 托管。
>
> 📊 **Cloudflare D1 访问量统计与热门置顶（参考 Umami 规范）**：
> - **隐私保护**：无 Cookie 追踪，基于当日 Salt 与客户端特征单向哈希去重，完全符合 GDPR 隐私规范。
> - **会话防刷**：采用 Umami 级客户端与服务端双重防刷，同会话/短时间内频繁刷新不重复计入访问量。
> - **极速读取**：采用事件明细与聚合计数双表设计，首页读取热门文章仅需毫秒级行读取，高效省流。
> - **Top 3 热门置顶**：首页自动按总浏览量提拔最高的三篇热门文章置顶展示在文章列表最上方，并在标题前标注热门火焰图标与实时阅读量。


### 3. 执行首次部署

1. 打开 GitHub 仓库页面，切换到 **Actions** 标签栏。
2. 在左侧选择 **Deploy to Cloudflare Workers**。
3. 点击 **Run workflow** -> 选择 `main` 分支 -> 点击绿色按钮确认运行。
4. 等待工作流执行完毕，即可访问你的专属博客！

---

## 🔄 日常运维与自动刷新

- **发布 / 更新文章**：
  直接在本地或 GitHub Web 界面修改/添加 `posts/*.md`，推送至 `main` 分支。
  - GitHub Actions 将自动触发 `Sync Posts & Refresh Cache` 工作流。
  - 自动更新 `posts/manifest.json` 清单并提交。
  - 自动向 Worker 发送请求清除旧缓存并预热最新文章，**几秒内即可看到更新，无须重新构建部署**。
- **更新网站代码 / 主题样式**：
  修改 `src/` 代码后推送到 GitHub，按需前往 Actions 页面手动运行 **Deploy to Cloudflare Workers** 即可。

---

## 📄 License

MIT License.
