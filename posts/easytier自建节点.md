---
title: easytier自建节点
date: 2026-04-19
updated: 2026-06-05
category: 技术
tags:
  - Cloudflare
  - 内网穿透
  - easytier
  - 组网
excerpt: EasyTier官方公共服务器已停运，用户需自建节点。文章介绍了利用免费容器（如ClawCloudRun）搭建节点的具体步骤，包括部署指定版本镜像、配置WSS端口及保活注意事项。此外，还提供了通过内网穿透（如Cloudflare
  Tunnel）将本地端口穿透至公网作为节点的方案。
draft: false
---
# 引言

easytier是一款去中心化的组网软件，支持p2p组网，在p2p组网失败的情况下也能通过服务器对流量进行中转。但是现在官方维护的公共服务器已经停止运行，个人用户现在只能在社区寻找公益节点或者选择自建节点

# 使用免费容器搭建节点

> 现在有许多平台有提供免费容器，只要可以拉取并运行docker镜像，步骤就差不多

clawcloudrun为github注册时间满180天的用户提供每个月5美元的赠金来运行容器，支持使用github oauth进行登录并且不需要绑定支付方式，不用担心被反薅，这里以clawcloudrun为例进行演示。

## 1.注册clawcloudrun账号并登录

- 进入clawcloudrun官网注册登录账号，并切换地区到日本（可以直接访问网址[https://ap-northeast-1.run.claw.cloud/](https://ap-northeast-1.run.claw.cloud/)）
  > 相对其他地区来说大陆连接日本的延迟较低（不过仅作为p2p握手节点，延迟的影响不大，打洞成功之后流量不经过该节点）。

## 2.创建应用

- 登录之后点击`App Launchpad`，再点击`Create App`。![点击App Launchpad](https://img-bucket.303302.xyz/2026/04/20260418235820524.png)

## 3.应用设置

- 进行基础设置。如下图，`Application Name`可以随意填写，这是在clawcloudrun显示的应用名称。镜像可以填写`easytier/easytier`，但是默认是拉取2.4.5版本镜像，不能设置仅p2p等功能，建议指定版本为2.5.0，即在`Image`栏位填写`easytier/easytier:v2.5.0`。cpu和内存可以保持默认也可以适当减少，但是不建议调到最低，实测使用0.1核心64MB内存配置有概率造成应用卡死![基础设置](https://img-bucket.303302.xyz/2026/04/20260419000606074.png)
- 然后开始网络设置。easytier默认监听tcp,udp协议的11010端口，ws协议的11011端口。`Network`中`Container Port`填写内网端口，可以填写tcp,udp监听的端口，也可以填写ws监听的端口。我推荐填写11011(即ws监听的端口，因为clawcloudrun对免费用户限制一个用户只能开启一个tcp端口，这样可以把tcp端口留给其他服务。并且wss端口在clawcloudrun的资费更低。)，然后开启`Public Access`，后面下拉框选择wss
- 进行程序配置。最简单的命令是直接填写`easytier-core`，部署之后就可以直接用了。下面是一些常用配置：
  - `--private-mode true/false`是否开启私有模式，开启后需要账号密码匹配才能连接该节点
  - `--network-name`私有模式的网络名称
  - `--network-secret`私有模式的网络密码
  - `--hostname`在其他设备显示的该节点的名称
  - `--p2p-only`仅作为p2p打洞节点
  自用可以按照下面的模板填

```bash
easytier-core --hostname <主机名> --private-mode true --network-name <私有网络名称> --network-secret <私有网络密码> --p2p-only
```

  ![详细设置](https://img-bucket.303302.xyz/2026/04/20260419114935097.png)

- 设置完成之后回到页面顶部点击右上角`Deploy Application`即可
- 等待部署完成之后，显示的Public Address就是用来连接的地址 ![连接地址](https://img-bucket.303302.xyz/2026/04/20260419122510613.png)

## 优缺点

### 优点

- 完全免费

### 缺点

- clawcloudrun需要github注册满180天才能白嫖
- 政策修改之后需要每个月登录web控制台保活，否则容器会被暂停运行。不过有github自动保活脚本

# 内网穿透

因为easytier是一款去中心化的组网软件，因此可以从任意一个节点接入网络。只需要在自己常开的设备上（例如nas，软路由）运行easytier并安装内网穿透软件，把tcp,udp监听的端口穿透到公网即可作为节点。安装内网穿透软件之后，指定内网地址和端口分别为127.0.0.1(或者localhost)和11010(easytier默认监听的tcp端口，如指定其他端口请自行修改)，用内网穿透服务商提供的域名+端口访问即可。步骤较简单不详细说明

# cloudflare tunnel穿透

> 嗨嗨嗨又是我们的赛博大善人cloudflare
> cloudflare恩情还不完

其实这种方法也是一种内网穿透，但是和普通的frp不同，tunnel穿透利用的是wss协议通过https协议握手实现的。在操作下面步骤之前需要在安装cloudflared的设备上先运行easytier

## 1.创建一个tunnel并连接

这块我前面的文章讲过，这里不再赘述

## 2.创建已发布的应用程序

- 主机名和域随意填写，能记住就行
- 类型选择HTTP，url填写localhost:11011(easytier的ws协议默认监听的端口，如果修改过请自行修改)
- 点击保存![创建隧道](https://img-bucket.303302.xyz/2026/04/20260419125517014.png)

## 3.连接

在easytier里的服务器栏填写`wss://域名:443`即可进行连接。例如图中我要填写的就是`wss://et.303302.xyz:443`