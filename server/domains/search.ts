import { z } from 'zod'
import { classifyActivity, type ActivityCategory } from '../../src/constants/activity-categories'
import { ACTIVITY_CATEGORY_TO_TYPE } from '../config/constants'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok } from '../lib/http'
import { classifySource, hostOf, summarizeCredibility } from '../lib/credibility'
import { searchYuanbao, type YuanbaoResult } from '../lib/yuanbao'

// 预设搜索词，覆盖各福利分类；搜索结果将作为「待审核」候选入库
const SEARCH_QUERIES: { query: string; category: string }[] = [
  { query: '云服务器免费试用 新用户 2026', category: '技术资源' },
  { query: '免费AI大模型 API tokens 领取', category: '技术资源' },
  { query: '话费充值 立减 优惠活动 2026', category: '话费充值' },
  { query: '外卖红包 满减券 领取 2026年10月', category: '外卖券' },
  { query: '支付宝 微信 银行立减金 活动', category: '平台福利' },
  { query: '大学生 学生优惠 免费 2026', category: '学生优惠' },
]

// 从元宝搜索结果中过滤出更像「福利活动」的条目（标题或摘要命中活动关键词）
const ACTIVITY_HINTS = ['免费', '试用', '优惠', '立减', '红包', '领取', '学生', '补贴', '送', '白嫖', '折扣', '券', '返现', '赠']

// 明显的 SEO 堆砌 / 标题党特征词
const JUNK_TITLE_MARKERS = ['领取入口', '攻略大全', '案例拆解', '隐藏红包', '免费送', '怎么领', '省钱攻略', '首选', '揭晓', '解析', '口令', '大全']

export function looksLikeActivity(r: YuanbaoResult): boolean {
  const text = `${r.title} ${r.passage}`
  if (!ACTIVITY_HINTS.some((h) => text.includes(h))) return false
  // 过滤 SEO 堆砌标题党：标题过长（>35 字）且命中营销堆砌词
  const junkHits = JUNK_TITLE_MARKERS.filter((w) => r.title.includes(w)).length
  if (r.title.length > 35 && junkHits >= 1) return false
  return true
}

export function toScore(r: YuanbaoResult): number {
  // 相关性 0~1 映射到 55~75 的可信度区间（搜索聚合内容默认偏「存疑」）
  return Math.min(75, 55 + Math.round(r.score * 20))
}

export function toDescription(r: YuanbaoResult): string {
  const base = r.passage || r.content || '来自全网搜索，待核验'
  return base.length > 300 ? `${base.slice(0, 300)}…` : base
}

// 将单条元宝搜索结果写入 activities 表（status=pending 待审核）
async function persistActivity(env: Env, r: YuanbaoResult, category: ActivityCategory, now: string): Promise<void> {
  const id = `act-search-${crypto.randomUUID()}`
  const type = ACTIVITY_CATEGORY_TO_TYPE[category]
  const score = toScore(r)
  const host = hostOf(r.url)
  await env.DB.prepare(
    `INSERT INTO activities (id, title, category, type, hot, description, source, deadline, verify, score, conditions, doubts, link, value, entry, status, created_at)
     VALUES (?1,?2,?3,?4,0,?5,?6,?7,'doubt',?8,?9,?10,?11,?12,?13,'pending',?14)`,
  )
    .bind(
      id,
      r.title,
      category,
      type,
      toDescription(r),
      host || '全网搜索',
      '待确认',
      score,
      JSON.stringify(['来自全网搜索，待核验']),
      JSON.stringify(['元宝搜索聚合结果，未经人工核验']),
      r.url,
      '待核验',
      host ? `搜索来源：${host}` : '搜索来源',
      now,
    )
    .run()
}

