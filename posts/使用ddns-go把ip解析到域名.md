---
title: 使用ddns-go把ip解析到域名
date: 2026-03-04
updated: 2026-03-20
category: 技术
tags:
  - Cloudflare
  - ddns-go
  - IPv6
excerpt: 本文指导如何将公网 IPv6 地址解析到 Cloudflare 域名。首先需确认拥有公网 IPv6，随后下载并安装 ddns-go
  服务。在管理后台配置Cloudflare API 令牌，取消 IPv4 选项，选择网卡获取 IPv6
  地址并设置域名。保存配置后，通过在线工具测试解析是否成功。
draft: false
---
# 引言
之前教大家把[域名托管到了cloudflare](/posts/托管域名到cloudflare/)，这次教大家使用自己的域名。使用域名的方法很多，这篇文章讲如何把ip地址解析到域名（即ddns)

鉴于大部分人都没有公网ipv4，这篇文章主要讲如何解析ipv6地址到域名。

视频教程
<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=116171449960067&bvid=BV145PqzVEWE&cid=36454600547&p=1&autoplay=0" 
		scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" 
        loading="lazy"
        style="width: 100%; height: 500px;"></iframe>

# 确认自己是否有ipv6

先关闭所有代理工具，用浏览器访问[ipw.cn](https://ipw.cn/)，如果显示ipv6访问优先，则说明有公网ipv6地址。或者可以在光猫或者路由器的拨号页面看有没有获取到2409，2408，240e开头的ipv6地址，如果有则说明有公网ipv6地址。有公网ipv6地址的可以继续看下面的内容。如果显示没有ipv6就可以关闭这篇文章了。

# 下载并安装工具

这篇文章用到的工具是ddns-go。先打开[ddns-go的github仓库](https://github.com/jeessy2/ddns-go)，点击右下方的releases![点击releases](https://img-bucket.303302.xyz/2026/03/20260304180104238.png)

选择符合自己系统和cpu架构的文件下载（现在的windows电脑基本上都是x64架构，选择windows_x86_64）![](https://img-bucket.303302.xyz/2026/03/20260304180325099.png)

下载解压之后会有四个文件，我们先打开README.md，这是使用说明![](https://img-bucket.303302.xyz/2026/03/20260304180652501.png)

在README.md我们可以看到如下内容，找到windows的安装命令`.\ddns-go.exe -s install`
![](https://img-bucket.303302.xyz/2026/03/20260304180928815.png)

然后以管理员身份运行cmd或者powershell，进入ddns-go.exe所在的路径，输入
`.\ddns-go.exe -s install`
此时ddns-go服务就安装成功了
# 配置服务
浏览器访问[localhost:9876](http://localhost:9876/)或者[127.0.0.1:9876](http://127.0.0.1:9876/)，来到管理后台![](https://img-bucket.303302.xyz/2026/03/20260304215729116.png)
输入自己想要使用的用户名和密码（之后登录后台都要使用第一次填写的账号和密码，不要忘记了），点击登录并配置为管理员账号。

进入后台之后，先选择服务商为cloudflare并取消勾选ipv4![](https://img-bucket.303302.xyz/2026/03/20260304220116408.png)

选择服务商为cloudflare之后会要求填入token，这里我们要去cloudflare创建一个账户API令牌![](https://img-bucket.303302.xyz/2026/03/20260304220359588.png)

来到[cloudflare](https://dash.cloudflare.com/)，先点击管理账户，再点击账户API令牌，来到创建账户API页面![](https://img-bucket.303302.xyz/2026/03/20260304220823275.png)

先点击创建令牌，再选择模板为编辑区域DNS![](https://img-bucket.303302.xyz/2026/03/20260304221029404.png)![](https://img-bucket.303302.xyz/2026/03/20260304221134582.png)

其它选项不需要修改，在区域资源最左侧选择自己想要使用的域名，然后点击继续![](https://img-bucket.303302.xyz/2026/03/20260304221352978.png)

点击创建令牌（这里我下方显示红色是创建失败，原因是我注册账号的时候忘记点击验证邮件了，只需要去邮箱里找到注册账号的时候收到的验证邮件，点击验证即可，然后回来重新创建就可以了）![](https://img-bucket.303302.xyz/2026/03/20260304221611901.png)

创建成功之后会显示如下内容。我们需要的是框框内的API令牌，点击复制。然后回到ddns-go，粘贴到token框内。这个api令牌只会在这里显示一次，如果忘记了要重新创建才能使用。![](https://img-bucket.303302.xyz/2026/03/20260304222258491.png)![](https://img-bucket.303302.xyz/2026/03/20260304222435067.png)

往下划来到IPV6框。选择通过网卡获取。可以看到获取到了两条或以上的ipv6地址。通过在匹配正则表达式填写@1或者@2可以选择解析第一个地址或者第二个地址。（两个地址实际上都可以使用，只是有一个是临时ipv6，变化会比较快，访问网站使用的都是临时ipv6用来保护真实ipv6）![](https://img-bucket.303302.xyz/2026/03/20260304222702686.png)
最下面的DOMAINS填写的就是我们要使用的域名。例如：我要把我的ipv6解析到bot.aabbccdd.dpdns.org，我托管在cloudflare的域名是aabbccdd.dpdns.org，那么这里就填写bot:aabbccdd.dpdns.org。然后通过bot.aabbccdd.dpdns.org就可以访问到你解析到这个域名的ipv6地址。

填写完信息之后要记得划到页面最下方点击保存，否则配置不会生效。

保存之后配置就完成了


# 测试
可以来到itdog的[在线ping ipv6版](https://www.itdog.cn/ping_ipv6/)，输入自己解析使用的域名，例如我是bot.aabbccdd.dpdns.org，点击单次测试。

测试结束之后往下划一点，如果能看到解析出了自己解析到域名的ipv6地址，就代表配置成功了![](https://img-bucket.303302.xyz/2026/03/20260304223909861.png)
上面的延迟结果大部分人因为防火墙原因都会是全红，只要dns解析没问题就没关系
# 关于ipv4
ipv4同样可以通过这个方法把地址解析到域名（前提是有公网ipv4，不然解析了也没用），但是如果安装在电脑上就要通过接口获取ipv4地址，安装在路由器上可以通过网卡获取（如果是路由器拨号）。同时如果要通过公网ipv4访问除拨号设备以外的内网设备上的服务，要在拨号设备上设置端口转发。