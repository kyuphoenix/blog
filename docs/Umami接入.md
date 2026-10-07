# Umami 访问统计接入指南

Honoki 全面采用**零数据库架构（Zero-Database Architecture）**。博客的文章内容与元数据完全由 Git 仓库与全球边缘缓存驱动，**完全不依赖任何传统数据库（无需 Cloudflare D1，无需 Supabase）**。

博客的文章访问量统计与首页 Top 3 热门文章排行榜，现由轻量、现代且注重隐私的 **[Umami](https://umami.is/)** 统计引擎驱动。

> [!NOTE]
> **访问量统计为完全可选功能**：  
> - 若你**未配置** Umami，博客自动以纯净的**零数据库极速模式**运行，前端不展示阅读计数与热门火焰角标，浏览器端绝不发送任何统计上报请求，性能极致轻快。  
> - 若你**需要**阅读计数与首页热门文章置顶，只需配置 Umami 即可秒级开启，享受免数据库的极简体验。

---

## 🌟 为什么选择 Umami？

1. **彻底免去数据库与建表负担**：
   完全不需要创建或维护 Cloudflare D1、Supabase PostgreSQL 等关系型数据库，无需执行任何 SQL 建表、迁移或存储过程脚本。
2. **彻底解决 Cloudflare 部署权限报错**：
   以往使用 Cloudflare D1 时，若 API Token 权限受限，在创建数据库或绑定路由时经常遭遇 `No access to the specified resource` 报错。接入 Umami 后，Worker 部署**完全剥离 D1 绑定**，100% 免权限烦恼。
3. **自带现代化独立访客大屏**：
   无需在数据库中手写 SQL 查询报表，Umami 免费提供一个媲美 Google Analytics 的现代化数据大屏，实时查看全站 PV/UV、来源渠道、跳出率、访问设备与国家地区分布。
4. **免费且全平台通用**：
   - 官方云端版（[Umami Cloud](https://cloud.umami.is/)）每月提供高达 **10,000 次事件**的免费额度，个人博客完全够用；
   - 亦支持任何自建 Docker / 独立实例；
   - 无论部署在 Cloudflare Workers、Vercel Edge 还是 Netlify，统一通用！
5. **双重防刷与防拦截上报机制**：
   - **客户端轻量追踪**：前端页面自动嵌入官方轻量脚本 `script.js`（小于 2KB），静默追踪访问；
   - **服务端代理兜底 (Server-side Proxy)**：若访客浏览器安装了 Adblock 等去广告插件阻断了客户端脚本，Honoki 后端会自动无感知代理上报至 Umami，确保每篇统计不失真；
   - **边缘多级缓存保护**：服务端拉取统计数据内置 60 秒边缘缓存，绝不给上游 Umami 服务带来高频请求负担。

---

## 🚀 接入配置步骤

### 1. 注册并添加站点

1. 打开 [Umami Cloud 官网](https://cloud.umami.is/)（或你的自建 Umami 平台）并登录。
2. 进入控制台，点击 **Websites** -> **Add website**。
3. 填写站点信息：
   - **Name**：填写博客名称（如 `我的个人博客`）
   - **Domain**：填写你的博客域名（如 `blog.example.com`）
4. 点击 **Save** 保存。

---

### 2. 获取 Website ID (必填)

1. 在 Websites 列表中，找到刚添加的站点，点击右侧的 **Edit**（编辑）。
2. 在弹出设置窗口中，复制页面上显示的 **Website ID**（一串 UUID，例如 `8a5c3e41-xxxx-4xxx-xxxx-xxxxxxxxxxxx`）。

---

### 3. 获取 API Key (建议配置)

博客后端拉取文章的浏览量（Pageviews）以及计算首页 Top 3 热门置顶排行需要通过 Umami REST API 鉴权：

1. 在 Umami 平台点击右上角头像 / **Settings** -> **API Keys**。
2. 点击 **Create API Key**。
3. 输入名称（例如 `Honoki Blog API`），点击保存生成。
4. **立即复制生成的 API Key**（出于安全考虑，该密钥仅显示一次）。

---

### 4. 在 GitHub 仓库配置环境变量

进入博客所在的 GitHub 仓库，导航至 **Settings** -> **Secrets and variables** -> **Actions**：

| 变量名称 | 配置位置 | 必填/可选 | 说明与获取方式 |
| :--- | :---: | :---: | :--- |
| `UMAMI_WEBSITE_ID` | Variables / Secrets | **必填** | 你的 Umami 站点 UUID（即第 2 步获取的 Website ID）。配置后博客自动激活统计功能 |
| `UMAMI_API_KEY` | Secrets | **建议配置** | 用于博客后端安全拉取文章浏览量及计算首页 Top 3 热门文章排行（即第 3 步获取的 API Key） |
| `UMAMI_HOST` | Variables | 可选 | 若使用官方 Umami Cloud，默认即为 `https://cloud.umami.is`，**无需配置留空即可**；若为自建实例，填入自建完整地址（如 `https://analytics.example.com`，末尾不带斜杠） |
| `ENABLE_UMAMI_SCRIPT` | Variables | 可选 | 默认为 `true`（博客 HTML `<head>` 自动注入客户端轻量上报脚本）；若设为 `false` 则完全由后端代理上报 |

---

## 🔍 验证运行状态

配置完成后，重新触发对应平台的部署工作流（如 `Deploy to Cloudflare Workers` / `Deploy to Vercel` / `Deploy to Netlify`）：

1. **查看引擎连接状态**：  
   在浏览器中访问你的博客状态接口：
   ```text
   https://yourblog.com/api/stats/status
   ```
   若配置成功，将返回如下 JSON：
   ```json
   {
     "success": true,
     "data": {
       "provider": "umami",
       "configured": true,
       "enabled": true,
       "umamiHost": "https://cloud.umami.is",
       "websiteId": "8a5c3e41-xxxx-4xxx-xxxx-xxxxxxxxxxxx",
       "hasApiKey": true,
       "scriptEnabled": true
     }
   }
   ```
2. **文章详情页浏览量**：  
   打开任意文章，页面元信息中将显示实际浏览量；
3. **首页热门排行**：  
   阅读量最高的 Top 3 篇文章将在首页自动置顶并附带热门火焰角标 🔥。