// 用一组关键词做元宝搜索并导入活动，直到达到目标数量或关键词耗尽
// 每个关键词检索词 = `${kw} 活动 福利`，结果按 link 去重、过滤无效条目
// onLog 回调在每处理完一个关键词后立即触发（含失败），供调度实时落库日志
// 返回 { scanned, imported, perKeyword } 供调度日志使用
export async function importActivitiesByKeywords(
  env: Env,
  keywords: string[],
  targetCount: number,
  onLog?: (level: 'ok' | 'warn', message: string) => Promise<void> | void,
): Promise<{ scanned: number; imported: number; perKeyword: { kw: string; query: string; hits: number; imported: number }[] }> {
  const key = env.WSA_API_KEY
  if (!key) throw new ApiError(500, 'NO_API_KEY', '未配置元宝搜索 API KEY')

  const now = new Date().toISOString()
  const perKeyword: { kw: string; query: string; hits: number; imported: number }[] = []
  let scanned = 0
  let imported = 0

  for (const kw of keywords) {
    if (imported >= targetCount) break
    const query = `${kw} 活动 福利`
    let results: YuanbaoResult[] = []
    try {
      results = await searchYuanbao(key, query, { cnt: 50, freshness: 'm3' })
    } catch (error) {
      const msg = `元宝搜索「${query}」失败：${error instanceof Error ? error.message : '未知错误'}`
      console.error(msg)
      perKeyword.push({ kw, query, hits: 0, imported: 0 })
      await onLog?.('warn', msg)
      continue
    }

    let kwImported = 0
    for (const r of results) {
      if (imported >= targetCount) break
      if (!r.title || !r.url) continue
      scanned++
      // 过滤无效：不是福利活动
      if (!looksLikeActivity(r)) continue
      // 按链接去重（库内已存在则跳过）
      const dup = await env.DB.prepare('SELECT id FROM activities WHERE link = ?1 LIMIT 1').bind(r.url).first<{ id: string }>()
      if (dup) continue

      const category = classifyActivity({ title: r.title, description: r.passage })
      await persistActivity(env, r, category, now)
      imported++
      kwImported++
    }
    perKeyword.push({ kw, query, hits: results.length, imported: kwImported })
    await onLog?.('ok', `元宝搜索「${query}」命中 ${results.length} 条，导入 ${kwImported} 条`)
  }

  return { scanned, imported, perKeyword }
}

// 搜索并导入真实活动数据（作为待审核候选）
export async function searchImport(env: Env) {
  const key = env.WSA_API_KEY
  if (!key) throw new ApiError(500, 'NO_API_KEY', '未配置元宝搜索 API KEY')

  let scanned = 0
  let imported = 0
  const samples: { title: string; url: string; category: string }[] = []
  const now = new Date().toISOString()

  for (const q of SEARCH_QUERIES) {
    let results: YuanbaoResult[] = []
    try {
      results = await searchYuanbao(key, q.query, { cnt: 10, freshness: 'm3' })
    } catch (error) {
      console.error(`元宝搜索「${q.query}」失败：`, error)
      continue
    }

    for (const r of results) {
      if (!r.title || !r.url) continue
      scanned++
      // 过滤掉明显不是福利活动的网页
      if (!looksLikeActivity(r)) continue
      // 按链接去重
      const dup = await env.DB.prepare('SELECT id FROM activities WHERE link = ?1 LIMIT 1').bind(r.url).first<{ id: string }>()
      if (dup) continue

      const id = `act-search-${crypto.randomUUID()}`
      const category = classifyActivity({ title: r.title, description: r.passage, category: q.category })
      const type = ACTIVITY_CATEGORY_TO_TYPE[category]
      const score = toScore(r)
      const host = hostOf(r.url)
      await env.DB.prepare(
        `INSERT INTO activities (id, title, category, type, hot, description, source, deadline, verify, score, conditions, doubts, link, value, entry, status, created_at)
         VALUES (?1,?2,?3,?4,0,?5,?6,?7,'doubt',?8,?9,?10,?11,?12,?13,'pending',?14)`,
      )
        .bind(
          id,
          r.title,
          category,
          type,
          toDescription(r),
          host || '全网搜索',
          '待确认',
          score,
          JSON.stringify(['来自全网搜索，待核验']),
          JSON.stringify(['元宝搜索聚合结果，未经人工核验']),
          r.url,
          '待核验',
          host ? `搜索来源：${host}` : '搜索来源',
          now,
        )
        .run()
      imported++
      if (samples.length < 6) samples.push({ title: r.title, url: r.url, category })
    }
  }

  return ok({ scanned, imported, queries: SEARCH_QUERIES.length, samples })
}

