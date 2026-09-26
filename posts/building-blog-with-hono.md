---
title: 使用 Hono 构建博客 API
date: 2024-01-20
category: 技术
tags: [Hono, Cloudflare Workers, TypeScript]
excerpt: 本文介绍如何使用 Hono 框架在 Cloudflare Workers 上构建一个轻量级博客 API。
---

# 使用 Hono 构建博客 API

Hono 是一个小巧、快速的 Web 框架，专为 Edge Runtime 设计。它在 Cloudflare Workers 上运行得非常好。

## 为什么选择 Hono？

- **超快**：基于 Web 标准 API，零开销
- **轻量**：核心包只有几 KB
- **类型安全**：原生 TypeScript 支持
- **中间件丰富**：内置 CORS、JWT、Logger 等

## 架构设计

我们的博客采用了一种独特的架构：

1. **文章存储在 Git 仓库**：使用 Markdown + Frontmatter 格式
2. **运行时动态拉取**：通过 GitHub Raw API 获取内容
3. **KV 缓存**：避免每次请求都访问 GitHub
4. **无需重新部署**：更新文章只需推送到 GitHub
5. **极简路径**：直接以 `/posts/文章标题` 为访问路径

```
用户请求 → Cloudflare Worker → KV 缓存?
                                  ├─ 命中 → 返回缓存
                                  └─ 未命中 → GitHub Raw API → 缓存 → 返回
```

这种方式的好处是内容和代码完全解耦，更新文章无需触发构建和部署。
