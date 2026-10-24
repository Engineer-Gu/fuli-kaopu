// 腾讯元宝搜索（WSA）接入封装
// 接口：POST https://api.wsa.cloud.tencent.com/SearchPro
// 鉴权：Authorization: Bearer <API_KEY>
// 参考：https://cloud.tencent.cn/document/product/1806/121812

export type YuanbaoResult = {
  title: string
  url: string
  passage: string
  content: string
  date: string
  score: number
  // 网站名称（元宝返回，部分不知名站点可能为空）
  site: string
}

export type YuanbaoSearchOptions = {
  cnt?: number // 返回条数：只能是 10/20/30/40/50
  freshness?: string // 时效：d[N] / m[N] / y[N]
  site?: string // 站点过滤
}

const ENDPOINT = 'https://api.wsa.cloud.tencent.com/SearchPro'
// 单次搜索请求超时（毫秒），避免外部 API 无响应时阻塞整个调度流程
const REQUEST_TIMEOUT_MS = 15000

// 从 URL 提取站点域名（去掉 www 前缀）
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// 调用元宝搜索，返回解析后的结果数组
export async function searchYuanbao(apiKey: string, query: string, options: YuanbaoSearchOptions = {}): Promise<YuanbaoResult[]> {
  if (!apiKey) throw new Error('未配置元宝搜索 API KEY')
  // Cnt 只能是 10/20/30/40/50 中的值，默认 10
  const body: Record<string, string | number> = { Query: query }
  if (options.cnt) body.Cnt = options.cnt
  if (options.freshness) body.Freshness = options.freshness
  if (options.site) body.Site = options.site

  // 设置超时，避免外部 API 无响应导致调用方永久阻塞
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`元宝搜索超时（${REQUEST_TIMEOUT_MS / 1000} 秒无响应）`)
    }
    throw new Error(`元宝搜索网络错误：${error instanceof Error ? error.message : '未知错误'}`)
  }
  clearTimeout(timer)

  if (!res.ok) throw new Error(`元宝搜索请求失败：HTTP ${res.status}`)

  const data = (await res.json()) as { Response?: { Pages?: string[]; Error?: { Code?: string; Message?: string } } }
  // 业务错误（如参数非法）也通过 HTTP 200 返回，需显式识别
  if (data.Response?.Error) {
    throw new Error(`元宝搜索业务错误：${data.Response.Error.Message || data.Response.Error.Code}`)
  }
  const pages = data.Response?.Pages ?? []
  const results: YuanbaoResult[] = []

  for (const page of pages) {
    try {
      const o = JSON.parse(page) as Record<string, unknown>
      results.push({
        title: String(o.title ?? '').trim(),
        url: String(o.url ?? '').trim(),
        passage: String(o.passage ?? '').trim(),
        content: String(o.content ?? '').trim(),
        date: String(o.date ?? '').trim(),
        score: typeof o.score === 'number' ? o.score : 0,
        site: String(o.site ?? '').trim(),
      })
    } catch {
      // 忽略无法解析的条目
    }
  }
  return results
}
