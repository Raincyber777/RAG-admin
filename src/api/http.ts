/**
 * 统一请求封装：所有接口走同源 /api（Vite 开发服务器代理到 Django 8080）
 * - 自动携带 Authorization: Bearer <access>（localStorage zy_admin_token）
 * - 401 时用 zy_admin_refresh 换新 token 并重放一次；刷新失败清空登录态并回调 onAuthExpired
 * - 统一解析 DRF 错误响应（{detail} / 字段错误对象）为 Error(message)
 */

export const BASE = '/api'
export const TOKEN_KEY = 'zy_admin_token'

/** ngrok 免费版会对不带此请求头的浏览器请求弹拦截页；fetch 统一带上（图片/音频标签请求由同源代理规避） */
const NGROK_SKIP = { 'ngrok-skip-browser-warning': '1' }
export const REFRESH_KEY = 'zy_admin_refresh'

/** 登录过期（刷新失败）时由 store/auth 注入：清空本地登录态 */
let onAuthExpired: (() => void) | null = null
export function setAuthExpiredHandler(fn: (() => void) | null) {
  onAuthExpired = fn
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function getRefresh(): string {
  return localStorage.getItem(REFRESH_KEY) || ''
}
export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** 后端媒体地址（/media/... 同源路径，Vite 已代理到 Django 8080） */
export function mediaUrl(path: string): string {
  return path
}

/** DRF 错误响应 → 可读文案（{detail} 或 {字段: [提示]}） */
async function toApiError(res: Response): Promise<ApiError> {
  let message = `请求失败（${res.status}）`
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') message = data.detail
    else if (data && typeof data === 'object') {
      const first = Object.values(data as Record<string, unknown>)[0]
      if (Array.isArray(first) && typeof first[0] === 'string') message = first[0]
    }
  } catch {
    // 忽略非 JSON 响应体
  }
  return new ApiError(res.status, message)
}

/** 用 refresh 换新 access；成功返回 true */
async function refreshAccess(): Promise<boolean> {
  const refresh = getRefresh()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...NGROK_SKIP },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { access?: string }
    if (!data.access) return false
    localStorage.setItem(TOKEN_KEY, data.access)
    return true
  } catch {
    return false
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON 请求体（与 form 二选一） */
  data?: unknown
  /** FormData（multipart，含文件上传） */
  form?: FormData
}

async function requestOnce<T>(path: string, opts: RequestOptions, token: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...NGROK_SKIP,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.form ? opts.form : opts.data !== undefined ? JSON.stringify(opts.data) : undefined,
    })
  } catch {
    throw new ApiError(0, '无法连接服务器，请确认后端已启动')
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) throw await toApiError(res)
  return (await res.json()) as T
}

/** 发起请求；401 自动刷新重放一次，仍失败（或本地无 refresh）则清空登录态并触发登出回调 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await requestOnce<T>(path, opts, getToken())
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      if (getRefresh() && (await refreshAccess())) return requestOnce<T>(path, opts, getToken())
      clearTokens()
      onAuthExpired?.()
      throw new ApiError(401, '登录已过期，请重新登录')
    }
    throw e
  }
}

/** DRF 分页返回结构 */
export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** 拉取全量列表：自动翻页（每页 50） */
export async function listAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const query = new URLSearchParams({ page_size: '50', ...params })
  const out: T[] = []
  let url = `${path}?${query.toString()}`
  while (url) {
    const page = await request<Page<T>>(url)
    out.push(...page.results)
    // next 是后端按请求 Host 拼的绝对地址，剥掉协议+域名只留路径，保证始终同源翻页
    url = page.next ? page.next.replace(/^https?:\/\/[^/]+/, '') : ''
  }
  return out
}

/** 构造 multipart 表单 */
export function buildForm(
  fields: Record<string, string | Blob | undefined>,
  files: Record<string, File | File[]> = {},
): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.append(k, v)
  }
  for (const [k, v] of Object.entries(files)) {
    if (Array.isArray(v)) v.forEach((f) => fd.append(k, f))
    else fd.append(k, v)
  }
  return fd
}
