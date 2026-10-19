/**
 * 后端接口清单（管理端用；与用户端共享认证与纪要等数据结构）
 * 管理端专用：/api/admin/*（账号 / 巡检 / 反馈处理 / FAQ 维护）与 /api/stats/summary/（平台口径）
 */
import { request, listAll, buildForm } from './http'

export type ApiRole = 'user' | 'admin' | 'super'

// ---------- 认证（两端共用） ----------
export interface ApiUser {
  id: number
  name: string
  phone: string
  email: string
  role: ApiRole
  status: 'active' | 'disabled'
  avatar: string
  notes_count: number
  questions_count: number
  created_at: string
}

export interface AuthPayload {
  access: string
  refresh: string
  user: ApiUser
}

export const authApi = {
  login: (account: string, password: string) =>
    request<AuthPayload>('/auth/login/', { method: 'POST', data: { account, password } }),
  logout: (refresh: string) => request<void>('/auth/logout/', { method: 'POST', data: { refresh } }),
  me: () => request<ApiUser>('/auth/me/'),
  updateMe: (patch: Record<string, string>) =>
    request<ApiUser>('/auth/me/', { method: 'PATCH', data: patch }),
  updateAvatar: (file: File) => {
    const fd = buildForm({}, { avatar: file })
    return request<ApiUser>('/auth/me/', { method: 'PATCH', form: fd })
  },
  changePassword: (old_password: string, new_password: string) =>
    request<void>('/auth/password/', { method: 'POST', data: { old_password, new_password } }),
}

// ---------- 管理端：账号管理 ----------
export const accountsAdminApi = {
  list: (params: { role?: string; status?: string; search?: string } = {}) =>
    listAll<ApiUser>('/admin/accounts/', {
      ...(params.role ? { role: params.role } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { search: params.search } : {}),
    }),
  create: (form: { name: string; phone: string; email: string; password: string }) =>
    request<ApiUser>('/admin/accounts/create/', { method: 'POST', data: form }),
  resetPassword: (id: string, password: string) =>
    request<{ detail: string }>(`/admin/accounts/${id}/reset_password/`, { method: 'POST', data: { password } }),
  toggleStatus: (id: string) =>
    request<ApiUser>(`/admin/accounts/${id}/toggle_status/`, { method: 'POST' }),
}

// ---------- 课堂纪要（巡检 / 删除） ----------
export interface ApiNote {
  id: number
  course: string
  title: string
  duration: string
  status: 'processing' | 'done' | 'failed'
  uploader: number
  uploader_name: string
  source: string
  source_type: string
  theme: string
  points: { text: string; ref: string }[]
  definitions: { term: string; text: string; ref: string }[]
  emphasized: string[]
  transcript: string
  questions: number
  created_at: string
  updated_at: string
}

export const notesAdminApi = {
  list: (params: { course?: string; search?: string } = {}) =>
    listAll<ApiNote>('/admin/notes/', {
      ...(params.course ? { course: params.course } : {}),
      ...(params.search ? { search: params.search } : {}),
    }),
  remove: (id: string) => request<void>(`/notes/${id}/`, { method: 'DELETE' }),
}

// ---------- 问答记录（巡检） ----------
export interface ApiQaRecord {
  id: number
  note: number | null
  note_title: string
  course: string
  user_name: string
  question: string
  answer: string
  references: { label: string; time: string; detail: string }[]
  liked: boolean
  created_at: string
}

export const qaAdminApi = {
  list: (params: { search?: string } = {}) =>
    listAll<ApiQaRecord>('/admin/qa/', params.search ? { search: params.search } : {}),
}

// ---------- 题库（巡检） ----------
export type ApiQuizType = 'single' | 'multiple' | 'indefinite' | 'judge' | 'blank' | 'answer'

export interface ApiQuizItem {
  id: number
  note: number | null
  course: string
  chapter: string
  type: ApiQuizType
  stem: string
  options: string[] | null
  answer: string
  analysis: string
  uploader: number
  uploader_name: string
  created_at: string
}

export const quizAdminApi = {
  list: (params: { course?: string; type?: string; search?: string } = {}) =>
    listAll<ApiQuizItem>('/admin/quiz/', {
      ...(params.course ? { course: params.course } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.search ? { search: params.search } : {}),
    }),
}

// ---------- 问题反馈（巡检 / 标记已处理） ----------
export interface ApiFeedback {
  id: number
  title: string
  content: string
  contact: string
  images: string[]
  status: 'pending' | 'resolved'
  user: number
  user_name: string
  user_email: string
  created_at: string
}