// 仅搜索预览（不入库），用于验证元宝搜索连通性与结果质量
export async function searchProbe(env: Env) {
  const key = env.WSA_API_KEY
  if (!key) throw new ApiError(500, 'NO_API_KEY', '未配置元宝搜索 API KEY')
  const query = '云服务器免费试用 2026'
  const results = await searchYuanbao(key, query, { cnt: 10, freshness: 'm3' })
  return ok({
    query,
    count: results.length,
    results: results.map((r) => ({ title: r.title, url: r.url, date: r.date, score: r.score, passage: r.passage.slice(0, 160) })),
  })
}

// 按关键词做一次元宝全网搜索（供前端全局搜索框调用，不入库）
export async function searchQuery(request: Request, env: Env) {
  const input = z.object({ query: z.string().trim().min(1, '请输入搜索词').max(500, '搜索词过长') }).parse(await bodyJson(request))
  const key = env.WSA_API_KEY
  if (!key) throw new ApiError(500, 'NO_API_KEY', '未配置元宝搜索 API KEY')
  const results = await searchYuanbao(key, input.query, { cnt: 10, freshness: 'm6' })
  return ok(
    results.map((r) => {
      const host = hostOf(r.url)
      const credibility = classifySource(host, r.title, r.site)
      return {
        title: r.title,
        url: r.url,
        passage: r.passage.slice(0, 160),
        date: r.date,
        source: r.site || host || '全网',
        tier: credibility.tier,
        tierLabel: credibility.label,
        trustworthy: credibility.trustworthy,
      }
    }),
  )
}

// 明显与「活动真实性」无关的检索噪声词：whois/域名查询/教程等 SEO 内容
const NOISE_WORDS = [
  'whois', '域名', '归属', '查询方法', '教程', '怎么查', '如何查', '步骤', '指南', '入门', '新手',
  '是什么', '什么意思', '如何获取', 'ip address', 'dns', 'icann', 'rdap', 'registered',
]

// 福利活动的「承诺/主体」特征词，优先保留进检索词，让搜索聚焦活动本身
const PROMISE_WORDS = ['免费', '立减', '满减', '红包', '返现', '优惠', '补贴', '领取', '试用', '赠', '送', '券', '折扣', '免单', '奖金', '奖品', '参赛', '报名', '活动', '福利']

function hasNoise(text: string): boolean {
  const t = text.toLowerCase()
  return NOISE_WORDS.some((w) => t.includes(w))
}

// 从文本中抽出一个「活动主体 + 承诺」检索词：
// 1. 去掉 URL，避免裸链接被搜索引擎当成「域名归属查询」去搜；
// 2. 优先保留含福利承诺词的片段；
// 3. 若整体被判定为噪声（如 whois/教程），则退回提取其中的域名主体词。
function extractSelfCheckQuery(text: string): string {
  const urlOnly = /^https?:\/\/\S+$/.test(text.trim())
  // 去掉 URL 与空白
  let cleaned = text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim()

  // 情况 1：纯链接（用户只贴了一个网址）
  if (urlOnly || !cleaned) {
    const m = text.match(/https?:\/\/([^\/\s]+)/)
    if (m) {
      // 从域名中提取可读主体词，去掉 www、常见后缀，构造「活动」检索意图
      const host = m[1].replace(/^www\./, '')
      const parts = host.split('.')
      // 取主域名段（如 waytoagi），并拼上「活动/福利」意图词
      const core = parts.length >= 2 ? parts[parts.length - 2] : host
      const stem = core.replace(/[-_]/g, ' ').trim()
      if (stem) return `${stem} 活动 福利 真假`
    }
    return cleaned.slice(0, 80) || '活动 福利 真假'
  }

  // 情况 2：有文字，但整体是「如何查域名/whois」类噪声 → 改为搜索其中的活动主体
  if (hasNoise(cleaned) && !PROMISE_WORDS.some((w) => cleaned.includes(w))) {
    const m = text.match(/https?:\/\/([^\/\s]+)/)
    if (m) {
      const host = m[1].replace(/^www\./, '')
      const parts = host.split('.')
      const core = parts.length >= 2 ? parts[parts.length - 2] : host
      const stem = core.replace(/[-_]/g, ' ').trim()
      if (stem) return `${stem} 是什么 活动`
    }
  }

  // 情况 3：正常活动文字，直接截断使用（保留承诺词）
  return cleaned.slice(0, 80)
}

