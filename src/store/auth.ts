/**
 * 管理员端登录态与账号 store（模块级 ref 单例）
 * 分权模型：账号角色 role —— user 普通用户 / admin 管理员 / super 超级管理员
 * 统一登录：不单独提供管理端登录页，管理员 / 超级管理员在用户端首页登录后
 * 由用户端携带 sso 参数（含 JWT）跳入管理端（acceptSso 建立会话）；工作台可一键回到用户端
 * 账号数据来自后端 /api/admin/accounts/；超级管理员可创建 / 停用账号、重置密码
 */
import { computed, reactive, ref } from 'vue'

import { accountsAdminApi, authApi, type ApiUser } from '@/api'
import { clearTokens, getRefresh, getToken, mediaUrl, saveTokens, setAuthExpiredHandler } from '@/api/http'

export type Role = 'user' | 'admin' | 'super'
export type AccountStatus = 'active' | 'disabled'

export interface Account {
  id: string
  name: string
  phone: string
  email: string
  /** 后端不回传密码，恒为空串（重置密码走接口） */
  password: string
  role: Role
  status: AccountStatus
  createdAt: string
  avatar?: string
  /** 用户侧统计（仅 role = user 的账号使用） */
  notes?: number
  questions?: number
}

export const USER_ORIGIN = 'http://localhost:5173'

const SESSION_KEY = 'zy_admin_session'

export interface Session {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
}

/** 全部账号（含普通用户，用户管理统一管理；进入相关页面时调 ensureAccountsLoaded 拉取） */
export const accounts = reactive<Account[]>([])

/** 当前登录的管理端会话 */
export const session = ref<Session | null>(readSession())
export const isSuper = computed(() => session.value?.role === 'super')

/** 当前登录账号的后端资料（ensureMe 拉取后同步会话） */
export const me = ref<ApiUser | null>(null)

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

/** 后端用户 → 管理端账号模型 */
export function accountFromApi(u: ApiUser): Account {
  return {
    id: String(u.id),
    name: u.name,
    phone: u.phone,
    email: u.email,
    password: '',
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    avatar: u.avatar ? mediaUrl(u.avatar) : undefined,
    notes: u.notes_count,
    questions: u.questions_count,
  }
}

// 登录过期（刷新失败）：清空本地登录态并跳回用户端登录
setAuthExpiredHandler(() => {
  clearTokens()
  localStorage.removeItem(SESSION_KEY)
  session.value = null
  me.value = null
  // 登录过期等同退出：带 ?logout=1 让用户端先清空本端残留会话，统一回到首页
  window.location.href = `${USER_ORIGIN}/login?logout=1`
})

export interface Result {
  ok: boolean
  msg?: string
}

/** 拉取全部账号（账号管理 / 工作台统计用；重复调用自动去重） */
let accountsInFlight: Promise<void> | null = null
export function ensureAccountsLoaded(): Promise<void> {
  if (!getToken()) return Promise.resolve()
  if (!accountsInFlight) {
    accountsInFlight = (async () => {
      try {
        const list = await accountsAdminApi.list()
        accounts.splice(0, accounts.length, ...list.map(accountFromApi))
      } finally {
        accountsInFlight = null
      }
    })()
  }
  return accountsInFlight
}

/** 拉取当前登录账号资料并同步会话（sso 进入时补全真实 id / 头像） */
export async function ensureMe(): Promise<ApiUser | null> {
  if (!getToken()) return null
  try {
    const u = await authApi.me()
    me.value = u
    session.value = {
      id: String(u.id),
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar ? mediaUrl(u.avatar) : undefined,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
    return u
  } catch {
    return null
  }
}

// 模块加载时恢复会话后补全资料（不阻塞渲染）
if (session.value) void ensureMe()

/**
 * 用户端携带 sso 参数进入管理端：按参数建立会话（含 JWT）
 * sso 必然发生在用户端刚登录之后，带 token 时直接覆盖本地旧 token
 * （本地残留失效 token 的旧会话也能借此自愈）；缺 token 的 sso 忽略
 */
export function acceptSso(q: { n?: string; e?: string; r?: string; t?: string; rt?: string }) {
  if (!q.t) return
  saveTokens(q.t, q.rt || '')
  const role: Role = q.r === 'super' ? 'super' : 'admin'
  session.value = {
    id: 'sso', // 占位，ensureMe 拉取资料后更新为真实 id
    name: q.n || '管理员',
    email: q.e || '',
    role,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
  void ensureMe()
}

/** 退出登录：通知后端拉黑 refresh（尽力而为），清除本地会话与 token */
export async function logoutAdmin() {
  const refresh = getRefresh()
  const access = getToken()
  // 用原生 fetch 通知后端拉黑 refresh：避免走统一请求封装时 401 触发「登录过期」跳转，
  // 覆盖退出登录自己的跳回地址（曾是退出后仍进应用的根因）
  if (refresh) {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
        body: JSON.stringify({ refresh }),
      })
    } catch {
      // 本地已退出，后端登出失败可忽略
    }
  }
  clearTokens()
  localStorage.removeItem(SESSION_KEY)
  session.value = null
  me.value = null
}

/** 超级管理员创建管理员账号（后端校验唯一性与密码强度） */
export async function createAdmin(form: { name: string; phone: string; email: string; password: string }): Promise<Result> {
  try {
    const u = await accountsAdminApi.create({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    accounts.unshift(accountFromApi(u))
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '创建失败，请稍后再试' }
  }
}

/** 重置任意账号密码（至少 8 位，后端校验） */
export async function resetPassword(acc: Account, next: string): Promise<Result> {
  try {
    await accountsAdminApi.resetPassword(acc.id, next)
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '重置失败，请稍后再试' }
  }
}

/** 停用 / 恢复账号（超级管理员与当前登录账号不可停用，后端校验） */
export async function toggleStatus(acc: Account): Promise<Result> {
  try {
    const u = await accountsAdminApi.toggleStatus(acc.id)
    acc.status = u.status
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '操作失败，请稍后再试' }
  }
}

/** 修改当前登录账号资料（name / phone / email），同时同步会话 */
export async function updateProfile(patch: { name?: string; phone?: string; email?: string }): Promise<Result> {
  try {
    const u = await authApi.updateMe(patch)
    applyUserToSession(u)
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '保存失败，请稍后再试' }
  }
}

/** 后端资料 → 会话（侧边栏实时更新） */
export function applyUserToSession(u: ApiUser) {
  me.value = u
  session.value = {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar ? mediaUrl(u.avatar) : undefined,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
}

/** 手机号 / 邮箱脱敏展示 */
export function maskPhone(p: string) {
  return p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
export function maskEmail(e: string) {
  const i = e.indexOf('@')
  return i <= 2 ? e : e.slice(0, 2) + '***' + e.slice(i)
}
