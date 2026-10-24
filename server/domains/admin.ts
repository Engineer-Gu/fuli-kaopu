import { z } from 'zod'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok } from '../lib/http'
import { requireAdmin } from './auth'
import type { User } from '../types'

// 管理员概览：各类待审核数量
export async function adminDashboard(env: Env, user: User) {
  requireAdmin(user)
  const [words, activities, guides, users] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending FROM dict_words"),
    env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending FROM activities"),
    env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending FROM guides"),
    env.DB.prepare("SELECT COUNT(*) total FROM users"),
  ])
  const pick = (r: { results: unknown[] }, key: string) => Number((r.results[0] as Record<string, unknown> | undefined)?.[key] ?? 0)
  return ok({
    dictWords: { total: pick(words, 'total'), pending: pick(words, 'pending') },
    activities: { total: pick(activities, 'total'), pending: pick(activities, 'pending') },
    guides: { total: pick(guides, 'total'), pending: pick(guides, 'pending') },
    users: pick(users, 'total'),
  })
}

// 待审核关键词列表（含全部，方便查看）
export async function adminDictWords(env: Env, user: User) {
  requireAdmin(user)
  const rows = await env.DB.prepare('SELECT * FROM dict_words ORDER BY created_at DESC, id ASC').all<Record<string, unknown>>()
  return ok(rows.results.map((row) => ({
    id: String(row.id), kw: String(row.kw), cat: String(row.cat),
    status: row.status === 'pending' ? 'pending' : 'approved', createdAt: String(row.created_at),
  })))
}

export async function adminApproveDictWord(env: Env, user: User, id: string) {
  requireAdmin(user)
  const res = await env.DB.prepare("UPDATE dict_words SET status='approved' WHERE id = ?1").bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'WORD_NOT_FOUND', '关键词不存在')
  return ok({ id })
}

export async function adminRejectDictWord(env: Env, user: User, id: string) {
  requireAdmin(user)
  const res = await env.DB.prepare('DELETE FROM dict_words WHERE id = ?1').bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'WORD_NOT_FOUND', '关键词不存在')
  return ok({ id })
}

// 待审核活动
export async function adminActivities(env: Env, user: User) {
  requireAdmin(user)
  const rows = await env.DB.prepare('SELECT * FROM activities ORDER BY created_at DESC, id ASC').all<Record<string, unknown>>()
  return ok(rows.results.map((row) => ({
    id: String(row.id), title: String(row.title), category: String(row.category),
    source: String(row.source), status: row.status === 'pending' ? 'pending' : 'approved',
    createdAt: String(row.created_at),
  })))
}

export async function adminSetActivityStatus(request: Request, env: Env, user: User, id: string) {
  requireAdmin(user)
  const { status } = z.object({ status: z.enum(['approved', 'pending']) }).parse(await bodyJson(request))
  const res = await env.DB.prepare('UPDATE activities SET status = ?1 WHERE id = ?2').bind(status, id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'ACTIVITY_NOT_FOUND', '活动不存在')
  return ok({ id, status })
}

export async function adminDeleteActivity(env: Env, user: User, id: string) {
  requireAdmin(user)
  const res = await env.DB.prepare('DELETE FROM activities WHERE id = ?1').bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'ACTIVITY_NOT_FOUND', '活动不存在')
  return ok({ id })
}

// 待审核攻略
export async function adminGuides(env: Env, user: User) {
  requireAdmin(user)
  const rows = await env.DB.prepare('SELECT * FROM guides ORDER BY created_at DESC, id ASC').all<Record<string, unknown>>()
  return ok(rows.results.map((row) => ({
    id: String(row.id), title: String(row.title), category: String(row.category),
    tone: row.tone === 'warn' ? 'warn' : 'normal', status: row.status === 'pending' ? 'pending' : 'approved',
    createdAt: String(row.created_at),
  })))
}

export async function adminSetGuideStatus(request: Request, env: Env, user: User, id: string) {
  requireAdmin(user)
  const { status } = z.object({ status: z.enum(['approved', 'pending']) }).parse(await bodyJson(request))
  const res = await env.DB.prepare('UPDATE guides SET status = ?1 WHERE id = ?2').bind(status, id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'GUIDE_NOT_FOUND', '攻略不存在')
  return ok({ id, status })
}

export async function adminDeleteGuide(env: Env, user: User, id: string) {
  requireAdmin(user)
  const res = await env.DB.prepare('DELETE FROM guides WHERE id = ?1').bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'GUIDE_NOT_FOUND', '攻略不存在')
  return ok({ id })
}
