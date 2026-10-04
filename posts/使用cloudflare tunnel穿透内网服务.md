---
title: 使用cloudflare tunnel穿透内网服务
date: 2026-03-22
updated: 2026-04-19
category: 技术
tags:
  - 域名
  - Cloudflare
  - 内网穿透
  - Zero Trust
excerpt: 本文介绍了利用 Cloudflare Tunnel 将内网服务穿透至公网的方法。主要步骤包括在官网开启 Zero Trust、创建连接器、安装
  cloudflared 并配置隧道。该工具免费且支持自动申请证书，非常适合 HTTP
  服务穿透。尽管存在国内节点少、访问速度慢的缺点，但因其便捷性仍是一个不错的选择。
draft: false
---
# 引言
国内环境大部分人都没有公网ip，在这种情况下，想要把内网的服务穿透到公网就需要使用内网穿透服务。cloudflare tunnel可以很方便地穿透内网的http服务，并且完全免费，是一个很好的选择

# [视频教程](https://www.bilibili.com/BV1nDA3zfEvV/)


# 启用Zero Trust
来到[cloudflare官网](https://dash.cloudflare.com/)，点击左侧列表的Zero Trust
![点击Zero Trust](https://img-bucket.303302.xyz/2026/03/20260322233907004.png)
继续点击get started
![点击getstart](https://img-bucket.303302.xyz/2026/03/20260322234431596.png)
等待加载完成，会提示输入团队名称，这里可以随意填写，填写完成之后点击下一步
![](https://img-bucket.303302.xyz/2026/03/20260323000010530.png)
选择免费订阅
![](https://img-bucket.303302.xyz/2026/03/20260323000142237.png)
提示选择付款方式，不用管，直接回到[cloudflare首页](https://dash.cloudflare.com/)，重新进入Zero Trust
![](https://img-bucket.303302.xyz/2026/03/20260323000303693.png)
可以看到等待加载结束之后直接进入了Zero Trust页面
![](https://img-bucket.303302.xyz/2026/03/20260323000437665.png)


# 创建连接器
在Zero Trust页面，点击左侧的网络选项打开下拉菜单，选择连接器
![选择连接器](https://img-bucket.303302.xyz/2026/03/20260323001400480.png)
点击添加隧道
![添加隧道|697](https://img-bucket.303302.xyz/2026/03/20260323001506880.png)
选择cloudflared进行创建，然后随便输入一个自己喜欢的名称进行命名，点击保存隧道
![选择cloudflared](https://img-bucket.303302.xyz/2026/03/20260323001651149.png)
会出现以下配置界面。以windows为例，按照图中的步骤从上到下执行
![安装cloudflared并连接](https://img-bucket.303302.xyz/2026/03/20260323002305434.png)
执行完成之后能在下方的连接器框内看到出现了一台设备，点击下一步

# 连接内网服务
点击下一步之后可以看到如下界面。子域名的填写和根域的选择就不说了。看下方服务的的类型，选择http(如果是https就选https，不过内网服务基本不会有https协议的服务)。URL要填写安装cloudflared的设备可以访问的到的地址，可以是本机的，内网其他设备的，也可以是公网上可以访问到的
![创建一个应用](https://img-bucket.303302.xyz/2026/03/20260323003019621.png)
点击完成设置，隧道就创建好了
# 验证配置
创建好之后会跳转到这个页面，点击隧道名称可以查看隧道的详情
![查看详情](https://img-bucket.303302.xyz/2026/03/20260323003508635.png)
点击已发布的应用程序路由
![点击已发布的应用程序路由](https://img-bucket.303302.xyz/2026/03/20260323003804841.png)
下图是这个页面各个内容表示的含义，点击添加已发布应用程序路由可以继续穿透内网的其他服务
![各个元素含义](https://img-bucket.303302.xyz/2026/03/20260323004104596.png)
分别访问域名与内网地址可以进行测试

# 总结
cloudflare tunnel把内网服务进行加密之后映射到子域名的443端口，并且会自动申请证书，对于http流量的穿透来说非常方便好用。虽然tunnel还支持其他协议流量的穿透，但是大部分都需要服务端与客户端都安装cloudflared服务才能进行访问。因此cloudflare tunnel最广泛的应用场景还是穿透内网的http流量到公网。但是tunnel也有缺点，没有国内节点，访问速度较慢，延迟较高，体现在用户身上就是网页打开速度较慢。即便如此，我个人还是比较喜欢用tunnel来对http流量进行穿透的