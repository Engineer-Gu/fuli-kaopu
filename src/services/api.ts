import type { Activity, AdminActivity, AdminDashboard, AdminDictWord, AdminGuide, DictWord, DictWordStat, DispatchState, Guide, SearchHit, SelfCheckResult, User, VerifyCount } from '../types'
import {
  MOCK_ACTIVITIES,
  MOCK_DICT_STATS,
  MOCK_DICT_WORDS,
  MOCK_DISPATCH,
  MOCK_GUIDES,
  MOCK_USER,
  makeSearchHits,
  makeSelfCheck,
} from '../mock/data'

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message)
  }
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } }

// ===== 真实后端请求 =====
async function realApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json')
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new ApiError('NETWORK_ERROR', '网络连接失败', 0)
  }
  let payload: ApiResponse<T>
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    throw new ApiError('INVALID_RESPONSE', response.ok ? '服务返回格式错误' : `请求失败（${response.status}）`, response.status)
  }
  if (!response.ok || !payload.success) {
    const error = payload.success ? { code: 'REQUEST_FAILED', message: '请求失败' } : payload.error
    throw new ApiError(error.code, error.message, response.status)
  }
  return payload.data
}

// ===== 演示模式（后端未接入时的本地数据 + localStorage 持久化） =====
const LS_KEY = 'fuli-demo-state'
const LS_USER_KEY = 'fuli-demo-user'

// 默认启用演示模式：后端不可达时自动降级
let demoMode = true

type DemoState = {
  activities: Activity[]
  guides: Guide[]
  dictWords: DictWord[]
  dictStats: DictWordStat[]
  dispatch: DispatchState
}

function loadState(): DemoState {
  const fallback: DemoState = {
    activities: MOCK_ACTIVITIES.map((a) => ({ ...a, conditions: [...a.conditions], doubts: [...a.doubts] })),
    guides: MOCK_GUIDES.map((g) => ({ ...g })),
    dictWords: MOCK_DICT_WORDS.map((w) => ({ ...w })),
    dictStats: MOCK_DICT_STATS.map((s) => ({ ...s })),
    dispatch: cloneDispatch(MOCK_DISPATCH),
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as DemoState
    // 简单兜底：缺字段时用 fallback
    return {
      activities: parsed.activities?.length ? parsed.activities : fallback.activities,
      guides: parsed.guides?.length ? parsed.guides : fallback.guides,
      dictWords: parsed.dictWords?.length ? parsed.dictWords : fallback.dictWords,
      dictStats: parsed.dictStats?.length ? parsed.dictStats : fallback.dictStats,
      dispatch: parsed.dispatch?.tasks?.length ? parsed.dispatch : fallback.dispatch,
    }
  } catch {
    return fallback
  }
}

function saveState(s: DemoState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* 忽略存储失败 */
  }
}

function cloneDispatch(d: DispatchState): DispatchState {
  return {
    tasks: d.tasks.map((t) => ({ ...t })),
    logs: d.logs.map((l) => ({ ...l })),
    lastRun: d.lastRun ? { ...d.lastRun } : null,
    today: { ...d.today },
  }
}

let demoState: DemoState = loadState()
let demoUser: User | null = loadUser()

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function saveUser(u: User | null) {
  try {
    if (u) localStorage.setItem(LS_USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(LS_USER_KEY)
  } catch {
    /* 忽略 */
  }
}

// 探测后端是否可达（一次即可，缓存结果）
let backendChecked = false
async function isBackendAvailable(): Promise<boolean> {
  if (backendChecked) return !demoMode
  try {
    const res = await fetch('/api/v1/health', { method: 'GET', credentials: 'include' })
    const ok = res.ok
    demoMode = !ok
    backendChecked = true
    return ok
  } catch {
    demoMode = true
    backendChecked = true
    return false
  }
}

// 统一入口：后端可用走真实请求，否则走演示数据
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (await isBackendAvailable()) {
    return realApi<T>(path, init)
  }
  throw new ApiError('DEMO', 'demo', 0)
}

