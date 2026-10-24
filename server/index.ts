import { API_PREFIX } from './config/constants'
import { createActivity, listActivities, verifyActivity } from './domains/activities'
import { adminActivities, adminApproveDictWord, adminDashboard, adminDeleteActivity, adminDeleteGuide, adminDictWords, adminGuides, adminRejectDictWord, adminSetActivityStatus, adminSetGuideStatus } from './domains/admin'
import { currentUser, login, logout, register, requireAdmin, updateProfile } from './domains/auth'
import { createDictWord, deleteDictWord, dictWordStats, listDictWords } from './domains/dictionary'
import { getDispatchState, runScan, toggleTask } from './domains/dispatch'
import { createGuide, listGuides } from './domains/guides'
import { searchImport, searchProbe, searchQuery, selfCheck } from './domains/search'
import { getTodayVisits, recordVisit } from './domains/stats'
import { ApiError } from './lib/api-error'
import { assertBodySize, fail, ok } from './lib/http'

const MAX_JSON_BODY_BYTES = 64 * 1024

async function route(request: Request, env: Env) {
  const url = new URL(request.url)
  const path = url.pathname
  if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
    assertBodySize(request, MAX_JSON_BODY_BYTES)
  }

  if (path === `${API_PREFIX}/health`) return ok({ status: 'ok', time: new Date().toISOString() })

  // 认证（无需登录）
  if (path === `${API_PREFIX}/auth/login` && request.method === 'POST') return login(request, env)
  if (path === `${API_PREFIX}/auth/register` && request.method === 'POST') return register(request, env)
  if (path === `${API_PREFIX}/auth/logout` && request.method === 'POST') return logout(request, env)
  if (path === `${API_PREFIX}/auth/me` && request.method === 'GET') return ok({ user: await currentUser(request, env, false) })
  if (path === `${API_PREFIX}/auth/profile` && request.method === 'PATCH') {
    const user = (await currentUser(request, env)) as import('./types').User
    return updateProfile(request, env, user)
  }

  // 管理员接口（仅 /admin 路径才做鉴权，避免拦截公开接口）
  if (path.startsWith(`${API_PREFIX}/admin`)) {
    const user = (await currentUser(request, env)) as import('./types').User
    if (path === `${API_PREFIX}/admin/dashboard` && request.method === 'GET') return adminDashboard(env, user)
    if (path === `${API_PREFIX}/admin/dict-words` && request.method === 'GET') return adminDictWords(env, user)
    if (path === `${API_PREFIX}/admin/activities` && request.method === 'GET') return adminActivities(env, user)
    if (path === `${API_PREFIX}/admin/guides` && request.method === 'GET') return adminGuides(env, user)
    if (path.startsWith(`${API_PREFIX}/admin/dict-words/`) && request.method === 'POST' && path.endsWith('/approve')) {
      return adminApproveDictWord(env, user, path.slice(`${API_PREFIX}/admin/dict-words/`.length, -'/approve'.length))
    }
    if (path.startsWith(`${API_PREFIX}/admin/dict-words/`) && request.method === 'DELETE') {
      return adminRejectDictWord(env, user, path.slice(`${API_PREFIX}/admin/dict-words/`.length))
    }
    if (path.startsWith(`${API_PREFIX}/admin/activities/`) && request.method === 'POST' && path.endsWith('/status')) {
      return adminSetActivityStatus(request, env, user, path.slice(`${API_PREFIX}/admin/activities/`.length, -'/status'.length))
    }
    if (path.startsWith(`${API_PREFIX}/admin/activities/`) && request.method === 'DELETE') {
      return adminDeleteActivity(env, user, path.slice(`${API_PREFIX}/admin/activities/`.length))
    }
    if (path.startsWith(`${API_PREFIX}/admin/guides/`) && request.method === 'POST' && path.endsWith('/status')) {
      return adminSetGuideStatus(request, env, user, path.slice(`${API_PREFIX}/admin/guides/`.length, -'/status'.length))
    }
    if (path.startsWith(`${API_PREFIX}/admin/guides/`) && request.method === 'DELETE') {
      return adminDeleteGuide(env, user, path.slice(`${API_PREFIX}/admin/guides/`.length))
    }
    throw new ApiError(404, 'NOT_FOUND', '接口不存在')
  }

  if (path === `${API_PREFIX}/activities` && request.method === 'GET') return listActivities(env)
  if (path === `${API_PREFIX}/activities` && request.method === 'POST') return createActivity(request, env)
  if (path.startsWith(`${API_PREFIX}/activities/`) && path.endsWith('/verify') && request.method === 'POST') {
    const id = path.slice(`${API_PREFIX}/activities/`.length, -'/verify'.length)
    return verifyActivity(request, env, id)
  }

  if (path === `${API_PREFIX}/guides` && request.method === 'GET') return listGuides(env)
  if (path === `${API_PREFIX}/guides` && request.method === 'POST') return createGuide(request, env)

  if (path === `${API_PREFIX}/dict-words` && request.method === 'GET') return listDictWords(env)
  if (path === `${API_PREFIX}/dict-words` && request.method === 'POST') return createDictWord(request, env)
  if (path === `${API_PREFIX}/dict-words/stats` && request.method === 'GET') return dictWordStats(env)
  if (path.startsWith(`${API_PREFIX}/dict-words/`) && request.method === 'DELETE') {
    // 删除关键词仅管理员可操作（与后台审核删除一致，避免普通用户直接删除词典内容）
    const user = (await currentUser(request, env)) as import('./types').User
    requireAdmin(user)
    const id = path.slice(`${API_PREFIX}/dict-words/`.length)
    return deleteDictWord(env, id)
  }

  if (path === `${API_PREFIX}/dispatch/state` && request.method === 'GET') return getDispatchState(env)
  if (path === `${API_PREFIX}/dispatch/run` && request.method === 'POST') {
    const user = (await currentUser(request, env)) as import('./types').User
    requireAdmin(user)
    return runScan(env)
  }
  if (path === `${API_PREFIX}/dispatch/toggle` && request.method === 'POST') {
    const user = (await currentUser(request, env)) as import('./types').User
    requireAdmin(user)
    return toggleTask(request, env)
  }

  if (path === `${API_PREFIX}/search/probe` && request.method === 'POST') {
    const user = (await currentUser(request, env)) as import('./types').User
    requireAdmin(user)
    return searchProbe(env)
  }
  if (path === `${API_PREFIX}/search/import` && request.method === 'POST') {
    const user = (await currentUser(request, env)) as import('./types').User
    requireAdmin(user)
    return searchImport(env)
  }
  if (path === `${API_PREFIX}/search/query` && request.method === 'POST') return searchQuery(request, env)
  if (path === `${API_PREFIX}/search/selfcheck` && request.method === 'POST') return selfCheck(request, env)

  if (path === `${API_PREFIX}/stats/today` && request.method === 'GET') return getTodayVisits(env)
  if (path === `${API_PREFIX}/stats/visit` && request.method === 'POST') return recordVisit(request, env)

  // 其余请求交由静态资源（SPA 回退）
  return env.ASSETS.fetch(request)
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const response = await route(request, env)
      const headers = new Headers(response.headers)
      headers.set('x-content-type-options', 'nosniff')
      headers.set('x-frame-options', 'DENY')
      headers.set('referrer-policy', 'strict-origin-when-cross-origin')
      headers.set('permissions-policy', 'camera=(), microphone=(), payment=(), usb=()')
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    } catch (error) {
      return fail(error)
    }
  },
}
