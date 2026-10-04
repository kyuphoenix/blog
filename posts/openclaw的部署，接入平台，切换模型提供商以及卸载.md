---
title: openclaw的部署，接入平台，切换模型提供商以及卸载
date: 2026-10-04
updated: 2026-10-04
category: 技术
tags:
  - openclaw
excerpt: 本视频教程介绍了OpenCLaw与飞书的集成，指出最新版插件支持扫码一键创建机器人，无需接入教程。内容涵盖在WSL中安装Ubuntu24.04，通过命令行安装OpenCLaw及飞书插件，并提供了查看模型、配置及卸载等常用操作指令。
draft: false
---
# [视频教程](https://www.bilibili.com/video/BV1LPw7zhEVW/?share_source=copy_web&vd_source=7f1c45996c1a4c719f775d71780d7f47)（某个人太懒不想写文字教程了）

<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=116238961346286&bvid=BV1LPw7zhEVW&cid=36744594305&p=1&autoplay=false" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>

注意最新版飞书插件可以直接扫码一键创建机器人，可以跳过视频中的接入教程了
[飞书官方教程](https://www.feishu.cn/content/article/7613711414611463386)
# 可能用到的命令
查看wsl可下载系统列表
```
wsl --list --online
```

下载ubuntu
```
wsl --install Ubuntu-24.04
```
进入ubuntu系统
```
wsl -d Ubuntu-24.04
```
一键安装openclaw命令
```
curl -fsSL https://openclaw.ai/install.sh | bash
```
安装飞书插件命令
```
npx -y @larksuite/openclaw-lark-tools install
```
打开openclaw配置引导
```
openclaw onboard
```
查看openclaw模型列表
```
openclaw models list
```
openclaw切换模型
```
openclaw models set <模型名称>
```
查看openclaw位置
```
which openclaw
```
卸载openclaw命令
```
openclaw uninstall
```
nodejs卸载openclaw模块命令
```
npm -remove -g openclaw
```

卸载ubuntu系统命令
```
wsl --unregister Ubuntu-24.04
```