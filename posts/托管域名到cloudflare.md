---
title: 托管域名到cloudflare
date: 2026-02-28
updated: 2026-03-20
category: 技术
tags:
  - Cloudflare
  - 域名
excerpt: 本文介绍如何将域名托管至 Cloudflare。首先注册账号并切换语言为中文，然后添加 DigitalPlat 或 DNSHE
  域名，选择免费计划并获取CF 分配的名称服务器。接着在域名管理页面修改名称服务器，最后在 CF 确认。等待 DNS
  传播后，状态显示为“活动”即表示托管成功。
draft: false
---
# 引言

之前教大家获取了自己的域名(详见[获取自己的域名](/posts/获取自己的域名/))，现在我来教大家把域名托管到cloudflare，方便以后使用自己的域名，以下简称cf

这是[视频教程](https://www.bilibili.com/video/BV1p6AXz2ErB/)



# 注册一个cf账号

1. 我们先来到[cf官网](https://dash.cloudflare.com/)注册一个账号(有账号的可以直接登录)
  ![点击注册](https://img-bucket.303302.xyz/2026/02/20260228133505832.png)

   输一个能用邮箱注册就行了，点击注册之后记得去邮箱点击确认邮件![注册账号|667](https://img-bucket.303302.xyz/2026/02/20260228133640933.png)

   注册完账号来到这个界面点击跳过![点击跳过](https://img-bucket.303302.xyz/2026/02/20260228134003571.png)
2. 切换语言为中文

  点击跳过之后，来到仪表盘主界面。此时语言默认是英文，跟着下面的图片设置语言为中文![设置中文1](https://img-bucket.303302.xyz/2026/02/20260228134331625.png)![设置中文2](https://img-bucket.303302.xyz/2026/02/20260228134710439.png)![设置中文3|667](https://img-bucket.303302.xyz/2026/02/20260228134905829.png)

这样账号就注册好了，可以开始托管域名了

# 托管DigitalPlat域名

我们去[DigitalPlat](https://dash.domain.digitalplat.org/)复制自己的域名填入这里并点击继续![填写域名](https://img-bucket.303302.xyz/2026/02/20260228135418749.png)![点击继续](https://img-bucket.303302.xyz/2026/02/20260228142153102.png)

选择免费计划![选择免费计划](https://img-bucket.303302.xyz/2026/02/20260228142428412.png)

点击继续前往激活![点击继续前往激活](https://img-bucket.303302.xyz/2026/02/20260228142829272.png)![](https://img-bucket.303302.xyz/2026/02/20260228143115920.png)

然后我们会来到这个页面。这里cf给我们分配了两个name server，我们先复制下来![](https://img-bucket.303302.xyz/2026/02/20260228143610593.png)

然后我们来到[DigitalPlat域名管理页面](https://dash.domain.digitalplat.org/panel/main?page=%2Fpanel%2Fdomains)选择自己之前填在cf的域名![选择域名](https://img-bucket.303302.xyz/2026/02/20260228144152185.png)

进入域名管理页面之后可以看到name server1和name server2，如果是跟着我的教程注册的这里应该是随便填的用来占位的。我们把原来的name server删掉，把从cf上复制的两个name server填进去，点击更新![修改ns](https://img-bucket.303302.xyz/2026/02/20260228144516905.png)

然后回到cf，点击我已更新名称服务器![点击我已更新名称服务器](https://img-bucket.303302.xyz/2026/02/20260228145146034.png)

显示这个界面就可以了，我们点击返回去托管其他域名![点击返回](https://img-bucket.303302.xyz/2026/02/20260228145433320.png)

回到主页之后就可以继续添加域名了![](https://img-bucket.303302.xyz/2026/02/20260228145708104.png)
这里会显示名称服务器无效，不用担心，因为dns的传播需要一定的时间，过几分钟状态就会显示为活动，域名就托管成功了。

点击加入域之后的流程跟之前一样，不过是把域名换成了另一个

# 托管DNSHE域名

DNSHE域名托管的流程与DigitalPlat大致相同，只有修改name server部分不同，这里就只讲如何修改name server

来到[DNSHE域名管理页面](https://my.dnshe.com/index.php?m=domain_hub)，点击DNS服务器![点击DNS服务器](https://img-bucket.303302.xyz/2026/02/20260228150635448.png)

看到填写ns服务器的框，填入cf分配的两个name server，注意这里name server是每一行填一个。填写完成之后点击下方的一键替换![](https://img-bucket.303302.xyz/2026/02/20260228150856206.png)

然后回到cf点击我已更新名称服务器即可

# 托管完成

最后在主页看到所有域名都是活动状态就是托管成功了![](https://img-bucket.303302.xyz/2026/02/20260228151229583.png)