// 交叉验证用的「负面/质疑」检索词后缀，用于判断活动是否存在已知风险
const RISK_SUFFIXES = ['是真的吗', '骗局', '套路', '虚假宣传', '投诉']

// 判断一段文本是否包含明显的负面风险信号
const RISK_MARKERS = ['骗局', '套路', '虚假', '欺诈', '投诉', '维权', '曝光', '上当了', '是假的', '坑', '不靠谱']

// 对逆向搜索结果做风险信号统计
function countRiskSignals(results: YuanbaoResult[]): number {
  return results.reduce((acc, r) => {
    const text = `${r.title} ${r.passage}`
    return acc + RISK_MARKERS.filter((m) => text.includes(m)).length
  }, 0)
}

// 活动自查：用元宝搜索核对用户粘贴的活动内容，返回带「来源可信度分级」的查证结果
// 结论基于真实搜索来源（交叉验证），而非单纯的关键词命中
export async function selfCheck(request: Request, env: Env) {
  const input = z.object({ text: z.string().trim().min(1, '请输入要查证的内容').max(2000, '内容过长') }).parse(await bodyJson(request))
  const key = env.WSA_API_KEY
  if (!key) throw new ApiError(500, 'NO_API_KEY', '未配置元宝搜索 API KEY')

  const query = extractSelfCheckQuery(input.text)
  const results = await searchYuanbao(key, query, { cnt: 10, freshness: 'm6' })

  // 过滤掉明显与「活动真实性」无关的噪声来源（whois/域名教程等 SEO 内容）
  const relevant = results.filter((r) => {
    const text = `${r.title} ${r.passage}`.toLowerCase()
    return !NOISE_WORDS.some((w) => text.includes(w))
  })
  // 若过滤后为空，退回原始结果，避免「未检索到」误报
  const useResults = relevant.length ? relevant : results

  // 交叉验证：额外检索「XX 是真的吗 / 骗局 / 套路」，捕捉负面信号
  let riskCount = 0
  let riskQuery = ''
  try {
    riskQuery = `${query} ${RISK_SUFFIXES[0]}`
    const riskResults = await searchYuanbao(key, riskQuery, { cnt: 10, freshness: 'm6' })
    riskCount = countRiskSignals(riskResults)
  } catch {
    // 逆向检索失败不影响主流程
    riskCount = 0
  }

  // 每条来源做可信度分级（结合元宝返回的 site 网站名与 url 域名）
  const hits = useResults.map((r) => {
    const url = r.url
    const host = hostOf(url)
    const credibility = classifySource(host, r.title, r.site)
    return {
      title: r.title,
      url,
      passage: r.passage.slice(0, 160),
      date: r.date,
      source: r.site || host || '全网',
      tier: credibility.tier,
      tierLabel: credibility.label,
      trustworthy: credibility.trustworthy,
      tierReason: credibility.reason,
    }
  })

  // 基于来源可信度给出整体结论
  const summary = summarizeCredibility(hits.map((h) => ({ tier: h.tier, trustworthy: h.trustworthy })))

  // 若逆向检索出现明显风险信号，将结论降级为「存疑」并提示
  let verdict = summary.verdict
  let verdictLabel = summary.label
  let verdictReason = summary.reason
  if (riskCount >= 2) {
    verdict = 'doubt'
    verdictLabel = '存疑（发现风险信号）'
    verdictReason = `交叉验证发现 ${riskCount} 处疑似风险信号，建议谨慎`
  }

  return ok({
    query,
    verdict,
    verdictLabel,
    verdictReason,
    officialCount: hits.filter((h) => h.tier === 'official').length,
    riskCount,
    riskQuery,
    hits,
  })
}
