/**
 * 公告管理状态（管理端）：
 * - 公告列表 + 发布 / 撤回 / 删除 / 批量删除（含确认后的实际调用）
 * - 《用户协议》/《隐私政策》文档读写（仅超级管理员可见「协议管理」标签）
 * - 未读角标与登录公告弹窗：管理员账号同样会收到除本人发布外的新公告提醒
 */
import { ref } from 'vue'
import { announcementsAdminApi, legalAdminApi, type ApiAnnouncement, type LegalDocState } from '@/api'

// ---------- 公告列表 ----------
export const announcements = ref<ApiAnnouncement[]>([])
let loaded = false

export async function ensureAnnouncementsLoaded() {
  if (loaded) return
  announcements.value = await announcementsAdminApi.list()
  loaded = true
}

export async function publishAnnouncement(title: string, content: string) {
  const a = await announcementsAdminApi.create({ title, content })
  announcements.value = [a, ...announcements.value]
  return a
}

export async function updateAnnouncement(id: number, title: string, content: string) {
  const a = await announcementsAdminApi.update(id, { title, content })
  const idx = announcements.value.findIndex((x) => x.id === id)
  if (idx >= 0) announcements.value[idx] = a
  return a
}

export async function withdrawAnnouncement(id: number) {
  const a = await announcementsAdminApi.withdraw(id)
  const idx = announcements.value.findIndex((x) => x.id === id)
  if (idx >= 0) announcements.value[idx] = a
  return a
}

export async function removeAnnouncement(id: number) {
  await announcementsAdminApi.remove(id)
  announcements.value = announcements.value.filter((a) => a.id !== id)
}

export async function batchRemoveAnnouncements(ids: number[]) {
  await announcementsAdminApi.batchDelete(ids)
  const set = new Set(ids)
  announcements.value = announcements.value.filter((a) => !set.has(a.id))
}

// ---------- 协议文档（仅超管） ----------
export const legalDocs = ref<{ terms: LegalDocState | null; privacy: LegalDocState | null }>({
  terms: null,
  privacy: null,
})
let legalLoaded = false

export async function ensureLegalLoaded() {
  if (legalLoaded) return
  const [terms, privacy] = await Promise.all([legalAdminApi.get('terms'), legalAdminApi.get('privacy')])
  legalDocs.value = { terms, privacy }
  legalLoaded = true
}

export async function saveLegalDoc(key: 'terms' | 'privacy', content: string) {
  const r = await legalAdminApi.save(key, content)
  legalDocs.value[key] = r
  return r
}

// ---------- 未读角标与登录公告弹窗 ----------
export const unreadCount = ref(0)
export const pendingAnnouncement = ref<ApiAnnouncement | null>(null)

export async function refreshUnread() {
  try {
    const r = await announcementsAdminApi.unread()
    unreadCount.value = r.count
    pendingAnnouncement.value = r.latest
  } catch {
    // 公告拉取失败不打扰主流程
  }
}

export async function markAllRead() {
  pendingAnnouncement.value = null
  try {
    await announcementsAdminApi.markAllRead()
  } catch {
    // 忽略：本地已先收起弹窗
  }
  unreadCount.value = 0
}
