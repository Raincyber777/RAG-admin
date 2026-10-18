<script setup lang="ts">
/**
 * 公告管理（管理员 / 超级管理员）三个标签页：
 * - 公告列表：发布公告（标题+内容，发布需确认）、撤回（确认）、删除 / 批量删除（确认）、搜索 / 状态 / 时间筛选、分页
 * - 发布日志：谁在什么时间发布了什么公告（含已撤回的记录）
 * - 协议管理（仅超级管理员）：编辑《用户协议》/《隐私政策》，保存需确认；用户端立即生效
 */
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSelect from '@/components/AppSelect.vue'
import { isSuper } from '@/store/auth'
import {
  announcements, ensureAnnouncementsLoaded, publishAnnouncement, updateAnnouncement, withdrawAnnouncement,
  removeAnnouncement, batchRemoveAnnouncements, legalDocs, ensureLegalLoaded, saveLegalDoc,
} from '@/store/announcement'
import type { ApiAnnouncement } from '@/api'

onMounted(() => {
  void ensureAnnouncementsLoaded().catch(() => (loadError.value = '公告加载失败，请确认后端已启动'))
  if (isSuper.value) void ensureLegalLoaded().catch(() => (legalError.value = '协议内容加载失败，请确认后端已启动'))
})

const tab = ref<'list' | 'log' | 'legal'>('list')

// ---------- 筛选 + 分页 ----------
const keyword = ref('')
const statusFilter = ref('全部')
const timeFilter = ref('all')
const statusOptions = [
  { label: '全部状态', value: '全部' },
  { label: '已发布', value: '已发布' },
  { label: '已撤回', value: '已撤回' },
]
const timeOptions = [
  { label: '全部时间', value: 'all' },
  { label: '近 7 天', value: '7' },
  { label: '近 30 天', value: '30' },
  { label: '近 90 天', value: '90' },
]
const loadError = ref('')

function withinDays(a: ApiAnnouncement, days: number) {
  const t = new Date(a.created_at.replace(' ', 'T')).getTime()
  return Date.now() - t <= days * 86400000
}

const filtered = computed(() =>
  announcements.value.filter((a) => {
    if (statusFilter.value !== '全部' && a.status !== (statusFilter.value === '已发布' ? 'published' : 'withdrawn')) return false
    const days = Number(timeFilter.value)
    if (days && !withinDays(a, days)) return false
    const k = keyword.value.trim().toLowerCase()
    if (k && !(a.title.toLowerCase().includes(k) || a.content.toLowerCase().includes(k) || a.creator_name.toLowerCase().includes(k))) return false
    return true
  }),
)

const page = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const safePage = computed(() => Math.min(page.value, totalPages.value))
const paged = computed(() =>
  filtered.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value),
)
watch([keyword, statusFilter, timeFilter], () => {
  page.value = 1
})
function setPageSize(s: number) {
  pageSize.value = s
  page.value = 1
}

// ---------- 勾选与批量删除 ----------
const selected = ref<number[]>([])
const allPicked = computed(() => filtered.value.length > 0 && filtered.value.every((a) => selected.value.includes(a.id)))
function toggleAll() {
  selected.value = allPicked.value ? [] : filtered.value.map((a) => a.id)
}
function toggleOne(id: number) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
const confirmBatch = ref(false)
const batchError = ref('')
async function confirmBatchDelete() {
  try {
    await batchRemoveAnnouncements([...selected.value])
    selected.value = []
    confirmBatch.value = false
    batchError.value = ''
  } catch (e) {
    batchError.value = e instanceof Error ? e.message : '删除失败，请确认后端已启动'
  }
}