export const feedbackAdminApi = {
  list: (params: { status?: string } = {}) =>
    listAll<ApiFeedback>('/admin/feedbacks/', params.status ? { status: params.status } : {}),
  resolve: (id: string) => request<ApiFeedback>(`/admin/feedbacks/${id}/resolve/`, { method: 'POST' }),
}

// ---------- 常见问题 / 使用技巧（工作台维护；管理员可维护用户端与首页内容，管理端内容仅超管可写） ----------
/** FAQ 展示位：用户端使用说明 / 管理端使用说明 / 用户端首页 */
export type FaqScopeOption = 'user' | 'admin' | 'home'

export interface ApiFaq {
  id: number
  scope: FaqScopeOption
  q: string
  a: string
  order: number
}

export interface ApiTip {
  id: number
  scope: 'user' | 'admin'
  text: string
  order: number
}

export const faqAdminApi = {
  list: (scope?: FaqScopeOption) =>
    listAll<ApiFaq>('/admin/faqs/', scope ? { scope } : {}),
  create: (data: { scope: FaqScopeOption; q: string; a: string; order?: number }) =>
    request<ApiFaq>('/admin/faqs/', { method: 'POST', data }),
  update: (id: string, patch: { q?: string; a?: string; scope?: FaqScopeOption; order?: number }) =>
    request<ApiFaq>(`/admin/faqs/${id}/`, { method: 'PUT', data: patch }),
  remove: (id: string) => request<void>(`/admin/faqs/${id}/`, { method: 'DELETE' }),
}

export const tipsAdminApi = {
  list: (scope?: 'user' | 'admin') =>
    listAll<ApiTip>('/admin/tips/', scope ? { scope } : {}),
  create: (data: { scope: 'user' | 'admin'; text: string; order?: number }) =>
    request<ApiTip>('/admin/tips/', { method: 'POST', data }),
  update: (id: string, patch: { text?: string; scope?: 'user' | 'admin'; order?: number }) =>
    request<ApiTip>(`/admin/tips/${id}/`, { method: 'PUT', data: patch }),
  remove: (id: string) => request<void>(`/admin/tips/${id}/`, { method: 'DELETE' }),
}

// ---------- 数据速览（平台口径） ----------
export interface PlatformStats {
  scope: 'platform'
  users: number
  notes: number
  qa_records: number
  pending_feedbacks: number
  quiz_items: number
}

export const statsApi = {
  summary: () => request<PlatformStats>('/stats/summary/'),
  dashboard: () => request<DashboardData>('/stats/dashboard/'),
}

// ---------- 数据看板聚合（近 7 日问答量 / 最新动态 / 7 日增量） ----------
export interface DashboardWeekly {
  day: string
  count: number
}
export interface DashboardEvent {
  time: string
  text: string
}
export interface DashboardData {
  weekly: DashboardWeekly[]
  events: DashboardEvent[]
  counts: { users_7d: number; notes_7d: number; qa_7d: number }
}

// ---------- 公告与协议 ----------
export interface ApiAnnouncement {
  id: number
  title: string
  content: string
  status: 'published' | 'withdrawn'
  creator_name: string
  created_at: string
  withdrawn_at: string | null
}

export interface LegalDocState {
  content: string
  updated_at: string | null
  updated_by?: string
  is_default?: boolean
}

export const announcementsAdminApi = {
  list: () => listAll<ApiAnnouncement>('/admin/announcements/'),
  create: (data: { title: string; content: string }) =>
    request<ApiAnnouncement>('/admin/announcements/', { method: 'POST', data }),
  update: (id: number, data: { title: string; content: string }) =>
    request<ApiAnnouncement>(`/admin/announcements/${id}/`, { method: 'PUT', data }),
  withdraw: (id: number) =>
    request<ApiAnnouncement>(`/admin/announcements/${id}/withdraw/`, { method: 'POST' }),
  remove: (id: number) => request<void>(`/admin/announcements/${id}/`, { method: 'DELETE' }),
  batchDelete: (ids: number[]) =>
    request<{ detail: string; deleted: number }>('/admin/announcements/batch_delete/', { method: 'POST', data: { ids } }),
  unread: () => request<{ count: number; latest: ApiAnnouncement | null }>('/announcements/unread/'),
  markAllRead: () => request<{ detail: string }>('/announcements/read/', { method: 'POST', data: { all: true } }),
}

export const legalAdminApi = {
  get: (key: 'terms' | 'privacy') => request<LegalDocState>(`/admin/legal/${key}/`),
  save: (key: 'terms' | 'privacy', content: string) =>
    request<LegalDocState>(`/admin/legal/${key}/`, { method: 'PUT', data: { content } }),
}
