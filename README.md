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
- 🗄️ **可选双数据库架构与零数据库超轻量运行 (Cloudflare D1 & Supabase)**：
  - **完全可选的浏览统计功能**：若未配置 D1 且未配置 Supabase，博客自动以**零数据库模式**运行，前端不显示阅读计数与火焰角标，亦不产生任何统计上报请求，性能极致轻快。
  - **按需自由激活**：配置了 D1 或 Supabase 之一即可秒级自动激活浏览量统计功能。
  - **支持双引擎与一键关闭**：可自由连接 **Cloudflare D1 (SQLite)** 或 **Supabase (PostgreSQL)**，支持在 GitHub Actions Workflow 中通过下拉选项自由指定（`auto`、`d1`、`supabase`、`none`）。
  - **Umami 级访问量统计与热门置顶（开启统计时）**：
    - 隐私友好（基于每日 Salt 与客户端特征单向哈希，绝不存真实 IP）。
    - 30 分钟会话与 IP 防刷去重。
    - 首页自动提拔阅读量最高的 Top 3 热门文章置顶并标明火焰角标。
- 📝 **Git 驱动与内容解耦**：
  - 文章统一存放在 `posts/*.md` 中，Worker 代码体积极小（不包含任何文章正文）。
  - 运行时动态拉取 GitHub Raw 内容，结合 KV/内存多级缓存加速。
