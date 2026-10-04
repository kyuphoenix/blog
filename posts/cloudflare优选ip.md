---
title: cloudflare优选ip
date: 2026-04-12
updated: 2026-04-12
category: 技术
tags:
  - 域名
  - Cloudflare
excerpt: 本文介绍利用社区优选IP优化Cloudflare
  Worker和Tunnel访问速度的方法。首先需获取优选IP并添加CNAME记录。Worker优化需在设置中配置路由，再添加指向优选域名的CNAME记录。Tunnel优化需利用SaaS功能，在连接器创建规则，修改DNS记录指向优选域名，并添加TXT记录验证。操作完成后可有效降低延迟。
draft: false
---
# 前言
我们在cloudflare创建tunnel，worker，难免会因为延迟较高导致访问速度较慢。对cloudflare的ip进行优选可以使自己的域名解析到访问速度较快的ip，从而优化访问速度。

# 准备工作
- [cf.090227.xyz](https://cf.090227.xyz/)，是社区收集的cloudflare优选ip，内容类似下图![优选域名](https://img-bucket.303302.xyz/2026/04/20260411235630982.png)任意选择一个自己喜欢的复制
- 进入自己任意域名的dns记录页面，给自己的任意子域名添加一条cname记录，内容为刚刚复制的优选域名，然后关闭代理状态（即仅dns解析）。例如下图我给kyuhou.indevs.in添加了一条名称为cdn，内容为youxuan.cf.090227.xyz。后面要用到的时候就要用`cdn.kyuhou.indevs.in`![添加cname记录](https://img-bucket.303302.xyz/2026/04/20260412000106682.png)

# 优选Worker
>worker的优选还是很简单的
- 首先来到待优选的worker的设置页面，找到**域和路由**，点击添加之后选择**路由**，区域选择想要用来访问worker的主域名，路由填写`想要用来访问worker的域名/*`。例如下面图中，我想要用`https://blog.kyuhou.org`访问我的worker，那么区域就选择`kyuhou.org`，路由就填写`blog.kyuhou.org/*`![点击添加](https://img-bucket.303302.xyz/2026/04/20260412000924164.png)![填写路由](https://img-bucket.303302.xyz/2026/04/20260412001338248.png)
- 到这里worker的设置就完成了，然后要给域名添加解析。来到dns解析页面，给刚刚在worker添加路由规则的域名添加一条cname记录，内容为在准备工作阶段创建解析的域名，即自己的优选域名，然后**关闭代理状态**。我的优选域名就是**cdn.kyuhou.indevs.in**。以我在worker的设置为例，就在cname记录的名称里填blog，内容填**cdn.kyuhou.indevs.in**，关闭代理状态![添加cname记录](https://img-bucket.303302.xyz/2026/04/20260412002403904.png)
- 到这里worker的优选就完成了。下面是优选前后的延迟对比![优选前](https://img-bucket.303302.xyz/2026/04/20260412002748157.png)![优选后](https://img-bucket.303302.xyz/2026/04/20260412003352407.png)
# 优选Tunnel
>tunnel的优选需要用到自定义主机名这个功能，即SaaS。这个功能需要绑定支付方式才能使用。没有支付方式在网上看看能不能找到信用卡信息绑定，实在不行就只能放弃了
- 先进入连接器，给内网的同一个服务创建两条路由相同的规则。其中一条规则使用的域名的根域必须是在准备工作添加cname记录使用的根域，作为辅助域名。另一个域名随意。例如我自己的优选域名是`cdn.kyuhou.indevs.in`，其中一条规则的根域就必须是`kyuhou.indevs.in`![创建规则](https://img-bucket.303302.xyz/2026/04/20260412141031884.png)
- 然后进入另一个域名的dns记录页面。我用的另一个域名是`openlist.kyuhou.org`，就进入`kyuhou.org`域的dns记录页面。然后找到tunnel自动创建的记录进行编辑，把内容改为自己的优选域名，我改成`cdn.kyuhou.indevs.in`，然后关闭代理状态![修改dns记录](https://img-bucket.303302.xyz/2026/04/20260412141909065.png)
- 来到辅助域名的SaaS页面(SSL/TLS->自定义主机名)，先添加一个回退源来启用SaaS功能。回退源填写在cloudflare开启代理的子域(也可以直接填tunnel使用的域名)，不过必须是这个根域的子域。我的辅助域名是`openlist.kyuhou.indevs.in`，就进入`kyuhou.indevs.in`的SaaS界面。回退源可以直接填tunnel用的域名，我就直接填`openlist.kyuhou.indevs.in`。等待状态变成有效，如下图![添加回退源](https://img-bucket.303302.xyz/2026/04/20260412142607387.png)
- 然后点击`添加自定义主机名`，`自定义主机名`框填写想要用来访问的域名，我最终想用`openlist.kyuhou.org`访问，就填`openlist.kyuhou.org`。如果辅助域名和刚刚设置的回退源是同一个域名，下面的自定义源服务器可以选择默认。当然也可以像我一样选择自定义源服务器，然后输入自己的辅助域名。最后点击右下角的`添加自定义主机名`![设置自定义主机名](https://img-bucket.303302.xyz/2026/04/20260412143226406.png)
- 因为使用的是TXT验证，所以要给域名添加TXT记录。如图，cf会给出TXT记录的名称和值，复制粘贴即可。**要在用来访问的域名的dns记录里添加**![添加TXT记录](https://img-bucket.303302.xyz/2026/04/20260412143700177.png)![添加TXT记录](https://img-bucket.303302.xyz/2026/04/20260412144229559.png)后面还有一个用来验证并颁发证书的TXT记录，按照同样的方法操作即可
- 验证的时间可能会比较慢，像下图里，主机名状态显示有效就已经可以使用了，只不过还没有证书，浏览器访问会显示不安全。过一段时间等待证书状态变成有效就能用https访问了。![](https://img-bucket.303302.xyz/2026/04/20260412144637415.png)
- 优选前后延迟对比![优选前](https://img-bucket.303302.xyz/2026/04/20260412154943299.png)![优选后](https://img-bucket.303302.xyz/2026/04/20260412155127117.png)