// ---------- 发布公告（编辑弹窗 → 确认弹窗 → 提交） ----------
const showPublish = ref(false)
const confirmPublish = ref(false)
const pubTitle = ref('')
const pubContent = ref('')
const pubError = ref('')
const publishing = ref(false)
function openPublish() {
  pubTitle.value = ''
  pubContent.value = ''
  pubError.value = ''
  showPublish.value = true
}
const canPublish = computed(() => !!(pubTitle.value.trim() && pubContent.value.trim()))
async function doPublish() {
  if (!canPublish.value || publishing.value) return
  publishing.value = true
  try {
    await publishAnnouncement(pubTitle.value.trim(), pubContent.value.trim())
    confirmPublish.value = false
    showPublish.value = false
  } catch (e) {
    pubError.value = e instanceof Error ? e.message : '发布失败，请确认后端已启动'
    confirmPublish.value = false
  } finally {
    publishing.value = false
  }
}

// ---------- 查看详情（点击卡片弹出完整内容） ----------
const detail = ref<ApiAnnouncement | null>(null)

// ---------- 编辑公告（预填原内容，仅改标题/内容，不改发布状态、不重新提醒） ----------
const editTarget = ref<ApiAnnouncement | null>(null)
const editTitle = ref('')
const editContent = ref('')
const editError = ref('')
const confirmEdit = ref(false)
const savingEdit = ref(false)
function openEdit(a: ApiAnnouncement) {
  editTarget.value = a
  editTitle.value = a.title
  editContent.value = a.content
  editError.value = ''
}
const canEdit = computed(() => !!(editTitle.value.trim() && editContent.value.trim()))
const editDirty = computed(() =>
  !!editTarget.value && (editTitle.value.trim() !== editTarget.value.title || editContent.value !== editTarget.value.content),
)
async function doEdit() {
  if (!editTarget.value || !canEdit.value || savingEdit.value) return
  savingEdit.value = true
  try {
    await updateAnnouncement(editTarget.value.id, editTitle.value.trim(), editContent.value)
    confirmEdit.value = false
    editTarget.value = null
    detail.value = null
  } catch (e) {
    editError.value = e instanceof Error ? e.message : '保存失败，请确认后端已启动'
    confirmEdit.value = false
  } finally {
    savingEdit.value = false
  }
}

// ---------- 撤回 / 删除（确认弹窗） ----------
const withdrawTarget = ref<ApiAnnouncement | null>(null)
const withdrawError = ref('')
async function confirmWithdraw() {
  if (!withdrawTarget.value) return
  try {
    await withdrawAnnouncement(withdrawTarget.value.id)
    withdrawTarget.value = null
    withdrawError.value = ''
  } catch (e) {
    withdrawError.value = e instanceof Error ? e.message : '撤回失败，请确认后端已启动'
  }
}
const deleteTarget = ref<ApiAnnouncement | null>(null)
const deleteError = ref('')
async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await removeAnnouncement(deleteTarget.value.id)
    selected.value = selected.value.filter((id) => id !== deleteTarget.value!.id)
    deleteTarget.value = null
    deleteError.value = ''
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : '删除失败，请确认后端已启动'
  }
}

// ---------- 发布日志（时间倒序，与列表同源） ----------
const logPage = ref(1)
const logPageSize = ref(10)
const logTotal = computed(() => Math.max(1, Math.ceil(announcements.value.length / logPageSize.value)))
const logSafePage = computed(() => Math.min(logPage.value, logTotal.value))
const logPaged = computed(() =>
  announcements.value.slice((logSafePage.value - 1) * logPageSize.value, logSafePage.value * logPageSize.value),
)
watch(tab, (t) => {
  if (t === 'log') logPage.value = 1
})

// ---------- 协议管理（仅超管） ----------
const legalTab = ref<'terms' | 'privacy'>('terms')
const draftTerms = ref('')
const draftPrivacy = ref('')
const draftsReady = ref(false)
const legalError = ref('')
const saveError = ref('')
const saveOk = ref(false)
let saveOkTimer: number | undefined

