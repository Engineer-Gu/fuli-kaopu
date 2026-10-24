import type { DictWordStat } from '../types'

// 统计每个词典关键词在榜单活动（标题/说明）中的命中次数，供「词典命中贡献」与「调度流水线」复用
export async function computeKeywordHits(env: Env) {
  const kwRows = await env.DB.prepare("SELECT kw FROM dict_words WHERE status='approved'").all<{ kw: string }>()
  const actRows = await env.DB.prepare(
    "SELECT title, description FROM activities WHERE status='approved'",
  ).all<{ title: string; description: string }>()

  const perWord: DictWordStat[] = kwRows.results
    .map((r) => {
      const kw = r.kw
      const n = actRows.results.filter((a) => (a.title + a.description).includes(kw)).length
      return { kw, n }
    })
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n)

  const total = perWord.reduce((sum, x) => sum + x.n, 0)
  return { total, perWord, keywords: kwRows.results.length }
}
