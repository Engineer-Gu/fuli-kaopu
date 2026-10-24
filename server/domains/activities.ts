import { z } from 'zod'
import { classifyActivity } from '../../src/constants/activity-categories'
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_TO_TYPE } from '../config/constants'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok } from '../lib/http'
import type { Activity } from '../types'

// D1 行结构（snake_case）
type ActivityRow = {
  id: string
  title: string
  category: string
  type: string
  hot: number
  description: string
  source: string
  deadline: string
  verify: string
  score: number
  conditions: string
  doubts: string
  link: string
  value: string
  entry: string
  app_scheme: string
  status: string
  verified_count: number
  invalid_count: number
  created_at: string
}

// 将 JSON 文本安全解析为字符串数组
function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function rowToActivity(row: ActivityRow): Activity {
  const category = classifyActivity(row)
  return {
    id: row.id,
    title: row.title,
    category,
    type: ACTIVITY_CATEGORY_TO_TYPE[category],
    hot: row.hot === 1,
    description: row.description,
    source: row.source,
    deadline: row.deadline,
    verify: row.verify === 'verified' ? 'verified' : 'doubt',
    score: row.score,
    conditions: parseList(row.conditions),
    doubts: parseList(row.doubts),
    link: row.link,
    value: row.value,
    entry: row.entry,
    appScheme: row.app_scheme || '',
    status: row.status === 'pending' ? 'pending' : 'approved',
    verifiedCount: row.verified_count ?? 0,
    invalidCount: row.invalid_count ?? 0,
    createdAt: row.created_at,
  }
}

export async function listActivities(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT * FROM activities WHERE status = 'approved' ORDER BY created_at DESC, id ASC",
  ).all<ActivityRow>()
  return ok(rows.results.map(rowToActivity))
}

const activityInputSchema = z.object({
  title: z.string().trim().min(1, '请填写活动名称').max(120, '活动名称最多 120 个字'),
  description: z.string().trim().max(2000, '活动说明最多 2000 个字'),
  category: z.enum(ACTIVITY_CATEGORIES),
})

export async function createActivity(request: Request, env: Env) {
  const input = activityInputSchema.parse(await bodyJson(request))
  // 去重：榜单中已存在同名（或标题包含提交标题）的活动则跳过
  if (input.title.length >= 2) {
    const existing = await env.DB.prepare(
      'SELECT id FROM activities WHERE title LIKE ?1 LIMIT 1',
    ).bind(`%${input.title}%`).first<{ id: string }>()
    if (existing) throw new ApiError(409, 'DUPLICATE_ACTIVITY', '该活动已在榜单，已去重')
  }
  const id = `act-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  const type = ACTIVITY_CATEGORY_TO_TYPE[input.category] || 'platform'
  await env.DB.prepare(
    `INSERT INTO activities (id, title, category, type, hot, description, source, deadline, verify, score, conditions, doubts, link, value, entry, status, created_at)
     VALUES (?1,?2,?3,?4,0,?5,?6,?7,'doubt',60,?8,?9,'#',?10,?11,'pending',?12)`,
  )
    .bind(
      id,
      input.title,
      input.category,
      type,
      input.description || '待补充',
      '用户提交',
      '待确认',
      JSON.stringify(['待审核']),
      JSON.stringify(['用户提交待核验']),
      '待核验',
      '用户提交',
      now,
    )
    .run()
  const row = await env.DB.prepare('SELECT * FROM activities WHERE id = ?1').bind(id).first<ActivityRow>()
  if (!row) throw new ApiError(500, 'CREATE_FAILED', '活动提交失败')
  return ok(rowToActivity(row), { status: 201 })
}

// 用户反馈活动真实性：valid 计「已验证有效」，invalid 计「反馈失效」
export async function verifyActivity(request: Request, env: Env, id: string) {
  const input = z.object({ result: z.enum(['valid', 'invalid']) }).parse(await bodyJson(request))
  const sql =
    input.result === 'valid'
      ? 'UPDATE activities SET verified_count = verified_count + 1 WHERE id = ?1'
      : 'UPDATE activities SET invalid_count = invalid_count + 1 WHERE id = ?1'
  const res = await env.DB.prepare(sql).bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'NOT_FOUND', '活动不存在')
  const row = await env.DB.prepare(
    'SELECT verified_count, invalid_count FROM activities WHERE id = ?1',
  )
    .bind(id)
    .first<{ verified_count: number; invalid_count: number }>()
  return ok({ verifiedCount: row?.verified_count ?? 0, invalidCount: row?.invalid_count ?? 0 })
}