// legalDocs 加载完成后初始化草稿（仅一次；保存后内容一致无需重置）
watch([legalDocs, tab], () => {
  if (draftsReady.value) return
  if (legalDocs.value.terms && legalDocs.value.privacy) {
    draftTerms.value = legalDocs.value.terms.content
    draftPrivacy.value = legalDocs.value.privacy.content
    draftsReady.value = true
  }
}, { immediate: true })

const currentLegal = computed(() => legalDocs.value[legalTab.value])
// 可写 computed：textarea 的 v-model 需要能回写对应草稿
const draft = computed({
  get: () => (legalTab.value === 'terms' ? draftTerms.value : draftPrivacy.value),
  set: (v: string) => {
    if (legalTab.value === 'terms') draftTerms.value = v
    else draftPrivacy.value = v
  },
})
const draftDirty = computed(() => {
  const src = currentLegal.value
  return !src || draft.value !== src.content
})

const confirmSave = ref(false)
const saving = ref(false)
async function doSaveLegal() {
  saving.value = true
  saveError.value = ''
  try {
    await saveLegalDoc(legalTab.value, draft.value.trim())
    confirmSave.value = false
    saveOk.value = true
    if (saveOkTimer) window.clearTimeout(saveOkTimer)
    saveOkTimer = window.setTimeout(() => (saveOk.value = false), 2600)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '保存失败，请确认后端已启动'
    confirmSave.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">公告管理</h1>
      <p class="text-sm">发布公告与维护《用户协议》《隐私政策》，发布后的公告将提醒除发布者外的注册用户</p>
    </header>

    <!-- 标签页：公告列表 / 发布日志 / 协议管理（协议仅超管可见） -->
    <div class="seg-tabs main-tabs">
      <button class="seg-tab" :class="{ active: tab === 'list' }" @click="tab = 'list'">公告列表</button>
      <button class="seg-tab" :class="{ active: tab === 'log' }" @click="tab = 'log'">发布日志</button>
      <button v-if="isSuper" class="seg-tab" :class="{ active: tab === 'legal' }" @click="tab = 'legal'">协议管理</button>
    </div>

    <!-- ===== 标签页一：公告列表 ===== -->
    <template v-if="tab === 'list'">
      <div class="toolbar">
        <div class="toolbar-group">
          <div class="search-box">
            <AppIcon name="search" :size="15" class="search-ico" />
            <input v-model="keyword" class="input" placeholder="搜索公告标题 / 内容 / 发布人" />
          </div>
          <AppSelect v-model="statusFilter" :options="statusOptions" aria-label="按状态筛选" class="filter-select" />
          <AppSelect v-model="timeFilter" :options="timeOptions" aria-label="按时间筛选" class="filter-select" />
        </div>
        <div class="toolbar-group">
          <label class="pick-all">
            <input type="checkbox" :checked="allPicked" @change="toggleAll" /> 全选
          </label>
          <button class="btn btn-secondary btn-sm del-btn" :disabled="!selected.length" @click="confirmBatch = true">
            <AppIcon name="trash" :size="14" /> 批量删除{{ selected.length ? `（${selected.length}）` : '' }}
          </button>
          <button class="btn btn-primary btn-sm" @click="openPublish"><AppIcon name="horn" :size="14" /> 发布公告</button>
        </div>
      </div>

      <div v-if="loadError" class="card empty">{{ loadError }}</div>
      <div v-else class="ann-list">
        <div v-for="a in paged" :key="a.id" class="card ann-row">
          <input
            type="checkbox" class="ann-check" aria-label="选择该公告"
            :checked="selected.includes(a.id)" @change="toggleOne(a.id)"
          />
          <div class="ann-main" role="button" tabindex="0" title="查看完整内容" @click="detail = a" @keydown.enter="detail = a">
            <div class="ann-title-line">
              <span class="ann-title">{{ a.title }}</span>
              <span class="tag" :class="a.status === 'published' ? 'tag-green' : 'tag-gray'">
                {{ a.status === 'published' ? '已发布' : '已撤回' }}
              </span>
            </div>
            <p class="ann-content">{{ a.content }}</p>
            <div class="ann-meta">
              <span class="meta-item"><AppIcon name="user" :size="12" /> {{ a.creator_name || '未知' }}</span>
              <span class="meta-item"><AppIcon name="clock" :size="12" /> 发布于 {{ a.created_at }}</span>
              <span v-if="a.withdrawn_at" class="meta-item"><AppIcon name="x" :size="12" /> 撤回于 {{ a.withdrawn_at }}</span>
            </div>
          </div>
          <div class="ann-actions">
            <button class="btn btn-secondary btn-sm" @click="openEdit(a)"><AppIcon name="edit" :size="14" /> 编辑</button>
            <button v-if="a.status === 'published'" class="btn btn-secondary btn-sm" @click="withdrawTarget = a; withdrawError = ''">撤回</button>
            <button class="btn btn-secondary btn-sm del-btn" @click="deleteTarget = a; deleteError = ''"><AppIcon name="trash" :size="14" /> 删除</button>
          </div>
        </div>
        <div v-if="!filtered.length" class="card empty">
          <AppIcon name="horn" :size="16" /> {{ keyword || statusFilter !== '全部' || timeFilter !== 'all' ? '没有符合条件的公告' : '还没有公告，点击右上角「发布公告」开始' }}
        </div>
      </div>

      <div class="pager">
        <span class="pager-info">共 {{ filtered.length }} 条</span>
        <div class="pager-size">
          <span class="pager-label">每页</span>
          <div class="seg-tabs pager-tabs">
            <button v-for="s in [10, 20, 30]" :key="s" class="seg-tab" :class="{ active: pageSize === s }" @click="setPageSize(s)">{{ s }}</button>
          </div>
        </div>
        <div class="pager-nav">
          <button class="pager-btn" :disabled="safePage <= 1" aria-label="上一页" @click="page = safePage - 1"><AppIcon name="chevron-left" :size="14" /></button>
          <span class="pager-page">第 {{ safePage }} / {{ totalPages }} 页</span>
          <button class="pager-btn" :disabled="safePage >= totalPages" aria-label="下一页" @click="page = safePage + 1"><AppIcon name="chevron-right" :size="14" /></button>
        </div>
      </div>
    </template>

    <!-- ===== 标签页二：发布日志 ===== -->
    <template v-else-if="tab === 'log'">
      <div class="card log-card">
        <div v-for="a in logPaged" :key="a.id" class="log-row">
          <span class="log-dot" :class="{ off: a.status === 'withdrawn' }"></span>
          <p class="log-text">
            <b>{{ a.creator_name || '未知' }}</b> 于 {{ a.created_at }} 发布了公告《{{ a.title }}》
          </p>
          <span class="tag" :class="a.status === 'published' ? 'tag-green' : 'tag-gray'">
            {{ a.status === 'published' ? '已发布' : '已撤回' }}
          </span>
        </div>
        <div v-if="!announcements.length" class="empty">暂无公告记录</div>
      </div>

      <div class="pager">
        <span class="pager-info">共 {{ announcements.length }} 条</span>
        <div class="pager-nav">
          <button class="pager-btn" :disabled="logSafePage <= 1" aria-label="上一页" @click="logPage = logSafePage - 1"><AppIcon name="chevron-left" :size="14" /></button>
          <span class="pager-page">第 {{ logSafePage }} / {{ logTotal }} 页</span>
          <button class="pager-btn" :disabled="logSafePage >= logTotal" aria-label="下一页" @click="logPage = logSafePage + 1"><AppIcon name="chevron-right" :size="14" /></button>
        </div>
      </div>
    </template>

    <!-- ===== 标签页三：协议管理（仅超级管理员） ===== -->
    <template v-else>
      <div class="legal-head">
        <div class="seg-tabs legal-tabs">
          <button class="seg-tab" :class="{ active: legalTab === 'terms' }" @click="legalTab = 'terms'">用户协议</button>
          <button class="seg-tab" :class="{ active: legalTab === 'privacy' }" @click="legalTab = 'privacy'">隐私政策</button>
        </div>
        <p class="legal-meta">
          <template v-if="currentLegal?.is_default">当前为内置默认文案（尚未自定义），可直接修改后保存生效</template>
          <template v-else>
            最近更新：{{ currentLegal?.updated_at || '—' }}
            <template v-if="currentLegal?.updated_by"> · 修改人 {{ currentLegal.updated_by }}</template>
          </template>
        </p>
      </div>

      <div v-if="legalError" class="card empty">{{ legalError }}</div>
      <div v-else class="card legal-card">
        <textarea
          v-model="draft" class="textarea legal-textarea" rows="18" spellcheck="false"
          placeholder="每行一个段落；以「#」开头的行将作为小节标题展示。&#10;例如：&#10;# 服务说明&#10;智学纪要平台向注册用户提供……"
        ></textarea>
        <p class="legal-hint"><AppIcon name="info" :size="13" /> 保存后用户端《{{ legalTab === 'terms' ? '用户协议' : '隐私政策' }}》将立即展示新内容；留空不可保存。</p>
        <div class="legal-foot">
          <p v-if="saveError" class="hint-err">{{ saveError }}</p>
          <p v-if="saveOk" class="save-ok"><AppIcon name="check" :size="14" /> 已保存，用户端已生效</p>
          <span v-else-if="draftDirty" class="dirty-mark">有未保存的修改</span>
          <button class="btn btn-primary" :disabled="!draft.trim() || saving" @click="saveError = ''; confirmSave = true">
            <span v-if="saving" class="spinner"></span> 保存修改
          </button>
        </div>
      </div>
    </template>

    <!-- 发布公告编辑弹窗 -->
    <div v-if="showPublish" class="modal-mask" @click.self="showPublish = false">
      <div class="modal publish-modal">
        <div class="modal-title"><AppIcon name="horn" :size="15" /> 发布公告</div>
        <p class="modal-sub">发布后，除发布者外的注册用户将在下次登录时收到一次弹窗提醒。</p>
        <div class="field">
          <label class="field-label">公告标题</label>
          <input v-model="pubTitle" class="input" maxlength="100" placeholder="一句话概括本次公告（不超过 100 字）" />
        </div>
        <div class="field">
          <label class="field-label">公告内容</label>
          <textarea v-model="pubContent" class="textarea" rows="7" placeholder="正文支持换行，将原样展示给用户"></textarea>
        </div>
        <p v-if="pubError" class="modal-sub hint-err">{{ pubError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPublish = false">取消</button>
          <button class="btn btn-primary" :disabled="!canPublish" @click="confirmPublish = true">发布</button>
        </div>
      </div>
    </div>

    <!-- 发布确认弹窗 -->
    <div v-if="confirmPublish" class="modal-mask" @click.self="confirmPublish = false">
      <div class="modal modal-sm">
        <div class="modal-title">确认发布公告</div>
        <p class="modal-sub">确认发布该公告吗？发布后，除发布者外的注册用户登录时将收到一次弹窗提醒。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmPublish = false">再看看</button>
          <button class="btn btn-primary" :disabled="publishing" @click="doPublish">确认发布</button>
        </div>
      </div>
    </div>

    <!-- 公告详情弹窗（点击卡片查看完整内容） -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal detail-modal">
        <div class="detail-title-line">
          <div class="modal-title">{{ detail.title }}</div>
          <span class="tag" :class="detail.status === 'published' ? 'tag-green' : 'tag-gray'">
            {{ detail.status === 'published' ? '已发布' : '已撤回' }}
          </span>
        </div>
        <p class="modal-sub">
          发布人 {{ detail.creator_name || '未知' }} · 发布于 {{ detail.created_at }}
          <template v-if="detail.withdrawn_at"> · 撤回于 {{ detail.withdrawn_at }}</template>
        </p>
        <div class="detail-content">{{ detail.content }}</div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
          <button class="btn btn-primary" @click="openEdit(detail)"><AppIcon name="edit" :size="14" /> 编辑公告</button>
        </div>
      </div>
    </div>

    <!-- 编辑公告弹窗（预填原内容） -->
    <div v-if="editTarget" class="modal-mask" @click.self="editTarget = null">
      <div class="modal publish-modal">
        <div class="modal-title"><AppIcon name="edit" :size="15" /> 编辑公告</div>
        <p class="modal-sub">直接在原内容上修改并保存即可，修改不会重新发表，也不会再次弹窗提醒用户。</p>
        <div class="field">
          <label class="field-label">公告标题</label>
          <input v-model="editTitle" class="input" maxlength="100" placeholder="一句话概括本次公告（不超过 100 字）" />
        </div>
        <div class="field">
          <label class="field-label">公告内容</label>
          <textarea v-model="editContent" class="textarea" rows="7" placeholder="正文支持换行，将原样展示给用户"></textarea>
        </div>
        <p v-if="editError" class="modal-sub hint-err">{{ editError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="editTarget = null">取消</button>
          <button class="btn btn-primary" :disabled="!canEdit" @click="editDirty ? (confirmEdit = true) : (editTarget = null)">保存修改</button>
        </div>
      </div>
    </div>

    <!-- 编辑确认弹窗 -->
    <div v-if="confirmEdit" class="modal-mask" @click.self="confirmEdit = false">
      <div class="modal modal-sm">
        <div class="modal-title">确认修改公告</div>
        <p class="modal-sub">确认保存对公告《{{ editTarget?.title }}》的修改吗？修改对所有身份的用户即时生效，但不会重新弹窗提醒。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmEdit = false">再看看</button>
          <button class="btn btn-primary" :disabled="savingEdit" @click="doEdit">确认修改</button>
        </div>
      </div>
    </div>

    <!-- 撤回确认弹窗 -->
    <div v-if="withdrawTarget" class="modal-mask" @click.self="withdrawTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">撤回公告</div>
        <p class="modal-sub">撤回后用户端将不再展示该公告，确认撤回《{{ withdrawTarget.title }}》吗？</p>
        <p v-if="withdrawError" class="modal-sub hint-err">{{ withdrawError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="withdrawTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmWithdraw">确认撤回</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="modal-mask" @click.self="deleteTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">删除公告</div>
        <p class="modal-sub">删除后不可恢复，确认删除《{{ deleteTarget.title }}》吗？</p>
        <p v-if="deleteError" class="modal-sub hint-err">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="deleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 批量删除确认弹窗 -->
    <div v-if="confirmBatch" class="modal-mask" @click.self="confirmBatch = false">
      <div class="modal modal-sm">
        <div class="modal-title">批量删除公告</div>
        <p class="modal-sub">确认删除选中的 {{ selected.length }} 条公告吗？删除后不可恢复。</p>
        <p v-if="batchError" class="modal-sub hint-err">{{ batchError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmBatch = false">取消</button>
          <button class="btn btn-danger" @click="confirmBatchDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 协议保存确认弹窗 -->
    <div v-if="confirmSave" class="modal-mask" @click.self="confirmSave = false">
      <div class="modal modal-sm">
        <div class="modal-title">确认保存协议</div>
        <p class="modal-sub">确认保存对《{{ legalTab === 'terms' ? '用户协议' : '隐私政策' }}》的修改吗？保存后用户端将立即展示新内容。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmSave = false">再看看</button>
          <button class="btn btn-primary" :disabled="saving" @click="doSaveLegal">确认保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }

/* 标签页 */
.main-tabs { margin-bottom: 16px; }
.seg-tab { font-size: 13.5px; }

/* 工具栏 */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.toolbar-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.search-box { position: relative; width: 280px; max-width: 100%; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--stone); pointer-events: none; }
.search-box .input { padding-left: 32px; }
.filter-select { width: 140px; }
.pick-all { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--slate); cursor: pointer; user-select: none; }
.del-btn { color: #d92d20; }
.del-btn:hover { border-color: #d92d20; }
.del-btn:disabled { color: var(--stone); }

/* 公告列表 */
.ann-list { display: flex; flex-direction: column; gap: 10px; }
.ann-row { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; }
.ann-check { margin-top: 4px; flex-shrink: 0; width: 15px; height: 15px; accent-color: var(--primary); cursor: pointer; }
.ann-main { flex: 1; min-width: 0; cursor: pointer; border-radius: var(--radius-sm); }
.ann-main:hover .ann-title { color: var(--primary); }
.ann-main:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.ann-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ann-title { font-size: 14.5px; font-weight: 700; }
.ann-content { margin-top: 5px; font-size: 12.5px; color: var(--slate); line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ann-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 7px; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--slate); }
.ann-actions { display: flex; gap: 8px; flex-shrink: 0; }
.empty { text-align: center; color: var(--stone); padding: 36px 0; }
.empty svg { vertical-align: -3px; margin-right: 6px; }

/* 分页条 */
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.pager-info { font-size: 12.5px; color: var(--slate); }
.pager-size { display: flex; align-items: center; gap: 8px; }
.pager-label { font-size: 12.5px; color: var(--stone); }
.pager-tabs { border-bottom: none; }
.pager-tabs .seg-tab { padding: 4px 10px; font-size: 12px; }
.pager-nav { display: flex; align-items: center; gap: 8px; }
.pager-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--canvas); border: 1px solid var(--hairline-strong); border-radius: var(--radius-sm);
  color: var(--slate); cursor: pointer; transition: all 0.15s ease;
}
.pager-btn:hover:not(:disabled) { border-color: var(--steel); color: var(--ink); }
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-page { font-size: 12.5px; color: var(--slate); min-width: 72px; text-align: center; }

/* 发布日志 */
.log-card { padding: 8px 18px; }
.log-row { display: flex; align-items: center; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--hairline-soft); }
.log-row:last-child { border-bottom: none; }
.log-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-green); flex-shrink: 0; }
.log-dot.off { background: var(--stone); }
.log-text { flex: 1; min-width: 0; font-size: 13px; color: var(--slate); line-height: 1.6; }
.log-text b { color: var(--ink); font-weight: 700; }

/* 协议管理 */
.legal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.legal-tabs { border-bottom: none; }
.legal-meta { font-size: 12.5px; color: var(--stone); }
.legal-card { padding: 18px; }
.legal-textarea { font-size: 13px; line-height: 1.85; font-family: inherit; }
.legal-hint { display: flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 12px; color: var(--stone); }
.legal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--hairline-soft); }
.save-ok { display: flex; align-items: center; gap: 5px; color: var(--brand-green); font-size: 13px; font-weight: 600; }
.dirty-mark { font-size: 12.5px; color: var(--brand-orange); }
.hint-err { color: #d92d20; }

/* 发布弹窗 */
.publish-modal { max-width: 560px; width: 100%; }
.field { margin-top: 12px; }
.field-label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
.modal-actions { margin-top: 16px; }
.modal-sm { max-width: 440px; }

/* 详情弹窗（点击卡片查看完整内容） */
.detail-modal { max-width: 560px; width: 100%; }
.detail-title-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.detail-content {
  margin-top: 4px;
  padding: 14px 16px;
  background: var(--surface-soft);
  border: 1px solid var(--hairline-soft);
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--ink);
  white-space: pre-line;
  max-height: 320px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .ann-row { flex-direction: column; align-items: stretch; }
  .ann-actions { justify-content: flex-end; }
}
</style>
