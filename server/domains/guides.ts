import { z } from 'zod'
import { bodyJson, ok } from '../lib/http'
import type { Guide } from '../types'

type GuideRow = {
  id: string
  title: string
  content: string
  category: string
  tone: string
  status: string
  created_at: string
}

function rowToGuide(row: GuideRow): Guide {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tone: row.tone === 'warn' ? 'warn' : 'normal',
    status: row.status === 'pending' ? 'pending' : 'approved',
    createdAt: row.created_at,
  }
}

export async function listGuides(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT * FROM guides WHERE status = 'approved' ORDER BY created_at DESC, id ASC",
  ).all<GuideRow>()
  return ok(rows.results.map(rowToGuide))
}

const guideInputSchema = z.object({
  title: z.string().trim().min(1, '请填写攻略标题').max(120, '攻略标题最多 120 个字'),
  content: z.string().trim().min(1, '请填写攻略内容').max(5000, '攻略内容最多 5000 个字'),
})

export async function createGuide(request: Request, env: Env) {
  const input = guideInputSchema.parse(await bodyJson(request))
  const id = `guide-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO guides (id, title, content, category, tone, status, created_at) VALUES (?1,?2,?3,?4,\'normal\',\'pending\',?5)',
  )
    .bind(id, input.title, input.content, '用户分享', now)
    .run()
  const row = await env.DB.prepare('SELECT * FROM guides WHERE id = ?1').bind(id).first<GuideRow>()
  if (!row) throw new Error('攻略提交失败')
  return ok(rowToGuide(row), { status: 201 })
}
