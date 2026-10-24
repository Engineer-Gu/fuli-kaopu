import { ok } from '../lib/http'

// 取「今天」的日期（按北京时间，避免 UTC 导致凌晨归到前一天）
function today(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// 获取今日访问人数
export async function getTodayVisits(env: Env) {
  const row = await env.DB.prepare('SELECT visits FROM site_stats WHERE day = ?1').bind(today()).first<{ visits: number }>()
  return ok({ visits: row?.visits ?? 0 })
}

// 记录一次访问并返回最新访问人数（每次访问 +1，同时记录访客 IP 用于追溯）
export async function recordVisit(request: Request, env: Env) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown'
  console.log(`[visit] ${today()} ip=${ip}`)
  await env.DB.prepare(
    'INSERT INTO site_stats (day, visits) VALUES (?1, 1) ON CONFLICT(day) DO UPDATE SET visits = visits + 1',
  ).bind(today()).run()
  const row = await env.DB.prepare('SELECT visits FROM site_stats WHERE day = ?1').bind(today()).first<{ visits: number }>()
  return ok({ visits: row?.visits ?? 0 })
}
