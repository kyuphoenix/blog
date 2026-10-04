---
title: cloudflare临时邮箱搭建
date: 2026-07-24
updated: 2026-07-24
category: 技术
tags:
  - 域名
  - Cloudflare
  - 电子邮件
excerpt: 本教程介绍如何利用 Cloudflare 邮件路由、D1 数据库和 KV 命名空间，配合 Worker 部署免费临时邮箱。主要步骤包括：创建
  D1 数据库并导入 SQL，创建 KV 命名空间，配置 Worker 及其环境变量（如
  JWT_SECRET、ADMIN_PASSWORDS），设置自定义域名和邮件路由，最后部署前端页面。
draft: false
---
# 前言
有了域名之后，配置自己的邮箱也是值得折腾的一环。这个项目利用cloudflare的电子邮件路由功能把接收到的邮件转发到worker，实现了临时邮箱的功能，并且只使用了d1和kv，没有使用r2储存桶，无需绑卡

本教程参考linuxdo论坛内的教程编写而成，原文地址：[https://linux.do/t/topic/1666961](https://linux.do/t/topic/1666961)

# 开始前的准备

## 1.需要有一个托管在cloudflare的域名

## 2.cloudflare_temp_email 项目地址

### [GitHub - dreamhunter2333/cloudflare_temp_email: CloudFlare free temp domain email 免费收发 临时域名邮箱 支持附件 IMAP SMTP TelegramBot](https://github.com/dreamhunter2333/cloudflare_temp_email)


项目原文档：[临时邮箱文档](https://temp-mail-docs.awsl.uk/zh/)

# 在Cloudflare上部署

## 1.创建D1数据库

### 名称自己随便起个就可以
![](https://img-bucket.303302.xyz/2026/07/20260724181730685.png)
![](https://img-bucket.303302.xyz/2026/07/20260724181952994.png)


### 打开项目的 `db/schema.sql` 文件复制并复制

链接：[https://github.com/dreamhunter2333/cloudflare_temp_email/blob/main/db/schema.sql](https://github.com/dreamhunter2333/cloudflare_temp_email/blob/main/db/schema.sql)


从Github复制过来后，粘贴到d1控制台输入框内，点击`执行`
![](https://img-bucket.303302.xyz/2026/07/20260724182233050.png)

### 输出类似下面内容就可以了
![](https://img-bucket.303302.xyz/2026/07/20260724182357395.png)

### 回到概述刷新一下，如果表数量是10就代表成功
![](https://img-bucket.303302.xyz/2026/07/20260724182539506.png)

## 2.创建KV命名空间

### 也是随便起一个名字，点击创建
![](https://img-bucket.303302.xyz/2026/07/20260724182748294.png)
![](https://img-bucket.303302.xyz/2026/07/20260724182918564.png)

## 3.创建 Worker，部署临时邮箱后端

### 新建一个worker，选择`从 hello world! 开始`，名字随意
![](https://img-bucket.303302.xyz/2026/07/20260724183316101.png)
![](https://img-bucket.303302.xyz/2026/07/20260724185434712.png)
![](https://img-bucket.303302.xyz/2026/07/20260724185644851.png)

### 绑定DB数据库和KV缓存
![](https://img-bucket.303302.xyz/2026/07/20260724185822935.png)
#### 绑定d1

![](https://img-bucket.303302.xyz/2026/07/20260724190022933.png)
![](https://img-bucket.303302.xyz/2026/07/20260724190326397.png)
#### 绑定KV
![](https://img-bucket.303302.xyz/2026/07/20260724190622293.png)
![](https://img-bucket.303302.xyz/2026/07/20260724190813533.png)

### 部署代码
#### 配置兼容性标志
配置兼容性标志为`nodejs_compat`
```
nodejs_compat
```
![](https://img-bucket.303302.xyz/2026/07/20260724191147629.png)
![](https://img-bucket.303302.xyz/2026/07/20260724191508433.png)
#### 部署代码文件
前往项目releases下载代码文件
[https://github.com/dreamhunter2333/cloudflare_temp_email/releases/latest](https://github.com/dreamhunter2333/cloudflare_temp_email/releases/latest)
![](https://img-bucket.303302.xyz/2026/07/20260724191935197.png)
编辑worker
![](https://img-bucket.303302.xyz/2026/07/20260724192033302.png)
![](https://img-bucket.303302.xyz/2026/07/20260724192655502.png)

### 配置变量参数
进入下图页面开始配置变量参数
![](https://img-bucket.303302.xyz/2026/07/20260724192944587.png)

#### 下面是一些主要变量名称与格式，请全部配置
#### DOMAINS

参数类型：JSON

单个域名示例 **推荐**

```json
[     
	"example【这只是示例记得改成你自己的域名】.com"
]
```

多个域名示例

```json
[
	"awsl.uk",
    "example.com"
]
```

解释：临时邮箱域名列表，比如我只有一个，我就填一个就行，多个就以JSON数组的方式添多个

#### DEFAULT_DOMAINS

参数类型：JSON

留空示例（未登录用户什么都没得用）**推荐**

```json
[]
```

给一个域名（未登录用户也可以以这个域名创建邮箱地址）

```json
[
	"你的域名.com"
]
```

解释：直接留空，未登录的用户或者无角色的用户可用的域名列表，直接为空就行，如果你想给未登录的用户有域名用的话，就配置域名

#### DISABLE_ANONYMOUS_USER_CREATE_EMAIL

参数类型：文本

```text
true
```

解释：设为 `true` 后，未登录的匿名用户无法创建邮箱，必须登录才能创建

#### JWT_SECRET

参数类型：文本

在线生成一个：[https://www.librechat.ai/toolkit/creds_generator](https://www.librechat.ai/toolkit/creds_generator)
![](https://img-bucket.303302.xyz/2026/07/20260724194014705.png)

解释：JWT签名密钥，用于生成登录凭证和鉴权

#### ADMIN_PASSWORDS

参数类型：JSON

可以多个也可以单个

```json
[
	"mypassword123"
]
```

```json
[
    "mypassword123",
	"mypassword456"
]
```

解释：Admin管理后台的登录密码，不配置的话无法登录后台管理

#### ENABLE_USER_CREATE_EMAIL

参数类型：文本

```text
true
```

解释：是否允许用户创建邮箱地址，不配置默认不允许，两个值`true`、`false`填`true`就行

#### ENABLE_USER_DELETE_EMAIL

参数类型：文本

```text
false
```

解释：是否允许用户删除邮件消息

#### USER_ROLES

参数类型：JSON

举例，例如我想让vip使用`xxx.love`，admin使用`aaa.love`，这样就可以隔离不同的角色用不同的域名了

```json
[
    {
        "domains": [
            "xxx.love"
        ],
        "prefix": "",
        "role": "vip"
    },
    {
        "domains": [
            "aaa.love"
        ],
        "prefix": "",
        "role": "admin"
    }
]
```
解释：配置用户的角色，及角色可以使用的域名列表

#### ADMIN_USER_ROLE

参数类型；文本

```text
admin
```

解释：可访问`admin`管理后台的角色名，也就是说用户被赋予这个角色名后，登录就有了管理后台的权限

#### ENABLE_AUTO_REPLY

参数类型：文本

```
false
```

解释：否允许自动回复邮件，这个直接false就行

>请按上面给的参数配置好！

### 配置自定义域
>worker.dev后缀在大陆无法访问，需要配置自定义域名

![](https://img-bucket.303302.xyz/2026/07/20260724195256679.png)
填入自己的域名，例如我填的`mail-api.a-o.cc.cd`
![](https://img-bucket.303302.xyz/2026/07/20260724195542129.png)
### 配置域名电子路由
![](https://img-bucket.303302.xyz/2026/07/20260724200023005.png)
选择接入临时邮箱的域名并激活
![](https://img-bucket.303302.xyz/2026/07/20260724200611661.png)
修改catch all规则
![](https://img-bucket.303302.xyz/2026/07/20260724201045805.png)
![](https://img-bucket.303302.xyz/2026/07/20260724201339247.png)

## 4.部署前端页面
### 获取前端页面资源

生成前端页面代码地址：[Cloudflare Pages 前端 | 临时邮箱文档](https://temp-mail-docs.awsl.uk/zh/guide/ui/pages)

>在图中所示输入框填入worker后端的自定义域名
>例如我的自定义域名是mail-api.a-o.cc.cd，这里要填https://mail-api.a-o.cc.cd

![](https://img-bucket.303302.xyz/2026/07/20260724202026010.png)
点击生成之后，生成按钮右侧会出现下载按钮，点击下载即可。

### 部署前端
进入创建worker页面
![](https://img-bucket.303302.xyz/2026/07/20260724202709652.png)
这里选择上方的直接上传，或者下方的使用pages，再上传资源，效果是一样的，按照自己喜好选择，名称随意填写，也可以设置自定义域名
>我个人倾向于使用pages部署，用worker部署遇到了一些奇怪的问题


# 使用邮箱

## 管理员登录
连续点击5下左上角的图标输入管理员密码并确认，进入管理员后台
![](https://img-bucket.303302.xyz/2026/07/20260724215719371.png)
#### 检查一下数据库配置
进入下图路径，虽然创建数据库的时候初始化过，但是这里仍然可能会显示需要初始化，点击一下初始化即可。下图是点击过的状态
![](https://img-bucket.303302.xyz/2026/07/20260724220229462.png)

## 创建用户或者邮箱
### 创建用户
下图路径可以在管理员面板创建用户
![](https://img-bucket.303302.xyz/2026/07/20260724221113586.png)

### 创建邮箱
#### 进入下图路径可以通过管理员面板直接创建邮箱
![](https://img-bucket.303302.xyz/2026/07/20260724220822073.png)

#### 通过用户创建邮箱
用户登录之后进入下图路径可以创建邮箱
![](https://img-bucket.303302.xyz/2026/07/20260724221438993.png)