// ===== 演示模式的数据操作实现 =====
function nowIso() {
  return new Date().toISOString()
}

function demoListActivities(): Activity[] {
  return demoState.activities.filter((a) => a.status === 'approved')
}

function demoListGuides(): Guide[] {
  return demoState.guides.filter((g) => g.status === 'approved')
}

function demoListDictWords(): DictWord[] {
  return demoState.dictWords.filter((w) => w.status === 'approved')
}

function demoToggleTask(id: string, enabled: boolean): DispatchState {
  const t = demoState.dispatch.tasks.find((x) => x.id === id)
  if (!t) throw new ApiError('NOT_FOUND', '任务不存在', 404)
  t.enabled = enabled
  t.updatedAt = nowIso()
  demoState.dispatch.logs.unshift({ id: `log-${Date.now()}`, level: 'info', message: `定时任务「${t.name}」${enabled ? '开启' : '关闭'}（演示）`, createdAt: nowIso() })
  saveState(demoState)
  return cloneDispatch(demoState.dispatch)
}

function demoRunScan(): DispatchState {
  demoState.dispatch.logs.unshift({ id: `log-${Date.now()}`, level: 'ok', message: '演示模式：模拟执行了一次搜索扫描', createdAt: nowIso() })
  demoState.dispatch.lastRun = { id: `run-${Date.now()}`, sourcesTotal: 0, sourcesOk: 0, keywords: demoState.dictWords.length, hits: 100, verified: 3, unverified: 6, createdAt: nowIso() }
  saveState(demoState)
  return cloneDispatch(demoState.dispatch)
}

// ===== 对外 API（每个方法：后端可达走真实，否则走演示） =====

export async function listActivities(): Promise<Activity[]> {
  if (await isBackendAvailable()) return realApi<Activity[]>('/activities')
  return demoListActivities()
}

export async function submitActivity(input: { title: string; description: string; category: string }): Promise<Activity> {
  if (await isBackendAvailable()) return realApi<Activity>('/activities', { method: 'POST', body: JSON.stringify(input) })
  const a: Activity = {
    id: `act-${Date.now()}`, title: input.title, category: input.category, type: 'platform', hot: false,
    description: input.description || '待补充', source: '用户提交（演示）', deadline: '待确认', verify: 'doubt', score: 60,
    conditions: ['待审核'], doubts: ['用户提交待核验'], link: '#', value: '待核验', entry: '用户提交', appScheme: '',
    status: 'pending', verifiedCount: 0, invalidCount: 0, createdAt: nowIso(),
  }
  demoState.activities.unshift(a)
  saveState(demoState)
  return a
}

export async function listGuides(): Promise<Guide[]> {
  if (await isBackendAvailable()) return realApi<Guide[]>('/guides')
  return demoListGuides()
}

export async function submitGuide(input: { title: string; content: string }): Promise<Guide> {
  if (await isBackendAvailable()) return realApi<Guide>('/guides', { method: 'POST', body: JSON.stringify(input) })
  const g: Guide = { id: `guide-${Date.now()}`, title: input.title, content: input.content, category: '用户分享', tone: 'normal', status: 'pending', createdAt: nowIso() }
  demoState.guides.unshift(g)
  saveState(demoState)
  return g
}

export async function listDictWords(): Promise<DictWord[]> {
  if (await isBackendAvailable()) return realApi<DictWord[]>('/dict-words')
  return demoListDictWords()
}

export async function submitDictWord(input: { kw: string; cat: string }): Promise<DictWord> {
  if (await isBackendAvailable()) return realApi<DictWord>('/dict-words', { method: 'POST', body: JSON.stringify(input) })
  const w: DictWord = { id: `dict-${Date.now()}`, kw: input.kw, cat: input.cat, status: 'pending', createdAt: nowIso() }
  demoState.dictWords.push(w)
  saveState(demoState)
  return w
}

