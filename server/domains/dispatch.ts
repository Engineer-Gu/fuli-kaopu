import { z } from 'zod'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok } from '../lib/http'
import { computeKeywordHits } from '../lib/stats'
import { importActivitiesByKeywords } from './search'
import type { DispatchLog, DispatchState, DispatchTask, ScanRun } from '../types'

// 每次调度扫描的目标导入活动数（去重、过滤无效后）
const TARGET_IMPORT_COUNT = 100

type TaskRow = { id: string; name: string; cron: string; description: string; enabled: number; updated_at: string }
type LogRow = { id: string; level: string; message: string; created_at: string }
type ScanRunRow = {
  id: string
  sources_total: number
  sources_ok: number
  keywords: number
  hits: number
  verified: number
  unverified: number
  created_at: string
}

function rowToTask(r: TaskRow): DispatchTask {
  return { id: r.id, name: r.name, cron: r.cron, description: r.description, enabled: r.enabled === 1, updatedAt: r.updated_at }
}

function rowToLog(r: LogRow): DispatchLog {
  return { id: r.id, level: (r.level as DispatchLog['level']), message: r.message, createdAt: r.created_at }
}

function rowToScanRun(r: ScanRunRow): ScanRun {
  return {
    id: r.id,
    sourcesTotal: r.sources_total,
    sourcesOk: r.sources_ok,
    keywords: r.keywords,
    hits: r.hits,
    verified: r.verified,
    unverified: r.unverified,
    createdAt: r.created_at,
  }
}

// 探测单个检索源是否可达（已废弃：不再从第三方导航/线报站取数据，改为元宝关键词搜索）
async function readDispatchState(env: Env): Promise<DispatchState> {
  const tasks = await env.DB.prepare('SELECT * FROM dispatch_tasks ORDER BY updated_at ASC').all<TaskRow>()
  const logs = await env.DB.prepare('SELECT * FROM dispatch_logs ORDER BY created_at DESC LIMIT 60').all<LogRow>()
  const lastRun = await env.DB.prepare('SELECT * FROM scan_runs ORDER BY created_at DESC LIMIT 1').first<ScanRunRow>()
  const { total, keywords } = await computeKeywordHits(env)
  const actRows = await env.DB.prepare("SELECT verify FROM activities WHERE status='approved'").all<{ verify: string }>()
  const verified = actRows.results.filter((r) => r.verify === 'verified').length
  const unverified = actRows.results.length - verified
  const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  const todayScans = await env.DB.prepare('SELECT COUNT(*) AS c FROM scan_runs WHERE created_at >= ?1').bind(dayStart).first<{ c: number }>()

  return {
    tasks: tasks.results.map(rowToTask),
    logs: logs.results.map(rowToLog).reverse(),
    lastRun: lastRun ? rowToScanRun(lastRun) : null,
    today: { scans: todayScans?.c ?? 0, verified, unverified, keywords, hits: total },
  }
}

export async function getDispatchState(env: Env) {
  return ok(await readDispatchState(env))
}

// 立即执行一次真实扫描：载入词典关键词 → 每个关键词用元宝搜索「关键词 活动 福利」→ 去重/过滤无效后导入活动 → 写入流水线快照与日志
export async function runScan(env: Env) {
  const now = new Date().toISOString()

  // 实时落库一条日志：便于执行过程中在后台看到进度，而非等全部跑完
  const writeLog = async (level: DispatchLog['level'], message: string) => {
    await env.DB.prepare(
      'INSERT INTO dispatch_logs (id, level, message, created_at) VALUES (?1,?2,?3,?4)',
    ).bind(`log-${crypto.randomUUID()}`, level, message, now).run()
  }

  // 载入词典关键词（用于元宝搜索的检索词）
  const kwRows = await env.DB.prepare("SELECT kw FROM dict_words WHERE status='approved'").all<{ kw: string }>()
  const keywords = kwRows.results.map((r) => r.kw)
  await writeLog('ok', `扫描开始：载入 ${keywords.length} 个词典关键词`)

  // 用词典关键词逐个做元宝搜索并导入，目标至少 100 个活动（去重、过滤无效）
  // 每个关键词处理完即实时写日志，避免搜索卡住时看不到进度
  let imported = 0
  if (keywords.length) {
    try {
      const result = await importActivitiesByKeywords(env, keywords, TARGET_IMPORT_COUNT, writeLog)
      imported = result.imported
    } catch (error) {
      await writeLog('warn', `元宝搜索导入失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  } else {
    await writeLog('warn', '词典为空，无法执行关键词搜索')
  }
  await writeLog(
    imported >= TARGET_IMPORT_COUNT ? 'ok' : 'warn',
    `本轮共导入 ${imported} 个活动福利${imported >= TARGET_IMPORT_COUNT ? '（已达目标）' : `（目标 ${TARGET_IMPORT_COUNT} 个，词典关键词耗尽）`}`,
  )

  const actRows = await env.DB.prepare("SELECT verify FROM activities WHERE status='approved'").all<{ verify: string }>()
  const verified = actRows.results.filter((r) => r.verify === 'verified').length
  const unverified = actRows.results.length - verified
  await writeLog('ok', `榜单当前 ${actRows.results.length} 条：已核验 ${verified} 条，存疑 ${unverified} 条`)

  await env.DB.prepare(
    `INSERT INTO scan_runs (id, sources_total, sources_ok, keywords, hits, verified, unverified, created_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
  )
    .bind(`run-${crypto.randomUUID()}`, 0, 0, keywords.length, imported, verified, unverified, now)
    .run()

  await env.DB.prepare(
    'DELETE FROM dispatch_logs WHERE id NOT IN (SELECT id FROM dispatch_logs ORDER BY created_at DESC LIMIT 100)',
  ).run()

  return ok(await readDispatchState(env))
}

const toggleSchema = z.object({ id: z.string().min(1), enabled: z.boolean() })

export async function toggleTask(request: Request, env: Env) {
  const input = toggleSchema.parse(await bodyJson(request))
  const res = await env.DB.prepare('UPDATE dispatch_tasks SET enabled = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(input.enabled ? 1 : 0, new Date().toISOString(), input.id)
    .run()
  if (res.meta.changes === 0) throw new ApiError(404, 'TASK_NOT_FOUND', '定时任务不存在')
  return ok(await readDispatchState(env))
}
