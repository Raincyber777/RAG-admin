/**
 * 管理员端内容监管数据（来自后端巡检接口 /api/admin/*，结构与用户端各页面一一对应）
 * 课堂纪要 / 问答记录 / 题库 / 问题反馈 / 看板统计
 * 各 ensure*Loaded 幂等去重：进入对应页面时拉取，已有数据不重复请求
 */
import { reactive, ref, computed } from 'vue'

import {
  notesAdminApi, qaAdminApi, quizAdminApi, feedbackAdminApi, statsApi,
  type ApiNote, type ApiQaRecord, type ApiQuizItem, type ApiFeedback,
  type DashboardWeekly, type DashboardEvent,
} from '@/api'
import { mediaUrl } from '@/api/http'

// ---------- 课堂纪要（对应用户端「课堂纪要 / 我的纪要」） ----------
export interface AdminNote {
  id: string
  title: string
  course: string
  uploader: string
  createdAt: string
  duration: string
  theme: string
  points: string[]
  definitions: string[]
  emphasized: string[]
}

export function noteFromApi(n: ApiNote): AdminNote {
  return {
    id: String(n.id),
    title: n.title,
    course: n.course,
    uploader: n.uploader_name,
    createdAt: n.created_at,
    duration: n.duration || '00:00',
    theme: n.theme,
    points: n.points.map((p) => p.text),
    definitions: n.definitions.map((d) => `${d.term}：${d.text}`),
    emphasized: [...n.emphasized],
  }
}

export const notes = reactive<AdminNote[]>([])

let notesInFlight: Promise<void> | null = null
export function ensureNotesLoaded(): Promise<void> {
  if (!notesInFlight) {
    notesInFlight = (async () => {
      try {
        const list = await notesAdminApi.list()
        notes.splice(0, notes.length, ...list.map(noteFromApi))
      } finally {
        notesInFlight = null
      }
    })()
  }
  return notesInFlight
}

// ---------- 问答记录（对应用户端「智能问答」） ----------
export interface QaSource {
  type: '录音' | '板书'
  label: string
}

export interface QaRecord {
  id: string
  question: string
  asker: string
  course: string
  noteTitle: string
  time: string
  rounds: number
  answer: string
  sources: QaSource[]
}

export function qaFromApi(r: ApiQaRecord): QaRecord {
  return {
    id: String(r.id),
    question: r.question,
    asker: r.user_name,
    course: r.course,
    noteTitle: r.note_title,
    time: r.created_at,
    rounds: 1, // 后端暂未记录追问轮次
    answer: r.answer,
    sources: (r.references ?? []).map((ref) => ({
      type: ref.time ? '录音' : '板书',
      label: ref.time ? `录音 ${ref.time}` : ref.detail || ref.label,
    })),
  }
}

export const qaRecords = reactive<QaRecord[]>([])

let qaInFlight: Promise<void> | null = null
export function ensureQaLoaded(): Promise<void> {
  if (!qaInFlight) {
    qaInFlight = (async () => {
      try {
        const list = await qaAdminApi.list()
        qaRecords.splice(0, qaRecords.length, ...list.map(qaFromApi))
      } finally {
        qaInFlight = null
      }
    })()
  }
  return qaInFlight
}

// ---------- 题库（对应用户端「自创题练习 / 错题本」） ----------
export type QuizType = '单选' | '多选' | '不定项' | '简答'

export interface QuizItem {
  id: string
  course: string
  chapter: string
  type: QuizType
  stem: string
  options?: string[]
  answer: string
  uploader: string
  createdAt: string
}

// 后端还有判断 / 填空题，管理端筛选与标签按 4 类展示，其余类型原样显示
const TYPE_TEXT: Record<ApiQuizItem['type'], string> = {
  single: '单选',
  multiple: '多选',
  indefinite: '不定项',
  judge: '判断',
  blank: '填空',
  answer: '简答',
}

export function quizFromApi(q: ApiQuizItem): QuizItem {
  return {
    id: String(q.id),
    course: q.course,
    chapter: q.chapter,
    type: TYPE_TEXT[q.type] as QuizType,
    stem: q.stem,
    options: q.options ?? undefined,
    answer: q.answer,
    uploader: q.uploader_name,
    createdAt: q.created_at,
  }
}

export const quizItems = reactive<QuizItem[]>([])

let quizInFlight: Promise<void> | null = null
export function ensureQuizLoaded(): Promise<void> {
  if (!quizInFlight) {
    quizInFlight = (async () => {
      try {
        const list = await quizAdminApi.list()
        quizItems.splice(0, quizItems.length, ...list.map(quizFromApi))
      } finally {
        quizInFlight = null
      }
    })()
  }
  return quizInFlight
}

// ---------- 问题反馈（对应用户端「问题反馈」：标题 + 详细描述 + 可选截图） ----------
export type FeedbackStatus = '待处理' | '已处理'

export interface FeedbackItem {
  id: string
  user: string
  title: string // 用户端填写的标题
  content: string // 用户端填写的详细描述
  images: string[] // 用户上传的截图（后端媒体地址）
  contact: string
  time: string
  status: FeedbackStatus
}

function feedbackFromApi(f: ApiFeedback): FeedbackItem {
  return {
    id: String(f.id),
    user: f.user_name,
    title: f.title,
    content: f.content,
    images: (f.images ?? []).map(mediaUrl),
    contact: f.contact,
    time: f.created_at,
    status: f.status === 'pending' ? '待处理' : '已处理',
  }
}