export async function deleteDictWord(id: string): Promise<{ id: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string }>(`/dict-words/${encodeURIComponent(id)}`, { method: 'DELETE' })
  demoState.dictWords = demoState.dictWords.filter((w) => w.id !== id)
  saveState(demoState)
  return { id }
}

export async function listDictWordStats(): Promise<DictWordStat[]> {
  if (await isBackendAvailable()) return realApi<DictWordStat[]>('/dict-words/stats')
  return demoState.dictStats
}

export async function getDispatchState(): Promise<DispatchState> {
  if (await isBackendAvailable()) return realApi<DispatchState>('/dispatch/state')
  return cloneDispatch(demoState.dispatch)
}

export async function runDispatchScan(): Promise<DispatchState> {
  if (await isBackendAvailable()) return realApi<DispatchState>('/dispatch/run', { method: 'POST' })
  return demoRunScan()
}

export async function setDispatchTask(input: { id: string; enabled: boolean }): Promise<DispatchState> {
  if (await isBackendAvailable()) return realApi<DispatchState>('/dispatch/toggle', { method: 'POST', body: JSON.stringify(input) })
  return demoToggleTask(input.id, input.enabled)
}

export async function getTodayVisits(): Promise<{ visits: number }> {
  if (await isBackendAvailable()) return realApi<{ visits: number }>('/stats/today')
  return { visits: 1234 }
}

export async function recordVisit(): Promise<{ visits: number }> {
  if (await isBackendAvailable()) return realApi<{ visits: number }>('/stats/visit', { method: 'POST' })
  return { visits: 1235 }
}

