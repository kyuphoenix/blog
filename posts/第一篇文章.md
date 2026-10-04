---
title: Hello World
date: 2024-01-15
category: 技术
tags: [博客, 入门]
excerpt: 这是我的第一篇博客文章，欢迎来到我的博客！
cover: https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80
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

## 如何添加与管理文章

你可以通过以下两种方式之一轻松管理博客内容：

### 方式一：通过 Pages CMS 可视化管理（推荐）

本项目已深度集成 [Pages CMS](https://pagescms.org/)：

1. 打开并登录 Pages CMS，绑定本博客的 GitHub 仓库。
2. 在左侧菜单点击 **「文章」**，即可直接点击 **新建文章**，或选择已有文章进行可视化编辑。
3. 支持 Markdown 与所见即所得富文本双向切换，支持直接在表单中上传/选择封面图、设置分类与标签。
4. 点击 **Save** 保存后，GitHub Actions 会自动提交更新并刷新边缘缓存，**免重新部署秒级上线**！

> 💡 此外，**站点基础信息**（博客名称、简介、站长头像、背景图、主题色等）和 **友情链接** 也都可以直接在 Pages CMS 左侧菜单的可视化表单中实时修改生效。

### 方式二：通过 Git 仓库管理

1. 在 `posts/` 目录下创建以文章标题命名的 Markdown 文件（如 `posts/你的文章标题.md`）。
2. 填写 frontmatter（只需标题、日期、分类等，无需额外指定 slug）。
3. 本地调试时可运行 `pnpm gen:manifest` 更新文章清单。
4. 推送到 GitHub `main` 分支，GitHub Actions 自动完成文章同步与缓存刷新！
