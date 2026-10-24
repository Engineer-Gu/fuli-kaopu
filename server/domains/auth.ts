import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '../config/constants'
import { ApiError } from '../lib/api-error'
import { bodyJson, ok, parseCookies } from '../lib/http'
import type { User } from '../types'

const DUMMY_PASSWORD_HASH = '$2b$10$IK71i0RWKTe9bEagy88tMeuKSjXeH61NR2kHYqzNnNiKhe1M97ab2'

type UserRow = Record<string, unknown>

const loginInputSchema = z.object({
  username: z.string().trim().min(3, '请输入用户名').max(30),
  password: z.string().min(6, '密码至少 6 位').max(72),
})

const registerInputSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '用户名需为 3-20 位小写字母、数字或下划线'),
  nickname: z.string().trim().min(2, '昵称至少 2 个字').max(20, '昵称最多 20 个字'),
  password: z.string().min(6, '密码至少 6 位').max(72),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: '两次输入的密码不一致' })

export function publicUser(row: UserRow): User {
  return {
    id: String(row.id),
    username: String(row.username),
    nickname: String(row.nickname),
    role: row.role === 'admin' ? 'admin' : 'user',
    status: row.status === 'disabled' ? 'disabled' : 'active',
    createdAt: String(row.created_at),
  }
}

function sessionCookie(token: string, secure: boolean, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

function clearSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
}

async function issueSession(request: Request, env: Env, row: UserRow) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString()
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(token, String(row.id), now.toISOString(), expiresAt).run()
  const secure = new URL(request.url).protocol === 'https:'
  return ok({ user: publicUser(row) }, { headers: { 'set-cookie': sessionCookie(token, secure) } })
}

async function findUserByIdentifier(env: Env, username: string) {
  return env.DB.prepare('SELECT * FROM users WHERE username = ?1 COLLATE NOCASE LIMIT 1')
    .bind(username).first<UserRow>()
}

export async function currentUser(request: Request, env: Env, required = true): Promise<User | null> {
  const token = parseCookies(request).get(SESSION_COOKIE)
  if (!token) {
    if (required) throw new ApiError(401, 'UNAUTHORIZED', '请先登录')
    return null
  }
  const session = await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?1')
    .bind(token).first<{ user_id: string; expires_at: string }>()
  if (!session) {
    if (required) throw new ApiError(401, 'SESSION_EXPIRED', '登录已过期，请重新登录')
    return null
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run()
    if (required) throw new ApiError(401, 'SESSION_EXPIRED', '登录已过期，请重新登录')
    return null
  }
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(session.user_id).first<UserRow>()
  if (!row || row.status === 'disabled') {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run()
    if (required) throw new ApiError(401, 'UNAUTHORIZED', '账号不可用')
    return null
  }
  return publicUser(row)
}

export function requireAdmin(user: User) {
  if (user.role !== 'admin') throw new ApiError(403, 'ADMIN_REQUIRED', '无权访问管理后台')
}

export async function login(request: Request, env: Env) {
  const payload = loginInputSchema.parse(await bodyJson(request))
  const username = payload.username.trim().toLowerCase()
  const row = await findUserByIdentifier(env, username)
  const hash = typeof row?.password_hash === 'string' && row.password_hash ? String(row.password_hash) : DUMMY_PASSWORD_HASH
  const valid = await bcrypt.compare(payload.password, hash)
  if (!row || !valid || row.status === 'disabled') {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码错误')
  }
  return issueSession(request, env, row)
}

export async function register(request: Request, env: Env) {
  const payload = registerInputSchema.parse(await bodyJson(request))
  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?1').bind(payload.username).first()
  if (existing) throw new ApiError(409, 'USERNAME_TAKEN', '用户名已被使用')
  const now = new Date().toISOString()
  const userId = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(payload.password, 10)
  await env.DB.prepare('INSERT INTO users (id, username, password_hash, nickname, role, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)')
    .bind(userId, payload.username, passwordHash, payload.nickname, 'user', 'active', now).run()
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first<UserRow>()
  if (!row) throw new ApiError(500, 'REGISTER_FAILED', '注册失败，请稍后重试')
  return issueSession(request, env, row)
}

export async function logout(request: Request, env: Env) {
  const token = parseCookies(request).get(SESSION_COOKIE)
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run()
  const secure = new URL(request.url).protocol === 'https:'
  return ok(null, { headers: { 'set-cookie': clearSessionCookie(secure) } })
}

const profileInputSchema = z.object({
  nickname: z.string().trim().min(2, '昵称至少 2 个字').max(20, '昵称最多 20 个字'),
})

export async function updateProfile(request: Request, env: Env, user: User) {
  const payload = profileInputSchema.parse(await bodyJson(request))
  const now = new Date().toISOString()
  await env.DB.prepare('UPDATE users SET nickname = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(payload.nickname, now, user.id).run()
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(user.id).first<UserRow>()
  if (!row) throw new ApiError(404, 'NOT_FOUND', '用户不存在')
  return ok({ user: publicUser(row) })
}
