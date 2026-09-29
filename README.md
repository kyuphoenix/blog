# ✦ Fuwari Blog (Hono SSR Multi-Cloud)

基于 [Hono](https://hono.dev/) 框架构建的轻量级、高性能个人博客系统，支持在 **Cloudflare Workers**、**Vercel Edge** 和 **Netlify Edge** 上全球边缘部署。前端视觉与交互风格深度移植自优雅清爽的 [Fuwari](https://github.com/saicaca/fuwari) 主题。

---

## ✨ 核心特性

- ⚡ **全球边缘渲染 (SSR) 与多云支持**：
  - 基于 Web 标准 API 与 Hono JSX 服务端渲染，首屏秒开，零水合延迟。
  - **原生多云部署适配**：开箱即用支持 **Cloudflare Workers**、**Vercel Edge Functions** 与 **Netlify Edge Functions**。
- 🎨 **Fuwari 视觉体验**：
  - 经典双栏自适应卡片布局，支持移动端单栏响应式设计。
  - 基于 OKLCH 色彩空间的动态主题色与明暗（Dark / Light）无缝平滑切换。
  - 文章页大纲目录（TOC）浮动侧边栏与滚动高亮指示器（ScrollSpy）。
  - 文章摘要引用卡片、字数统计、阅读用时估算。
- 📦 **云中立键值缓存 (`unstorage`)**：
  - 接入工业级缓存抽象层 `unstorage`，在 Cloudflare 上自动调用原生全局边缘 KV，在 Vercel / Netlify / 本地调试时平滑降级为内存缓存。
  - 本地离线开发零云端配置依赖，新克隆项目开箱即跑。
- 🗄️ **灵活双数据库架构 (Cloudflare D1 & Supabase)**：
  - **支持双引擎**：可自由连接 **Cloudflare D1 (SQLite)** 或 **Supabase (PostgreSQL)**。
  - **智能自动路由**：“配置了谁就连接谁”，同时支持在 GitHub Actions Workflow 中通过下拉框显式指定构建产物。
  - **Umami 级访问量统计与热门置顶**：
    - 隐私友好（基于每日 Salt 与客户端特征单向哈希，绝不存真实 IP）。
    - 30 分钟会话与 IP 防刷去重。
    - 首页自动提拔阅读量最高的 Top 3 热门文章置顶并标明火焰角标。
- 📝 **Git 驱动与内容解耦**：
  - 文章统一存放在 `posts/*.md` 中，Worker 代码体积极小（不包含任何文章正文）。
  - 运行时动态拉取 GitHub Raw 内容，结合 KV/内存多级缓存加速。
- 🔗 **极简直接的文章路径**：
  - 统一访问路径 `/posts/文章标题`（如 `/posts/Hello World`），无需在 Frontmatter 中手动指定冗余的 `slug`。
- 💬 **Giscus 评论系统深度定制**：
  - 免数据库 GitHub Discussions 评论系统，外观深度重构为 Fuwari 圆角主题。
  - 配备富文本格式快捷栏（粗体、斜体、代码、引用、列表等）与实时表情互动。
- 🔍 **SEO 与搜索引擎友好**：
  - 自动化动态生成 `/sitemap.xml` 与 `/robots.txt`，包含全站 Open Graph 与 Twitter Card 社交元标签。
- 🤖 **GitHub Actions CI/CD 工作流**：
  - **部署工作流 (`deploy.yml`)**：手动选择分支和数据库引擎部署，配置动态注入，零敏感信息硬编码。
  - **自动同步与热刷新 (`sync-posts.yml`)**：推送文章自动生成清单并调用 Webhook 预热缓存，**秒级生效，无需重新部署应用**。

---

## 📁 目录结构

```text
.
├── .github/workflows/
│   ├── deploy.yml            # Cloudflare Workers 手动部署工作流（支持切换数据库）
│   └── sync-posts.yml        # 文章自动同步与缓存热刷新工作流
├── api/
│   └── index.ts              # Vercel Edge Function 入口
├── netlify/
│   └── edge-functions/       # Netlify Edge Function 入口
├── netlify.toml              # Netlify 部署配置
├── vercel.json               # Vercel 部署路由配置
├── posts/                    # 文章存放目录 (Markdown)
│   ├── manifest.json         # 自动生成的文章元数据清单
│   └── *.md                  # 文章源文件
├── db/
│   ├── schema.sql            # Cloudflare D1 数据库初始化脚本
│   └── schema.supabase.sql   # Supabase PostgreSQL 初始化脚本与 RPC 函数
├── friends.json              # 友情链接数据源 (支持动态更新与自动刷新缓存)
├── public/                   # 静态资源 (头像、背景图、Favicon 等)
├── scripts/
│   ├── gen-manifest.mjs      # 文章清单生成脚本
│   └── prepare-wrangler.mjs  # CI/CD 环境变量动态注入与配置清理脚本
├── src/
│   ├── components/           # Hono JSX 页面组件 (Layout, Navbar, Giscus 等)
│   ├── pages/                # 页面路由控制器 (首页、文章详情、归档、关于)
│   ├── routes/               # API 路由 (/api/posts, /api/stats, /sitemap.xml 等)
│   ├── services/
│   │   ├── db/               # 统一数据库抽象层 (D1 与 Supabase 驱动实现)
│   │   ├── storage.ts        # 基于 unstorage 的统一键值存储服务
│   │   ├── github.ts         # GitHub 内容拉取与多级缓存服务
│   │   └── stats.ts          # 阅读量统计与热门榜单业务代理
│   ├── types/                # TypeScript 类型定义
│   ├── blog.config.ts        # 博客全局基础信息与配置
│   ├── styles.ts             # Tailwind / Fuwari 核心样式表
│   └── index.ts              # 应用核心入口
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

# 3. 启动本地开发服务（unstorage 自动使用内存缓存驱动，免配云 KV）
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

## 🗄️ 数据库配置指南 (可选其一或按需切换)

博客支持 **Cloudflare D1** 或 **Supabase** 作为阅读量统计与热门置顶的数据源。

### 方案 A：使用 Supabase (推荐用于跨平台部署，支持 Action 全自动建表)

1. 在 [Supabase](https://supabase.com/) 创建一个新项目。
2. 获取项目凭据：
   - 进入 **Project Settings** -> **API**，获取 **Project URL**（对应 `SUPABASE_URL`）和 **Project API Keys**（对应 `SUPABASE_KEY`）。
3. **数据库初始化（支持全自动与手动两种方式）**：
   - **✨ 全自动初始化（推荐，无需手动建表）**：
     在 GitHub Secrets 中添加 `DATABASE_URL`（Supabase 控制台 **Settings** -> **Database** -> **Connection string** 中的 URI）或 `SUPABASE_ACCESS_TOKEN`（控制台 **Account** -> **Access Tokens**）。
     GitHub Actions 在首次部署时会自动检测数据表是否存在，若未初始化将**自动执行建表、索引与存储过程初始化**！后续部署自动跳过。
   - **手动初始化（备选）**：
     打开 Supabase 项目的 **SQL Editor**，将项目中的 [`db/schema.supabase.sql`](db/schema.supabase.sql) 内容完整粘贴并点击 **Run** 执行一次即可。

### 方案 B：使用 Cloudflare D1

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 中进入 **Workers & Pages** -> **D1**。
2. 创建一个名为 `blog-db` 的数据库，记录其 **Database ID**（对应 `CLOUDFLARE_D1_ID`）。
3. 进入 D1 控制台的 **Console**，执行 [`db/schema.sql`](db/schema.sql) 创建表结构。

---

## 🚀 部署指南

### 1. 部署到 Cloudflare Workers (推荐)

本项目采用纯 GitHub Actions 自动化部署，无须在代码中硬编码任何私有密钥。

#### 步骤 1：配置 GitHub 仓库 Secrets 与 Variables

在 GitHub 仓库的 **Settings** -> **Secrets and variables** -> **Actions** 中添加：

##### 🔒 Repository Secrets（敏感密钥）
| 密钥名称 | 必填 | 说明 |
| :--- | :---: | :--- |
| `CLOUDFLARE_API_TOKEN` | **是** | 具备 Worker 部署权限的 Cloudflare API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | **是** | Cloudflare 账户 ID |
| `CLOUDFLARE_KV_ID` | 推荐 | Cloudflare KV 命名空间 ID（未配置时系统自动以内存缓存平稳运行） |
| `CLOUDFLARE_D1_ID` | 选填 | Cloudflare D1 数据库 ID（使用 D1 数据库时配置） |
| `SUPABASE_URL` | 选填 | Supabase 项目 URL（使用 Supabase 数据库时配置） |
| `SUPABASE_KEY` | 选填 | Supabase API 密钥（使用 Supabase 数据库时配置） |
| `DATABASE_URL` | 选填 | Supabase PostgreSQL 连接串，**配置后 Action 自动检测并全自动建表** |
| `SUPABASE_ACCESS_TOKEN` | 选填 | Supabase Personal Access Token，**配置后亦支持 Action 全自动建表** |
| `PURGE_SECRET` | 推荐 | 自定义缓存刷新密钥（用于防护缓存热刷新 Webhook） |
| `PAT_TOKEN` | 可选 | GitHub Personal Access Token（仅在仓库为私有仓库时需要） |

##### 🌐 Repository Variables（公开变量）
| 变量名称 | 必填 | 示例 | 说明 |
| :--- | :---: | :--- | :--- |
| `BLOG_URL` | **是** | `https://blog.example.com` 或 `https://blog.workers.dev` | 博客完整访问地址。**自有域名部署时会自动绑定域名路由**。 |
| `WORKER_NAME` | 否 | `blog` | Cloudflare Worker 实例名称（默认为 `blog`） |
| `DATABASE_TYPE` | 否 | `auto` | 默认数据库类型（`auto`、`d1`、`supabase`） |
| `GISCUS_REPO` | 否 | `username/blog` | Giscus 讨论仓库名称 |
| `GISCUS_REPO_ID` | 否 | `R_...` | 从 [giscus.app](https://giscus.app) 获取的仓库 ID |
| `GISCUS_CATEGORY` | 否 | `Announcements` | Giscus 讨论分区名称 |
| `GISCUS_CATEGORY_ID` | 否 | `DIC_...` | 从 [giscus.app](https://giscus.app) 获取的分区 ID |

#### 步骤 2：触发部署
1. 进入 GitHub 仓库的 **Actions** 标签页。
2. 点击 **Deploy to Cloudflare Workers**。
3. 点击 **Run workflow**：
   - 可在 `database_type` 下拉选项中自由选择：
     - `auto`: 自动识别（配置了谁就用谁）
     - `d1`: 强制连接 Cloudflare D1 数据库
     - `supabase`: 强制连接 Supabase 数据库（会自动清理 D1 绑定，防止部署报错）
4. 部署完成后即可全球极速访问！

---

### 2. 部署到 Vercel

1. 将仓库 Fork 或推送至你的 GitHub。
2. 登录 [Vercel Dashboard](https://vercel.com/)，点击 **Add New...** -> **Project** 导入此仓库。
3. 在 **Environment Variables** 中配置环境变量：
   - `BLOG_URL`: 你的 Vercel 站点域名
   - `GITHUB_OWNER` & `GITHUB_REPO` & `GITHUB_BRANCH`: 你的 GitHub 仓库信息
   - `SUPABASE_URL` & `SUPABASE_KEY`: 你的 Supabase 数据库凭据
   - `GISCUS_*`: 评论区配置（可选）
4. 点击 **Deploy**，Vercel 将通过 Edge Functions 秒级部署上线！

---

### 3. 部署到 Netlify

1. 在 [Netlify Dashboard](https://app.netlify.com/) 中点击 **Add new site** -> **Import an existing project**。
2. 选择本仓库，构建设置会自动读取 [`netlify.toml`](netlify.toml)。
3. 在 **Site settings** -> **Environment variables** 中填入相同的环境变量。
4. 点击 **Deploy site** 即完成上线。

---

## 🔄 日常运维与自动刷新

- **发布 / 更新文章**：
  直接在本地或 GitHub Web 界面修改/添加 `posts/*.md` 并推送到 `main` 分支。
  - GitHub Actions 将自动触发 `Sync Posts & Refresh Cache`。
  - 自动更新清单并向博客发起 Webhook 刷新缓存，**几秒内即可看到更新，无需重新构建部署**。
- **添加 / 更新友链**：
  修改根目录的 `friends.json` 推送即可自动生效。
- **切换数据库后端**：
  直接在 GitHub Actions 中重新运行 **Deploy to Cloudflare Workers**，在下拉框中选择 `d1` 或 `supabase` 重新构建部署即可无缝切换！
- **查看数据库运行状态**：
  访问 `/api/stats/status` 端点可直接查看当前应用实例正连接的数据库类型（`supabase` / `d1` / `none`）。

---

## 📄 License

MIT License.
