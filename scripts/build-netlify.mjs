import * as esbuild from 'esbuild'
import { cpSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

console.log('🏗️  正在构建 Netlify 产物 (Edge Functions)...')

// 1. 生成文章清单
console.log('📑 正在生成文章清单 (gen:manifest)...')
try {
  execSync('node scripts/gen-manifest.mjs', { stdio: 'inherit' })
} catch (e) {
  console.warn(`⚠️ 生成文章清单失败: ${e.message}`)
}

// 2. 编译生产级静态 Tailwind CSS (AOT)
console.log('🎨 正在编译生产级静态 Tailwind CSS (AOT)...')
try {
  execSync('npx @tailwindcss/cli -i src/tailwind.css -o public/css/tailwind.css --minify', { stdio: 'inherit' })
  console.log('✓ 静态 Tailwind CSS 编译完成: public/css/tailwind.css')
} catch (e) {
  console.warn(`⚠️ 编译 Tailwind CSS 失败: ${e.message}`)
}

// 3. 编译客户端页面无缝切换脚本 (Swup)
try {
  execSync('node scripts/build-client.mjs', { stdio: 'inherit' })
} catch (e) {
  console.warn(`⚠️ 编译 Swup 脚本失败: ${e.message}`)
}

// 4. 确保 netlify/edge-functions 目录存在
const edgeFunctionsDir = resolve(process.cwd(), 'netlify', 'edge-functions')
if (!existsSync(edgeFunctionsDir)) {
  mkdirSync(edgeFunctionsDir, { recursive: true })
}

// 如果存在旧的 server.ts，移除以避免与打包后的 server.js 产生同名冲突
const oldServerTs = resolve(edgeFunctionsDir, 'server.ts')
if (existsSync(oldServerTs)) {
  try {
    rmSync(oldServerTs)
    console.log('✓ 已清理旧的未打包 server.ts 源码')
  } catch {}
}

// 5. 使用 esbuild 全量打包 Edge Function (包含 Hono、页面、组件与全部 npm 依赖为独立单文件)
console.log('📦 正在使用 esbuild 全量打包 Netlify Edge Function...')
await esbuild.build({
  stdin: {
    contents: `
      import app from './src/index.ts';

      export default async function (request, context) {
        const url = new URL(request.url);
        // 静态资源文件优先尝试从 Netlify 部署的静态 CDN 资产命中
        if (
          url.pathname.startsWith('/js/') ||
          url.pathname.startsWith('/css/') ||
          url.pathname.startsWith('/images/') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.xsl') ||
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.webp')
        ) {
          try {
            const staticRes = await context.next();
            if (staticRes && staticRes.status < 400) {
              return staticRes;
            }
          } catch {}
        }

        // 静态未命中时（如 Pages CMS 新上传图片或 SSR 页面请求），转由 Hono 边缘服务处理
        const env = typeof Deno !== 'undefined'
          ? Deno.env.toObject()
          : (typeof process !== 'undefined' ? process.env : {});

        return app.fetch(request, env, context);
      }
    `,
    resolveDir: process.cwd(),
    sourcefile: 'netlify-edge-entry.js',
  },
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  outfile: resolve(edgeFunctionsDir, 'server.js'),
  external: ['pg'],
})

console.log('✓ Netlify Edge Function 代码已成功打包为独立单文件: netlify/edge-functions/server.js')
console.log('🎉 Netlify 构建完成！')
