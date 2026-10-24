import { z } from 'zod'
import { ApiError } from './api-error'

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('cache-control', 'no-store')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function ok(data: unknown, init: ResponseInit = {}) {
  return json({ success: true, data }, init)
}

export function fail(error: unknown) {
  if (error instanceof ApiError) return json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status })
  if (error instanceof z.ZodError) return json({ success: false, error: { code: 'INVALID_INPUT', message: error.issues[0]?.message || '输入内容不正确' } }, { status: 400 })
  console.error(error)
  return json({ success: false, error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' } }, { status: 500 })
}

export async function bodyJson<T>(request: Request): Promise<T> {
  try {
    return await request.json<T>()
  } catch {
    throw new ApiError(400, 'INVALID_JSON', '请求内容格式不正确')
  }
}

export function assertBodySize(request: Request, maxBytes: number) {
  const value = request.headers.get('content-length')
  if (value && Number(value) > maxBytes) throw new ApiError(413, 'REQUEST_TOO_LARGE', '请求内容过大')
}

export function parseCookies(request: Request) {
  const values = new Map<string, string>()
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name) values.set(name, decodeURIComponent(rest.join('=')))
  }
  return values
}