- 🖥️ **Pages CMS 可视化后台深度支持**：
  - 预配置 [`.pages.yml`](.pages.yml)，无需本地环境，随时随地在 [Pages CMS](https://pagescms.org/) 网页端**在线可视化创建、排版、编辑与删除文章**（支持 Markdown 与所见即所得富文本双向切换）。
  - 支持直接在后台可视化编辑**站点基础信息**（博客名称、作者简介、更换头像、首页大背景图、调整 OKLCH 主题色相、导航栏、社交链接）与**友情链接**。
  - **多云边缘图片反代与长效缓存**：Pages CMS 上传的新图片自动由 Worker/Edge 代理并缓存在 CDN 节点（30 天），免重新部署，国内高速秒开。
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
│   ├── deploy.yml            # Cloudflare Workers 部署工作流（支持切换数据库）
│   ├── deploy-vercel.yml     # Vercel Edge 自动化部署与环境变量同步工作流
│   ├── deploy-netlify.yml    # Netlify Edge 自动化部署与环境变量同步工作流
│   └── sync-posts.yml        # 文章自动同步与缓存热刷新工作流
├── .pages.yml                # Pages CMS 可视化内容管理后台配置文件
├── blog.config.json          # 博客全局基础设置 (标题、作者、头像、背景图、主题色等)
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
│   ├── prepare-wrangler.mjs  # CI/CD 环境变量动态注入与配置清理脚本
│   ├── init-supabase.mjs     # Supabase 数据表与 RPC 自动初始化脚本
│   ├── deploy-vercel.mjs     # Vercel 自动化部署与环境变量同步脚本
│   └── deploy-netlify.mjs    # Netlify 自动化部署与环境变量同步脚本
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

你可以选择 **Pages CMS 可视化后台（强烈推荐）** 或 **传统 Git 仓库提交** 两种方式来管理博客文章：

### 方式一：通过 Pages CMS 可视化管理（强烈推荐）

本项目已针对 [Pages CMS](https://pagescms.org/) 进行了开箱即用的深度适配：

1. **登录授权**：打开 [Pages CMS](https://pagescms.org/)，使用你的 GitHub 账号登录并授权绑定本博客仓库。
2. **可视化创建新文章**：
   - 在左侧菜单点击 **「文章」** -> 右上角 **「New item」**（新建文章）。
   - 输入文章标题（系统将自动以 `{title}.md` 规范命名保存）、选择发布日期、分类与标签。
   - 上传或挑选封面图片（图片将自动存储在 `public/images/` 中，并在各大云平台上享受自动边缘代理与 CDN 缓存）。
   - 正文编辑器支持在 **Markdown 源码** 与 **所见即所得富文本**（WYSIWYG）之间随时切换。
3. **可视化编辑已有文章**：
   - 在文章列表中点击任意文章卡片即可进入编辑，修改内容、标签、摘要、封面图或更新日期。
4. **实时保存与发布**：
   - 点击右上角 **Save**，Pages CMS 会将修改自动 commit 并推送到 GitHub 仓库。
   - GitHub Actions 将自动重新生成文章清单并通知 Worker 预热缓存，**几秒内线上即刻展示，无需重新构建部署应用**！
5. **站点设置与友情链接**：
   - **「站点设置」**：可直观修改博客标题、作者昵称与简介、一键上传更换站长头像与首页大背景图、调整 OKLCH 主题色相数值（0~360）、自定义导航栏菜单及社交平台链接。
   - **「友情链接」**：以表单列表形式随时新增、编辑、删除友链，保存后即刻刷新生效。

### 方式二：通过 Git 命令行管理

如果你习惯使用本地文本编辑器（如 VS Code、Obsidian）：

1. 在 `posts/` 目录下创建以文章标题命名的 Markdown 文件，例如 `posts/使用 Hono 构建边缘博客.md`。
2. 填写 Frontmatter 元数据及正文：

```markdown
---
title: 使用 Hono 构建边缘博客
date: 2026-09-26
category: 技术
tags: [Hono, Cloudflare Workers, TypeScript]
excerpt: 本文记录了如何结合 Hono 与 Cloudflare Workers 搭建全功能 Fuwari 博客。
cover: /images/cover.jpg
draft: false
---

# 这里是文章正文

你的 Markdown 内容...
```

> **提示**：
> - `title` 即为文章标题，访问地址将自动对应为 `/posts/使用 Hono 构建边缘博客`。
> - `draft: true` 的文章标记为草稿，线上不会公开展示。
> - 本地开发时可执行 `pnpm gen:manifest` 更新 `posts/manifest.json` 清单。
> - 推送至 GitHub `main` 分支后，GitHub Actions 会自动更新清单并刷新缓存。

---

## 🗄️ 数据库与浏览统计配置（可选功能）

> 💡 **说明**：**数据库与文章浏览量统计为完全可选功能**。
> - **未配置数据库时**：博客自动以**零数据库超轻量模式**运行，前端不展示阅读计数与热门火焰角标，浏览器端完全不发送任何上报请求，性能极致轻快。所有文章展示、TOC 目录、分类标签、代码高亮、Giscus 评论等核心功能 100% 正常使用。
> - **按需开启**：若需要启用阅读量统计和热门文章排行，只需配置 **Cloudflare D1** 或 **Supabase** 之一即可自动激活。

### 方案 A：使用 Supabase (推荐用于跨平台部署，支持 Action 全自动建表)

1. 在 [Supabase](https://supabase.com/) 创建一个新项目。
2. 获取项目凭据：
   - 进入 **Project Settings** -> **API**，获取 **Project URL**（对应 `SUPABASE_URL`）和 **Project API Keys**（对应 `SUPABASE_KEY`）。
3. **数据库初始化（支持全自动与手动两种方式）**：
   - **✨ 全自动初始化（推荐，无需手动建表）**：
     在 GitHub Secrets 中添加 `DATABASE_URL`（Supabase 控制台 **Settings** -> **Database** -> **Connection string** 中的 URI）或 `SUPABASE_ACCESS_TOKEN`（控制台 **Account** -> **Access Tokens**）。
     GitHub Actions 在首次部署时会自动检测数据表是否存在，若未初始化将**自动执行建表、索引、RLS 安全策略与存储过程初始化**！后续部署自动跳过。
   - **手动初始化（备选）**：
     打开 Supabase 项目的 **SQL Editor**，将项目中的 [`db/schema.supabase.sql`](db/schema.supabase.sql) 内容完整粘贴并点击 **Run** 执行一次即可。

#### 🔑 Supabase 不同权限密钥/凭据的区别与选用建议

在使用 Supabase 时，你会接触到几种不同类型与权限级别的密钥，它们在安全性与功能上的差异如下：

| 凭据类型 | 配置名称 | 权限级别 | 能否自动建表 (DDL) | 业务读写 | 安全性与适用场景 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **anon key**<br>(公开匿名密钥) | `SUPABASE_KEY` | 受限<br>(遵循 RLS 策略) | ❌ 否<br>(公开 API 禁止建表) | ✅ 正常支持<br>(受 RLS 保护) | 🟢 **最安全**。专供客户端与边缘 Worker 运行时使用，即便泄露也不会破坏数据库或越权访问。 |
| **service_role key**<br>(管理员超级密钥) | `SUPABASE_KEY` 或<br>`SUPABASE_SERVICE_ROLE_KEY` | 超级管理<br>(绕过所有 RLS) | ❌ 否<br>(PostgREST 未开放任意 SQL 接口) | ✅ 拥有全权<br>(无视 RLS 规则) | 🟡 **需妥善保管**。仅可在后端/Worker 环境变量中存放，**严禁暴露在客户端前端代码中**。 |
| **DATABASE_URL**<br>(PostgreSQL 直连连接串) | `DATABASE_URL` 或<br>`SUPABASE_DB_URL` | 底层数据库连接<br>(`postgres` 用户) | ✅ **支持全自动建表**<br>(通过标准 Postgres 协议) | -<br>(Worker 走 REST 避免耗尽连接池) | 🔴 **高度敏感**。存放在 GitHub Secrets 中，**专供 GitHub Actions 首次部署时自动执行建表与升级**。 |
| **SUPABASE_ACCESS_TOKEN**<br>(个人管理访问令牌) | `SUPABASE_ACCESS_TOKEN` | 平台管理级<br>(Management API) | ✅ **支持全自动建表**<br>(通过官方管控 API 远程下发) | -<br>(不参与应用业务运行) | 🔴 **账户级凭据**。存放在 GitHub Secrets 中，适合不便配置数据库密码时的全自动建表备选。 |

> 💡 **最佳实践推荐组合**：
> - **生产运行**：`SUPABASE_KEY` 配置 `anon key`（安全合规，配合项目自带的 RLS 策略正常读写统计数据）。
> - **一键部署**：GitHub Secrets 中配置 `DATABASE_URL`，实现初次部署免进 Supabase 控制台的**全自动无感建表**。


### 方案 B：使用 Cloudflare D1

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 中进入 **Workers & Pages** -> **D1**。
2. 创建一个名为 `blog-db` 的数据库，记录其 **Database ID**（对应 `CLOUDFLARE_D1_ID`）。
3. 进入 D1 控制台的 **Console**，执行 [`db/schema.sql`](db/schema.sql) 创建表结构。

---

## 🚀 部署指南

本项目原生支持部署到全球主流边缘计算平台。关于详细的操作步骤、所需权限、必要与可选环境变量清单，请直接参阅完整部署指南：

- ⚡ [cloudflare部署](docs/部署流程.md#cloudflare部署)（主推推荐，支持 GitHub Actions 自动化 CI/CD 与无感建表）
- ▲ [vercel部署](docs/部署流程.md#vercel部署)（基于 Vercel Edge Runtime，支持 GitHub Actions 自动化与环境变量一键同步）
- 🌐 [netlify部署](docs/部署流程.md#netlify部署)（基于 Netlify Edge Functions，支持 GitHub Actions 自动化与环境变量一键同步）

> 📖 完整多平台部署文档请查阅：[`docs/部署流程.md`](docs/部署流程.md)

---

## 🔄 日常运维与自动刷新

- **发布 / 更新文章**：
  推荐直接在 **Pages CMS** 后台新建或编辑文章保存，也可以在本地或 GitHub 仓库修改/添加 `posts/*.md` 并推送到 `main` 分支。
  - GitHub Actions 将自动触发 `Sync Posts & Refresh Cache`。
  - 自动更新清单并向博客发起 Webhook 刷新缓存，**几秒内即可看到更新，无需重新构建部署**。
- **修改站点信息与友链**：
  在 **Pages CMS** 后台「站点设置」或「友情链接」中可视化编辑并保存（或直接修改 `blog.config.json` / `friends.json` 并推送），保存后自动同步生效。
- **切换数据库后端**：
  直接在 GitHub Actions 中重新运行 **Deploy to Cloudflare Workers**，在下拉框中选择 `d1` 或 `supabase` 重新构建部署即可无缝切换！
- **查看数据库运行状态**：
  访问 `/api/stats/status` 端点可直接查看当前应用实例正连接的数据库类型（`supabase` / `d1` / `none`）。

---

## 📄 License

MIT License.
