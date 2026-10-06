import * as esbuild from 'esbuild'
import { cpSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

console.log('🏗️  正在构建 Vercel Build Output API 产物...')

// 1. 生成文章清单
console.log('📑 正在生成文章清单 (gen:manifest)...')
try {
  execSync('node scripts/gen-manifest.mjs', { stdio: 'inherit' })
} catch (e) {
  console.warn(`⚠️ 生成文章清单失败: ${e.message}`)
}

// 1.5 编译生产级静态 Tailwind CSS (AOT)
try {
  execSync('node scripts/build-css.mjs', { stdio: 'inherit' })
} catch (e) {
  console.warn(`⚠️ 编译 Tailwind CSS 失败: ${e.message}`)
}

// 1.6 编译客户端页面无缝切换脚本 (Swup)
try {
  execSync('node scripts/build-client.mjs', { stdio: 'inherit' })
} catch (e) {
  console.warn(`⚠️ 编译 Swup 脚本失败: ${e.message}`)
}

// 2. 准备目录结构
const vercelDir = resolve(process.cwd(), '.vercel')
const outputDir = resolve(vercelDir, 'output')
const outputStaticDir = resolve(outputDir, 'static')
const outputFuncDir = resolve(outputDir, 'functions', 'index.func')

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true })
}
mkdirSync(outputStaticDir, { recursive: true })
mkdirSync(outputFuncDir, { recursive: true })

// 3. 拷贝 public/ 静态资源到 CDN 输出目录
const publicDir = resolve(process.cwd(), 'public')
if (existsSync(publicDir)) {
  cpSync(publicDir, outputStaticDir, { recursive: true })
  console.log('✓ 静态资源已同步至 .vercel/output/static')
}

// 4. 生成全局路由配置 (config.json)
writeFileSync(
  resolve(outputDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index' },
      ],
    },
    null,
    2
  )
)
console.log('✓ 已生成 .vercel/output/config.json 路由映射')

// 5. 生成 Serverless Function 运行时配置与 ESM 声明 (.vc-config.json & package.json)
writeFileSync(
  resolve(outputFuncDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
    },
    null,
    2
  )
)
writeFileSync(
  resolve(outputFuncDir, 'package.json'),
  JSON.stringify(
    {
      type: 'module',
    },
    null,
    2
  )
)
console.log('✓ 已生成 .vercel/output/functions/index.func/.vc-config.json 与 package.json (type: module)')

// 6. 使用 esbuild 全量打包 Hono 服务端代码 (包含全站 JSX、样式、路由与适配层)
console.log('📦 正在使用 esbuild 全量打包服务端代码...')
await esbuild.build({
  stdin: {
    contents: `
      import app from './src/index.js';
      import { getRequestListener } from '@hono/node-server';

      const nodeHandler = getRequestListener(app.fetch);

      export default function handler(req, res) {
        if (!res && req && typeof req.headers?.get === 'function') {
          return app.fetch(req);
        }
        return nodeHandler(req, res);
      }
      handler.fetch = (req, ...args) => app.fetch(req, ...args);
    `,
    resolveDir: process.cwd(),
    sourcefile: 'vercel-entry.js',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: resolve(outputFuncDir, 'index.js'),
  external: ['pg'],
})
cpSync(resolve(outputFuncDir, 'index.js'), resolve(outputFuncDir, 'index.mjs'))
console.log('✓ 服务端代码已成功打包为单文件: index.func/index.js (与 index.mjs)')
console.log('🎉 Vercel Build Output API 构建完成！')
