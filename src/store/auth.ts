/**
 * 管理员端登录态与账号 store（模块级 ref 单例）
 * 分权模型：账号角色 role —— user 普通用户 / admin 管理员 / super 超级管理员
 * 统一登录：不单独提供管理端登录页，管理员 / 超级管理员在用户端首页登录后
 * 由用户端携带 sso 参数跳入管理端（acceptSso 建立会话）；工作台可一键回到用户端
 * 超级管理员可创建 / 停用管理员账号；管理员与用户一样维护个人资料与密码
 * 演示环境：账号数据持久化在 localStorage（键名与用户端约定一致），接入后端后由接口校验
 */
import { computed, reactive, ref } from 'vue'

export type Role = 'user' | 'admin' | 'super'
export type AccountStatus = 'active' | 'disabled'

export interface Account {
  id: string
  name: string
  phone: string
  email: string
  password: string
  role: Role
  status: AccountStatus
  createdAt: string
  /** 头像（本地预览 URL，演示用） */
  avatar?: string
  /** 用户侧统计（仅 role = user 的账号使用） */
  notes?: number
  questions?: number
}

export const USER_ORIGIN = 'http://localhost:5173'

const TOKEN_KEY = 'zy_admin_token'
const SESSION_KEY = 'zy_admin_session'
const ACCOUNTS_KEY = 'zy_accounts'

export interface Session {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
}

/** 全部账号（含普通用户，供用户管理复用同一份数据） */
export const accounts = reactive<Account[]>([])

/** 当前登录的管理端会话 */
export const session = ref<Session | null>(null)
export const isSuper = computed(() => session.value?.role === 'super')

const SEED_ACCOUNTS: Account[] = [
  // ---- 管理员（超级管理员可创建 / 管理） ----
  { id: 'a1', name: '超级管理员', phone: '13800000001', email: 'admin@zhiyuan.ai', password: 'admin123456', role: 'super', status: 'active', createdAt: '2026-08-01' },
  { id: 'a2', name: '陈教务', phone: '13800000002', email: 'chenjw@zhiyuan.ai', password: 'admin123456', role: 'admin', status: 'active', createdAt: '2026-08-03' },
  { id: 'a3', name: '刘运营', phone: '13800000003', email: 'liuyy@zhiyuan.ai', password: 'admin123456', role: 'admin', status: 'active', createdAt: '2026-09-12' },
  { id: 'a4', name: '周实习', phone: '13800000004', email: 'zhousx@zhiyuan.ai', password: 'admin123456', role: 'admin', status: 'disabled', createdAt: '2026-09-28' },
  // ---- 普通用户（用户管理演示数据，与用户端同学昵称保持一致） ----
  { id: 'u1', name: '林小智', phone: '13800001001', email: 'linxz@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-08-01', notes: 12, questions: 326 },
  { id: 'u2', name: '陈雨桐', phone: '13800001002', email: 'chyt@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-08-03', notes: 9, questions: 158 },
  { id: 'u3', name: '王梓萌', phone: '13800001003', email: 'wzmm@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-08-15', notes: 7, questions: 89 },
  { id: 'u4', name: '李思远', phone: '13800001004', email: 'lsy@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-09-02', notes: 5, questions: 204 },
  { id: 'u5', name: '赵一诺', phone: '13800001005', email: 'zyn@zhiyuan.ai', password: '123456', role: 'user', status: 'disabled', createdAt: '2026-09-20', notes: 2, questions: 12 },
  { id: 'u6', name: '周子航', phone: '13800001006', email: 'zzh@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-09-28', notes: 8, questions: 45 },
  { id: 'u7', name: '吴佳琪', phone: '13800001007', email: 'wjq@zhiyuan.ai', password: '123456', role: 'user', status: 'active', createdAt: '2026-10-01', notes: 4, questions: 67 },
  { id: 'u8', name: '郑博文', phone: '13800001008', email: 'zbw@zhiyuan.ai', password: '123456', role: 'user', status: 'disabled', createdAt: '2026-10-09', notes: 1, questions: 2 },
]

// 初始化：优先读取本地持久化的账号库，否则写入种子数据
const savedAccounts = localStorage.getItem(ACCOUNTS_KEY)
if (savedAccounts) {
  try {
    accounts.push(...(JSON.parse(savedAccounts) as Account[]))
  } catch {
    accounts.push(...SEED_ACCOUNTS)
    persistAccounts()
  }
} else {
  accounts.push(...SEED_ACCOUNTS)
  persistAccounts()
}

function persistAccounts() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

// 恢复会话
const savedSession = localStorage.getItem(SESSION_KEY)
if (savedSession) {
  try {
    session.value = JSON.parse(savedSession) as Session
  } catch {
    session.value = null
  }
}

export interface Result {
  ok: boolean
  msg?: string
}

/** 用户端携带 sso 参数进入管理端：已有会话则忽略，否则按参数建立会话 */
export function acceptSso(q: { n?: string; e?: string; r?: string }) {
  if (localStorage.getItem(TOKEN_KEY) && session.value) return
  localStorage.setItem(TOKEN_KEY, 'demo-admin-token')
  const acc = q.e ? accounts.find((a) => a.email === q.e) : undefined
  session.value = {
    id: acc?.id ?? 'sso',
    name: q.n || acc?.name || '管理员',
    email: q.e || acc?.email || '',
    role: q.r === 'super' ? 'super' : 'admin',
    avatar: acc?.avatar,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
}

export function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
  session.value = null
}

/** 超级管理员创建管理员账号（新账号固定为 admin 角色） */
export function createAdmin(form: { name: string; phone: string; email: string; password: string }): Result {
  const name = form.name.trim()
  const phone = form.phone.trim()
  const email = form.email.trim()
  if (accounts.some((a) => a.phone === phone)) return { ok: false, msg: '该手机号已被其他账号使用' }
  if (accounts.some((a) => a.email === email)) return { ok: false, msg: '该邮箱已被其他账号使用' }
  const acc: Account = {
    id: 'a' + Date.now().toString(36),
    name,
    phone,
    email,
    password: form.password,
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  accounts.push(acc)
  persistAccounts()
  return { ok: true }
}

export function resetPassword(acc: Account, next: string) {
  acc.password = next
  persistAccounts()
}

export function toggleStatus(acc: Account) {
  acc.status = acc.status === 'active' ? 'disabled' : 'active'
  persistAccounts()
}

/** 修改当前登录账号的资料（同时同步会话，侧边栏实时更新） */
export function updateProfile(patch: Partial<Pick<Account, 'name' | 'phone' | 'email' | 'avatar'>>) {
  const me = session.value ? accounts.find((a) => a.id === session.value?.id) : undefined
  if (!me || !session.value) return
  Object.assign(me, patch)
  if (patch.name) session.value.name = patch.name
  if (patch.avatar !== undefined) session.value.avatar = patch.avatar
  session.value = { ...session.value }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
  persistAccounts()
}

/** 手机号 / 邮箱脱敏展示 */
export function maskPhone(p: string) {
  return p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
export function maskEmail(e: string) {
  const i = e.indexOf('@')
  return i <= 2 ? e : e.slice(0, 2) + '***' + e.slice(i)
}
