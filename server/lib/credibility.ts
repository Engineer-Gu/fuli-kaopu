// 来源可信度分级：为查证结果提供「来源是否可信」的判断依据
// 独立成模块，保持单一职责；只做确定性规则判断，不做模糊打分

export type SourceTier = 'official' | 'media' | 'community' | 'marketing' | 'unknown'

export type CredibilityResult = {
  tier: SourceTier
  label: string
  // 该来源是否值得作为「可信证据」采信
  trustworthy: boolean
  reason: string
}

// 官方 / 权威域名：平台官网、政府、银行、云厂商、主流媒体
const OFFICIAL_HOSTS = [
  'gov.cn',
  'tencent.com',
  'qq.com',
  'alipay.com',
  'alibabacloud.com',
  'aliyun.com',
  'cloud.tencent.com',
  'huaweicloud.com',
  'baidu.com',
  'jd.com',
  'meituan.com',
  'ele.me',
  '10010.com',
  'chinamobile.com',
  'chinatelecom.com.cn',
  '10086.cn',
  'icbc.com.cn',
  'ccb.com',
  'abchina.com',
  'boc.cn',
  'cmbchina.com',
  'unionpay.com',
  'apple.com.cn',
  'apple.com',
  'github.com',
  'cloudflare.com',
  'supabase.com',
  'oracle.com',
  'volcengine.com',
  'bailian.aliyun.com',
  'bigmodel.cn',
  'siliconflow.cn',
  'platform.deepseek.com',
  'deepseek.com',
  'beeimg.cn',
  'dnshe.com',
  'juejin.cn',
  'zsxq.com',
]

// 元宝返回的中文网站名匹配（部分站点 domain 未知但站点名已知）
const OFFICIAL_SITE_NAMES = ['阿里云', '华为云', '腾讯云', '美团', '支付宝', '京东', '中国移动', '中国联通', '中国电信', '苹果', 'Cloudflare', 'GitHub', '火山引擎']

// 主流媒体 / 门户：可信度较高，但非一手官方信息
const MEDIA_HOSTS = ['sohu.com', '163.com', 'sina.com.cn', 'ifeng.com', 'thepaper.cn', 'xinhuanet.com', 'people.com.cn', 'zhihu.com']

// 社区 / 论坛：有参考价值，但需进一步核对
const COMMUNITY_HOSTS = ['zhihu.com', 'bilibili.com', 'xiaohongshu.com', 'douban.com', 'csdn.net', 'juejin.cn', 'v2ex.com', 'tieba.baidu.com']

// 明显的营销 / 引导站：标题党、聚合导流、线报站
const MARKETING_MARKERS = ['xianbao', '线报', 'daohang', '导航', 'hongbao', '红包', 'huodong', 'quan', '券', 'fuli', '福利', 'maimai', '返利', 'fanli']

// 提取域名并去掉 www 前缀（与 yuanbao.ts 的 hostOf 保持一致）
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function hostMatches(host: string, list: string[]): boolean {
  const h = host.toLowerCase()
  return list.some((item) => {
    const i = item.toLowerCase()
    // 精确匹配，或作为子域名/主域名后缀匹配
    return h === i || h.endsWith(`.${i}`)
  })
}

// 判断单个来源是否属于营销 / 引导性质
function looksMarketing(host: string, title: string): boolean {
  const h = host.toLowerCase()
  const t = title.toLowerCase()
  return MARKETING_MARKERS.some((m) => h.includes(m) || t.includes(m))
}

// 对单条搜索来源做可信度分级
// site 为元宝返回的网站名，host 为从 url 提取的域名，两者结合判断
export function classifySource(host: string, title: string, site = ''): CredibilityResult {
  const siteName = site.trim()
  // 优先用元宝返回的网站名匹配官方（更准，如「阿里云」「华为云」）
  if (siteName && OFFICIAL_SITE_NAMES.some((n) => siteName.includes(n))) {
    return { tier: 'official', label: '官方/权威', trustworthy: true, reason: '来自官方或权威平台' }
  }
  if (!host) {
    return { tier: 'unknown', label: '来源未知', trustworthy: false, reason: '无法识别来源域名' }
  }
  if (hostMatches(host, OFFICIAL_HOSTS)) {
    return { tier: 'official', label: '官方/权威', trustworthy: true, reason: '来自官方或权威平台' }
  }
  if (looksMarketing(host, title)) {
    return { tier: 'marketing', label: '营销/导流', trustworthy: false, reason: '疑似营销导流或标题党站点' }
  }
  if (hostMatches(host, MEDIA_HOSTS)) {
    return { tier: 'media', label: '媒体/门户', trustworthy: true, reason: '主流媒体或门户，可信度较高' }
  }
  if (hostMatches(host, COMMUNITY_HOSTS)) {
    return { tier: 'community', label: '社区/论坛', trustworthy: false, reason: '社区内容，需进一步核对官方来源' }
  }
  return { tier: 'unknown', label: '待判断', trustworthy: false, reason: '来源性质待人工判断' }
}

// 汇总一批评分后给出「整体可信度」结论
// 判定逻辑：至少一条官方/权威来源 → 可信偏高；否则看可信来源占比，全部低可信 → 存疑
export function summarizeCredibility(items: Pick<CredibilityResult, 'tier' | 'trustworthy'>[]): { verdict: 'trust' | 'doubt' | 'unclear'; label: string; reason: string } {
  if (!items.length) {
    return { verdict: 'unclear', label: '无法判断', reason: '未检索到可用于核对的来源' }
  }
  const official = items.filter((i) => i.tier === 'official').length
  const trustworthy = items.filter((i) => i.trustworthy).length
  const ratio = trustworthy / items.length

  if (official > 0) {
    return { verdict: 'trust', label: '可信度较高', reason: `存在 ${official} 个官方/权威来源` }
  }
  if (ratio >= 0.5) {
    return { verdict: 'trust', label: '可信度中等', reason: `可信来源占比 ${Math.round(ratio * 100)}%` }
  }
  if (ratio > 0) {
    return { verdict: 'unclear', label: '存疑', reason: '以营销/导流来源为主，建议核对官方' }
  }
  return { verdict: 'doubt', label: '存疑', reason: '所有来源均为营销/导流或未知，无法确认真实性' }
}
