---
title: Hello World
date: 2024-01-15
category: 技术
tags: [博客, 入门]
excerpt: 这是我的第一篇博客文章，欢迎来到我的博客！
cover: https://images.unsplash.com/photo-1499750310107-5fef28a66643
---

# Hello World

欢迎来到我的博客！🎉

这是一篇示例文章，用于展示博客系统的基本功能。

## 特性

- 📝 文章存储在 Git 仓库中
- 🚀 通过 GitHub Raw API 动态拉取，无需重新部署
- ⚡ KV 缓存加速访问
- 🏷️ 支持分类和标签
- 🔗 直接通过 `/posts/文章标题` 访问，无需单独指定 slug

## 代码示例

```typescript
const greeting = 'Hello, World!'
console.log(greeting)
```

## 如何添加新文章

1. 在 `posts/` 目录下创建 `.md` 文件
2. 填写 frontmatter（只需标题、日期、分类等，无需写 slug）
3. 运行 `pnpm gen:manifest` 更新文章清单
4. 推送到 GitHub，文章自动生效！