export async function verifyActivity(id: string, result: 'valid' | 'invalid'): Promise<VerifyCount> {
  if (await isBackendAvailable()) return realApi<VerifyCount>(`/activities/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify({ result }) })
  const a = demoState.activities.find((x) => x.id === id)
  if (a) {
    if (result === 'valid') a.verifiedCount += 1
    else a.invalidCount += 1
    saveState(demoState)
    return { verifiedCount: a.verifiedCount, invalidCount: a.invalidCount }
  }
  return { verifiedCount: 1, invalidCount: 0 }
}

export async function searchWeb(query: string): Promise<SearchHit[]> {
  if (await isBackendAvailable()) return realApi<SearchHit[]>('/search/query', { method: 'POST', body: JSON.stringify({ query }) })
  // 演示模式：多给一些搜索结果
  return makeSearchHits(query)
}

export async function selfCheck(text: string): Promise<SelfCheckResult> {
  if (await isBackendAvailable()) return realApi<SelfCheckResult>('/search/selfcheck', { method: 'POST', body: JSON.stringify({ text }) })
  return makeSelfCheck(text)
}

// ===== 认证（演示模式走 localStorage） =====
export async function authLogin(username: string, password: string): Promise<{ user: User }> {
  if (await isBackendAvailable()) return realApi<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  // 演示：任意账号密码都能登录；admin 账号给管理员角色
  const role = username.toLowerCase() === 'admin' ? 'admin' : 'user'
  const u: User = { id: `u-${Date.now()}`, username, nickname: role === 'admin' ? '平台管理员' : username, role, status: 'active', createdAt: nowIso() }
  demoUser = u
  saveUser(u)
  return { user: u }
}

export async function authRegister(input: { username: string; nickname: string; password: string; confirmPassword: string }): Promise<{ user: User }> {
  if (await isBackendAvailable()) return realApi<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
  const u: User = { id: `u-${Date.now()}`, username: input.username, nickname: input.nickname || input.username, role: 'user', status: 'active', createdAt: nowIso() }
  demoUser = u
  saveUser(u)
  return { user: u }
}

export async function authLogout(): Promise<null> {
  if (await isBackendAvailable()) return realApi<null>('/auth/logout', { method: 'POST' })
  demoUser = null
  saveUser(null)
  return null
}

export async function authMe(): Promise<{ user: User | null }> {
  if (await isBackendAvailable()) return realApi<{ user: User | null }>('/auth/me')
  return { user: demoUser }
}

export async function authUpdateProfile(nickname: string): Promise<{ user: User }> {
  if (await isBackendAvailable()) return realApi<{ user: User }>('/auth/profile', { method: 'PATCH', body: JSON.stringify({ nickname }) })
  if (demoUser) {
    demoUser = { ...demoUser, nickname }
    saveUser(demoUser)
  }
  return { user: demoUser ?? MOCK_USER }
}

// ===== 管理后台 =====
export async function adminDashboard(): Promise<AdminDashboard> {
  if (await isBackendAvailable()) return realApi<AdminDashboard>('/admin/dashboard')
  // 演示模式：按当前内存状态实时统计
  const dictTotal = demoState.dictWords.length
  const dictPending = demoState.dictWords.filter((w) => w.status === 'pending').length
  const actTotal = demoState.activities.length
  const actPending = demoState.activities.filter((a) => a.status === 'pending').length
  const guideTotal = demoState.guides.length
  const guidePending = demoState.guides.filter((g) => g.status === 'pending').length
  return {
    dictWords: { total: dictTotal, pending: dictPending },
    activities: { total: actTotal, pending: actPending },
    guides: { total: guideTotal, pending: guidePending },
    users: demoUser ? 1 : 0,
  }
}

export async function adminDictWords(): Promise<AdminDictWord[]> {
  if (await isBackendAvailable()) return realApi<AdminDictWord[]>('/admin/dict-words')
  return demoState.dictWords.map((w) => ({ id: w.id, kw: w.kw, cat: w.cat, status: w.status, createdAt: w.createdAt }))
}

export async function adminApproveDictWord(id: string): Promise<{ id: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string }>(`/admin/dict-words/${encodeURIComponent(id)}/approve`, { method: 'POST' })
  const w = demoState.dictWords.find((x) => x.id === id)
  if (w) { w.status = 'approved'; saveState(demoState) }
  return { id }
}

export async function adminRejectDictWord(id: string): Promise<{ id: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string }>(`/admin/dict-words/${encodeURIComponent(id)}`, { method: 'DELETE' })
  demoState.dictWords = demoState.dictWords.filter((w) => w.id !== id)
  saveState(demoState)
  return { id }
}

export async function adminActivities(): Promise<AdminActivity[]> {
  if (await isBackendAvailable()) return realApi<AdminActivity[]>('/admin/activities')
  return demoState.activities.map((a) => ({ id: a.id, title: a.title, category: a.category, source: a.source, status: a.status, createdAt: a.createdAt }))
}

export async function adminSetActivityStatus(id: string, status: 'approved' | 'pending'): Promise<{ id: string; status: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string; status: string }>(`/admin/activities/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) })
  const a = demoState.activities.find((x) => x.id === id)
  if (a) { a.status = status; saveState(demoState) }
  return { id, status }
}

export async function adminDeleteActivity(id: string): Promise<{ id: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string }>(`/admin/activities/${encodeURIComponent(id)}`, { method: 'DELETE' })
  demoState.activities = demoState.activities.filter((a) => a.id !== id)
  saveState(demoState)
  return { id }
}

export async function adminGuides(): Promise<AdminGuide[]> {
  if (await isBackendAvailable()) return realApi<AdminGuide[]>('/admin/guides')
  return demoState.guides.map((g) => ({ id: g.id, title: g.title, category: g.category, tone: g.tone, status: g.status, createdAt: g.createdAt }))
}

export async function adminSetGuideStatus(id: string, status: 'approved' | 'pending'): Promise<{ id: string; status: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string; status: string }>(`/admin/guides/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) })
  const g = demoState.guides.find((x) => x.id === id)
  if (g) { g.status = status; saveState(demoState) }
  return { id, status }
}

export async function adminDeleteGuide(id: string): Promise<{ id: string }> {
  if (await isBackendAvailable()) return realApi<{ id: string }>(`/admin/guides/${encodeURIComponent(id)}`, { method: 'DELETE' })
  demoState.guides = demoState.guides.filter((g) => g.id !== id)
  saveState(demoState)
  return { id }
}
