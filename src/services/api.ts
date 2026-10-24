import type { Activity, AdminActivity, AdminDashboard, AdminDictWord, AdminGuide, DictWord, DictWordStat, DispatchState, Guide, SearchHit, SelfCheckResult, User, VerifyCount } from '../types'

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message)
  }
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json')
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new ApiError('NETWORK_ERROR', '网络连接失败，请检查网络后重试', 0)
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

export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export function listActivities() {
  return api<Activity[]>('/activities')
}

export function submitActivity(input: { title: string; description: string; category: string }) {
  return post<Activity>('/activities', input)
}

export function listGuides() {
  return api<Guide[]>('/guides')
}

export function submitGuide(input: { title: string; content: string }) {
  return post<Guide>('/guides', input)
}

export function listDictWords() {
  return api<DictWord[]>('/dict-words')
}

export function submitDictWord(input: { kw: string; cat: string }) {
  return post<DictWord>('/dict-words', input)
}

export function deleteDictWord(id: string) {
  return api<{ id: string }>(`/dict-words/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function listDictWordStats() {
  return api<DictWordStat[]>('/dict-words/stats')
}

export function getDispatchState() {
  return api<DispatchState>('/dispatch/state')
}

export function runDispatchScan() {
  return post<DispatchState>('/dispatch/run')
}

export function setDispatchTask(input: { id: string; enabled: boolean }) {
  return post<DispatchState>('/dispatch/toggle', input)
}

export function getTodayVisits() {
  return api<{ visits: number }>('/stats/today')
}

export function recordVisit() {
  return post<{ visits: number }>('/stats/visit')
}

export function verifyActivity(id: string, result: 'valid' | 'invalid') {
  return post<VerifyCount>(`/activities/${encodeURIComponent(id)}/verify`, { result })
}

export function searchWeb(query: string) {
  return post<SearchHit[]>('/search/query', { query })
}

export function selfCheck(text: string) {
  return post<SelfCheckResult>('/search/selfcheck', { text })
}

// 认证
export function authLogin(username: string, password: string) {
  return post<{ user: User }>('/auth/login', { username, password })
}

export function authRegister(input: { username: string; nickname: string; password: string; confirmPassword: string }) {
  return post<{ user: User }>('/auth/register', input)
}

export function authLogout() {
  return post<null>('/auth/logout')
}

export function authMe() {
  return api<{ user: User | null }>('/auth/me')
}

export function authUpdateProfile(nickname: string) {
  return api<{ user: User }>('/auth/profile', { method: 'PATCH', body: JSON.stringify({ nickname }) })
}

// 管理后台
export function adminDashboard() {
  return api<AdminDashboard>('/admin/dashboard')
}

export function adminDictWords() {
  return api<AdminDictWord[]>('/admin/dict-words')
}

export function adminApproveDictWord(id: string) {
  return post<{ id: string }>(`/admin/dict-words/${encodeURIComponent(id)}/approve`)
}

export function adminRejectDictWord(id: string) {
  return api<{ id: string }>(`/admin/dict-words/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function adminActivities() {
  return api<AdminActivity[]>('/admin/activities')
}

export function adminSetActivityStatus(id: string, status: 'approved' | 'pending') {
  return post<{ id: string; status: string }>(`/admin/activities/${encodeURIComponent(id)}/status`, { status })
}

export function adminDeleteActivity(id: string) {
  return api<{ id: string }>(`/admin/activities/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function adminGuides() {
  return api<AdminGuide[]>('/admin/guides')
}

export function adminSetGuideStatus(id: string, status: 'approved' | 'pending') {
  return post<{ id: string; status: string }>(`/admin/guides/${encodeURIComponent(id)}/status`, { status })
}

export function adminDeleteGuide(id: string) {
  return api<{ id: string }>(`/admin/guides/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
