import { z } from 'zod'
import { DICT_CATEGORIES } from '../config/constants'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok } from '../lib/http'
import { computeKeywordHits } from '../lib/stats'
import type { DictWord } from '../types'

type DictWordRow = {
  id: string
  kw: string
  cat: string
  status: string
  created_at: string
}

function rowToDictWord(row: DictWordRow): DictWord {
  return {
    id: row.id,
    kw: row.kw,
    cat: row.cat,
    status: row.status === 'pending' ? 'pending' : 'approved',
    createdAt: row.created_at,
  }
}

export async function listDictWords(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT * FROM dict_words WHERE status = 'approved' ORDER BY created_at ASC, id ASC",
  ).all<DictWordRow>()
  return ok(rows.results.map(rowToDictWord))
}

const dictWordInputSchema = z.object({
  kw: z.string().trim().min(1, '请输入关键词').max(50, '关键词最多 50 个字'),
  cat: z.enum(DICT_CATEGORIES),
})

export async function createDictWord(request: Request, env: Env) {
  const input = dictWordInputSchema.parse(await bodyJson(request))
  // 去重：不区分大小写
  const existing = await env.DB.prepare(
    'SELECT id FROM dict_words WHERE kw = ?1 COLLATE NOCASE LIMIT 1',
  ).bind(input.kw).first<{ id: string }>()
  if (existing) throw new ApiError(409, 'DUPLICATE_WORD', '该关键词已在词典，已去重')
  const id = `dict-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  await env.DB.prepare(
    "INSERT INTO dict_words (id, kw, cat, status, created_at) VALUES (?1,?2,?3,'pending',?4)",
  )
    .bind(id, input.kw, input.cat, now)
    .run()
  const row = await env.DB.prepare('SELECT * FROM dict_words WHERE id = ?1').bind(id).first<DictWordRow>()
  if (!row) throw new Error('关键词提交失败')
  return ok(rowToDictWord(row), { status: 201 })
}

export async function deleteDictWord(env: Env, id: string) {
  const res = await env.DB.prepare('DELETE FROM dict_words WHERE id = ?1').bind(id).run()
  if (res.meta.changes === 0) throw new ApiError(404, 'WORD_NOT_FOUND', '关键词不存在')
  return ok({ id })
}

// 关键词命中贡献（近 7 天视角下基于当前榜单的实时匹配数）
export async function dictWordStats(env: Env) {
  const { perWord } = await computeKeywordHits(env)
  return ok(perWord)
}
