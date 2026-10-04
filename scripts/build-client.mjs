import * as esbuild from 'esbuild'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const outDir = resolve(process.cwd(), 'public/js')
mkdirSync(outDir, { recursive: true })

console.log('⚡ 正在编译客户端 Swup 页面无缝切换脚本...')
await esbuild.build({
  entryPoints: [resolve(process.cwd(), 'src/client.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  outfile: resolve(outDir, 'swup.js'),
})

console.log('✓ 客户端 Swup 脚本编译成功: public/js/swup.js')
