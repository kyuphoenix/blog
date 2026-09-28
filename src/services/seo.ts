import { Bindings } from '../types/env'
import { blogConfig } from '../blog.config'

/**
 * 提交 URL 列表至 IndexNow 协议 (Bing, Yandex, Seznam, Naver 秒级抓取)
 */
export async function submitToIndexNow(
  baseUrl: string,
  key: string,
  urls: string[]
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const urlObj = new URL(baseUrl)
    const host = urlObj.host
    const keyLocation = `${urlObj.origin}/${key}.txt`

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Fuwari-Blog-IndexNow/1.0',
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: urls.slice(0, 10000), // IndexNow 单次最大 10,000 个 URL
      }),
    })

    if (response.ok || response.status === 202) {
      console.log(`[SEO] IndexNow push successful for ${urls.length} URLs (status: ${response.status})`)
      return { success: true, status: response.status }
    } else {
      const errText = await response.text()
      console.warn(`[SEO] IndexNow push responded with status ${response.status}: ${errText}`)
      return { success: false, status: response.status, error: errText }
    }
  } catch (err: any) {
    console.error('[SEO] IndexNow push request failed:', err)
    return { success: false, error: err?.message || String(err) }
  }
}

/**
 * 提交 URL 列表至百度站长资源平台主动推送接口
 */
export async function submitToBaidu(
  baseUrl: string,
  token: string,
  urls: string[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const urlObj = new URL(baseUrl)
    const site = urlObj.host
    const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'curl/7.12.1',
      },
      body: urls.join('\n'),
    })

    const result = (await response.json()) as any
    console.log(`[SEO] Baidu push response:`, result)
    return { success: response.ok, data: result }
  } catch (err: any) {
    console.error('[SEO] Baidu push request failed:', err)
    return { success: false, error: err?.message || String(err) }
  }
}

/**
 * 自动批量推送站点全部有效 URL 至搜索引擎
 */
export async function pushUrlsToSearchEngines(
  env: Bindings,
  urls: string[]
): Promise<{
  indexnow?: { success: boolean; status?: number; error?: string }
  baidu?: { success: boolean; data?: any; error?: string }
}> {
  const blogUrl = env.BLOG_URL
  if (!blogUrl || urls.length === 0) {
    return {}
  }

  const indexnowKey = env.INDEXNOW_KEY || blogConfig.seo?.indexnowKey
  const baiduToken = env.BAIDU_PUSH_TOKEN

  const results: {
    indexnow?: { success: boolean; status?: number; error?: string }
    baidu?: { success: boolean; data?: any; error?: string }
  } = {}

  const tasks: Promise<void>[] = []

  if (indexnowKey) {
    tasks.push(
      (async () => {
        results.indexnow = await submitToIndexNow(blogUrl, indexnowKey, urls)
      })()
    )
  }

  if (baiduToken) {
    tasks.push(
      (async () => {
        results.baidu = await submitToBaidu(blogUrl, baiduToken, urls)
      })()
    )
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }

  return results
}
