import app from '../../src/index'

export default async (request: Request, context: any) => {
  const url = new URL(request.url)
  // 如果是 /images/* 请求，优先尝试命中 Netlify 部署的静态资产
  if (url.pathname.startsWith('/images/')) {
    try {
      const staticRes = await context.next()
      if (staticRes && staticRes.status < 400) {
        return staticRes
      }
    } catch {
      // 忽略静态回退异常
    }
  }

  // 静态未命中时（如 Pages CMS 新上传图片），转由 Hono 边缘代理拉取与缓存
  // @ts-ignore
  const env = typeof Deno !== 'undefined' ? Deno.env.toObject() : (typeof process !== 'undefined' ? process.env : {})
  return app.fetch(request, env, context)
}