export const feedbacks = reactive<FeedbackItem[]>([])

let feedbacksInFlight: Promise<void> | null = null
export function ensureFeedbacksLoaded(): Promise<void> {
  if (!feedbacksInFlight) {
    feedbacksInFlight = (async () => {
      try {
        const list = await feedbackAdminApi.list()
        feedbacks.splice(0, feedbacks.length, ...list.map(feedbackFromApi))
      } finally {
        feedbacksInFlight = null
      }
    })()
  }
  return feedbacksInFlight
}

// ---------- 操作：删除纪要 / 标记反馈已处理（先调后端，成功后同步本地） ----------
export async function removeNote(id: string) {
  await notesAdminApi.remove(id)
  const i = notes.findIndex((n) => n.id === id)
  if (i >= 0) notes.splice(i, 1)
  // 后端级联删除了该纪要名下的问答与练习，重新拉取保持一致（刷新失败不影响删除结果）
  await Promise.all([ensureQaLoaded().catch(() => {}), ensureQuizLoaded().catch(() => {})])
}

export async function resolveFeedback(id: string) {
  await feedbackAdminApi.resolve(id)
  const f = feedbacks.find((x) => x.id === id)
  if (f) f.status = '已处理'
}

export const pendingFeedbackCount = () => feedbacks.filter((f) => f.status === '待处理').length

// ---------- 所属课程表 ----------
// courseList 保存用户端的「原始课程名」；管理端的改名是别名（alias），仅影响管理端显示：
// 例：用户端建了「高等数学12」，管理端改名为「高等数学」后，相关纪要 / 问答在管理端
// 全部归入「高等数学」显示，用户端仍显示「高等数学12」，原始数据不变。
export const courseList = computed(() => [...new Set(notes.map((n) => n.course))])

/** 原始课程名 → 管理端显示名（未改名的不在表内；别名仅存本地，用户端不受影响） */
const ALIAS_KEY = 'zy_course_alias'
export const courseAlias = ref<Record<string, string>>(loadAlias())

function loadAlias(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ALIAS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function persistAlias() {
  localStorage.setItem(ALIAS_KEY, JSON.stringify(courseAlias.value))
}

/** 管理端显示名：有别名用别名，否则显示原始名 */
export function courseDisplay(name: string): string {
  return courseAlias.value[name] || name
}

/** 管理端下拉中的课程（显示名去重，多个原始名归并到同一显示名时合并为一项） */
export const displayCourses = computed(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of courseList.value) {
    const d = courseAlias.value[c] || c
    if (!seen.has(d)) {
      seen.add(d)
      out.push(d)
    }
  }
  return out
})

/** 归入某显示名的全部原始课程名（供删除统计、弹窗展示用） */
export function originalsOf(display: string): string[] {
  return courseList.value.filter((c) => (courseAlias.value[c] || c) === display)
}

/**
 * 管理端重命名（别名合并）：只改管理端显示名，用户端名称与原始数据不变；
 * 新显示名与现有课程相同则合并显示。返回是否生效。
 */
export function renameCourseDisplay(oldDisplay: string, newDisplay: string): boolean {
  const trimmed = newDisplay.trim()
  if (!trimmed || trimmed === oldDisplay) return false
  let hit = false
  for (const c of courseList.value) {
    if ((courseAlias.value[c] || c) === oldDisplay) {
      courseAlias.value[c] = trimmed
      hit = true
    }
  }
  if (hit) persistAlias()
  return hit
}

/**
 * 删除课程（按管理端显示名）：归入该显示名的全部纪要逐一调后端删除
 * （名下问答 / 练习 / 错题由后端级联清除），成功后同步本地列表与别名表
 */
export async function removeCourseDisplay(display: string) {
  await ensureNotesLoaded()
  const originals = originalsOf(display)
  const targets = notes.filter((n) => originals.includes(n.course))
  for (const n of targets) {
    await notesAdminApi.remove(n.id)
  }
  courseAlias.value = Object.fromEntries(
    Object.entries(courseAlias.value).filter(([c]) => !originals.includes(c)),
  )
  persistAlias()
  // 后端级联删除了名下问答与练习，重新拉取保持一致（刷新失败不影响删除结果）
  await Promise.all([
    ensureNotesLoaded().catch(() => {}),
    ensureQaLoaded().catch(() => {}),
    ensureQuizLoaded().catch(() => {}),
  ])
}

// ---------- 看板统计（近 7 日问答量 / 最新动态：来自 /api/stats/dashboard/，失败显示空态） ----------
export const weeklyQa = ref<DashboardWeekly[]>([])
export const recentEvents = ref<DashboardEvent[]>([])
export const dashboardCounts = ref({ users_7d: 0, notes_7d: 0, qa_7d: 0 })

let dashboardLoading: Promise<void> | null = null
export function ensureDashboardLoaded(): Promise<void> {
  if (weeklyQa.value.length || dashboardLoading) return dashboardLoading ?? Promise.resolve()
  dashboardLoading = statsApi
    .dashboard()
    .then((d) => {
      weeklyQa.value = d.weekly ?? []
      recentEvents.value = d.events ?? []
      dashboardCounts.value = d.counts ?? dashboardCounts.value
    })
    .finally(() => {
      dashboardLoading = null
    })
  return dashboardLoading
}
