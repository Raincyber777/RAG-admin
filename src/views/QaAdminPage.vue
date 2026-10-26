<script setup lang="ts">
/**
 * 问答记录：查看用户端智能问答的记录明细（问题 / 回答 / 溯源出处）
 * 与用户端问答页同构：每个回答都带录音时间戳或板书页码
 */
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CourseSelect from '@/components/CourseSelect.vue'
import { qaRecords, removeQaRecords, ensureQaLoaded, courseDisplay, type QaRecord } from '@/store/admin'

const keyword = ref('')
const courseFilter = ref('全部')

// 加载失败不再静默变空列表：页面自身兜底加载 + 明确的失败态与重试（布局预载的错误会被吞掉）
const loadError = ref('')
async function reload() {
  loadError.value = ''
  try {
    await ensureQaLoaded()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '问答记录加载失败'
  }
}
onMounted(reload)

const filtered = computed(() =>
  qaRecords.filter((q) => {
    if (courseFilter.value !== '全部' && courseDisplay(q.course) !== courseFilter.value) return false
    const k = keyword.value.trim().toLowerCase()
    if (!k) return true
    return q.question.toLowerCase().includes(k) || q.asker.includes(k) || q.noteTitle.toLowerCase().includes(k)
  }),
)

// ---------- 排列：按时间（最新在前）/ 按热度（追问轮数多者优先） ----------
const sortBy = ref<'time' | 'hot'>('time')
const sorted = computed(() => {
  const arr = [...filtered.value]
  if (sortBy.value === 'hot') arr.sort((a, b) => b.rounds - a.rounds || b.time.localeCompare(a.time))
  else arr.sort((a, b) => b.time.localeCompare(a.time))
  return arr
})

// ---------- 分页（每页 10 / 20 / 30 条，筛选或搜索后回到第 1 页） ----------
const page = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const safePage = computed(() => Math.min(page.value, totalPages.value))
const paged = computed(() =>
  sorted.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value),
)
watch([keyword, courseFilter], () => {
  page.value = 1
})
function setPageSize(s: number) {
  pageSize.value = s
  page.value = 1
}

const detail = ref<QaRecord | null>(null)

// 回答渲染：先转义 HTML 再把网址链接化（可点击直达）；「—— 来源说明 ——」后的来源列表
// 单独分区小字弱化，与答复正文区分主次——与用户端问答页同款处理
const SOURCE_MARK = '—— 来源说明 ——'
function renderContent(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/https?:\/\/[^\s<>"'），。；、！？（()]+/g, (u) => `<a class="content-link" href="${u}" target="_blank" rel="noopener">${u}</a>`)
}
function renderAnswer(text: string) {
  const i = text.indexOf(SOURCE_MARK)
  if (i < 0) return renderContent(text)
  const body = renderContent(text.slice(0, i).replace(/\n+$/, ''))
  const src = renderContent(text.slice(i + SOURCE_MARK.length).replace(/^\n+/, ''))
  return `${body}<div class="src-note"><div class="src-note-title">来源说明</div>${src}</div>`
}

// ---------- 操作成功提示 ----------
const tip = ref('')
let tipTimer: number | undefined
function showTip(text: string) {
  tip.value = text
  if (tipTimer) window.clearTimeout(tipTimer)
  tipTimer = window.setTimeout(() => (tip.value = ''), 2400)
}

// ---------- 多选与批量删除 ----------
const selected = ref<string[]>([])
// 全选的口径是「当前筛选下的全部记录」（跨页）；半选态用于勾了一部分时的展示
const allChecked = computed(() => sorted.value.length > 0 && sorted.value.every((q) => selected.value.includes(q.id)))
const someChecked = computed(() => selected.value.length > 0 && !allChecked.value)
function toggleSelect(q: QaRecord) {
  const i = selected.value.indexOf(q.id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(q.id)
}
/** 一键全选 / 取消全选（跨页，含未翻到的记录，删除前弹窗会再次确认条数） */
function toggleSelectAll() {
  if (allChecked.value) selected.value = []
  else selected.value = sorted.value.map((q) => q.id)
}
// 筛选 / 切换排序后结果集变了，只保留仍在结果里的勾选，避免误删看不到的记录（翻页不清）
watch([keyword, courseFilter, sortBy], () => {
  const visible = new Set(sorted.value.map((q) => q.id))
  selected.value = selected.value.filter((id) => visible.has(id))
})

const showBatchDel = ref(false)
const batchBusy = ref(false)
const batchError = ref('')
async function confirmBatchDelete() {
  const count = selected.value.length
  if (!count || batchBusy.value) return
  batchBusy.value = true
  batchError.value = ''
  try {
    await removeQaRecords(selected.value)
    showBatchDel.value = false
    selected.value = []
    showTip(`已删除 ${count} 条问答记录`)
  } catch (e) {
    batchError.value = e instanceof Error ? e.message : '删除失败，请稍后再试'
  } finally {
    batchBusy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">问答记录</h1>
      <p class="text-sm">用户端智能问答记录（共 {{ qaRecords.length }} 条），可按时间 / 热度排列，查看回答与溯源出处</p>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <AppIcon name="search" :size="15" class="search-ico" />
        <input v-model="keyword" class="input" placeholder="搜索问题 / 提问人 / 所属纪要" />
      </div>
      <div class="seg-tabs sort-tabs">
        <button
          class="seg-tab" :class="{ active: sortBy === 'time' }"
          title="按提问时间从新到旧排列"
          @click="sortBy = 'time'"
        >按时间</button>
        <button
          class="seg-tab" :class="{ active: sortBy === 'hot' }"
          title="按追问轮数从多到少排列"
          @click="sortBy = 'hot'"
        >按热度</button>
      </div>
      <CourseSelect v-model="courseFilter" />
      <label class="sel-all">
        <input type="checkbox" class="row-check" :checked="allChecked" :indeterminate="someChecked" aria-label="全选全部记录" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <p v-if="tip" class="done-tip"><AppIcon name="check" :size="14" /> {{ tip }}</p>

    <div v-if="loadError" class="card empty load-error">
      <AppIcon name="x" :size="16" /> {{ loadError }}
      <button class="btn btn-secondary btn-sm" style="margin-left: 10px" @click="reload">重试</button>
    </div>

    <div v-if="selected.length" class="batch-bar">
      <span class="batch-count">已选 {{ selected.length }} 条记录</span>
      <button class="btn btn-danger btn-sm" @click="showBatchDel = true"><AppIcon name="trash" :size="13" /> 批量删除</button>
      <button class="btn btn-secondary btn-sm" @click="selected = []">取消选择</button>
    </div>

    <div class="qa-list">
      <div
        v-for="q in paged" :key="q.id"
        class="card card-hover qa-row"
        role="button" tabindex="0"
        :aria-label="`查看问答详情：${q.question}`"
        @click="detail = q"
        @keydown.enter.prevent="detail = q"
        @keydown.space.prevent="detail = q"
      >
        <label class="qa-check" @click.stop>
          <input type="checkbox" class="row-check" :checked="selected.includes(q.id)" :aria-label="`选择：${q.question}`" @change="toggleSelect(q)" />
        </label>
        <div class="qa-main">
          <div class="qa-question">{{ q.question }}</div>
          <div class="qa-meta">{{ q.asker }} · {{ q.noteTitle }} · {{ q.time }}</div>
        </div>
        <AppIcon name="chevron-right" :size="16" class="qa-arrow" />
      </div>
      <div v-if="!loadError && !filtered.length" class="card empty">
        <AppIcon name="search" :size="16" /> 没有符合条件的问答记录
      </div>
    </div>

    <!-- 分页条：共 N 条 + 每页 10 / 20 / 30 条（全选在顶部工具栏） -->
    <div class="pager">
      <div class="pager-info">
        共 {{ sorted.length }} 条
      </div>
      <div class="pager-size">
        <span class="pager-label">每页</span>
        <div class="seg-tabs">
          <button
            v-for="s in [10, 20, 30]" :key="s"
            class="seg-tab" :class="{ active: pageSize === s }"
            @click="setPageSize(s)"
          >{{ s }}</button>
        </div>
      </div>
      <div class="pager-nav">
        <button class="pager-btn" :disabled="safePage <= 1" aria-label="上一页" @click="page = safePage - 1">
          <AppIcon name="chevron-left" :size="14" />
        </button>
        <span class="pager-page">第 {{ safePage }} / {{ totalPages }} 页</span>
        <button class="pager-btn" :disabled="safePage >= totalPages" aria-label="下一页" @click="page = safePage + 1">
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- 问答详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal qa-modal">
        <div class="modal-title">问答详情</div>
        <div class="qa-q">{{ detail.question }}</div>
        <p class="modal-sub mb-sm">
          {{ detail.asker }} · {{ courseDisplay(detail.course) }} · 来自「{{ detail.noteTitle }}」 · {{ detail.time }}
        </p>
        <div class="answer" v-html="renderAnswer(detail.answer)"></div>
        <div class="src-block">
          <div class="src-label">溯源出处</div>
          <div class="src-chips">
            <template v-if="detail.sources.length">
              <span v-for="(s, i) in detail.sources" :key="i" class="src-chip">{{ s.label }}</span>
            </template>
            <span v-else class="src-none">无</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 批量删除确认弹窗 -->
    <div v-if="showBatchDel" class="modal-mask" @click.self="showBatchDel = false">
      <div class="modal modal-sm">
        <div class="modal-title">批量删除问答记录</div>
        <p class="modal-sub">确定删除选中的 {{ selected.length }} 条问答记录吗？名下的反馈记录将一并清除，此操作不可恢复。</p>
        <p v-if="batchError" class="hint-err">{{ batchError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showBatchDel = false">取消</button>
          <button class="btn btn-danger" :disabled="batchBusy" @click="confirmBatchDelete">{{ batchBusy ? '删除中…' : '确认删除' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.search-box { position: relative; width: 300px; max-width: 100%; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--stone); pointer-events: none; }
.search-box .input { padding-left: 32px; }

.qa-list { display: flex; flex-direction: column; gap: 10px; }
.qa-row { display: flex; align-items: center; gap: 14px; padding: 15px 18px; cursor: pointer; width: 100%; text-align: left; }
.qa-main { flex: 1; min-width: 0; }
.qa-question { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.qa-meta { font-size: 12px; color: var(--slate); }
.qa-arrow { color: var(--stone); flex-shrink: 0; }
.sort-tabs { flex-shrink: 0; }

/* 多选批量操作 */
.done-tip { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-purple-800, #4a3bc7); background: var(--tint-lavender, #efecfd); border-radius: var(--radius-md); padding: 8px 14px; margin-bottom: 12px; }
.batch-bar { display: flex; align-items: center; gap: 10px; background: var(--tint-rose, #feeceb); border-radius: var(--radius-md); padding: 9px 14px; margin-bottom: 12px; }
.batch-count { font-size: 13px; font-weight: 600; color: #d92d20; margin-right: auto; }
.qa-check { display: flex; align-items: center; flex-shrink: 0; cursor: pointer; }
.row-check { width: 17px; height: 17px; accent-color: var(--brand-purple, #5645d4); cursor: pointer; }
.sel-all { display: inline-flex; align-items: center; gap: 6px; margin-left: 12px; cursor: pointer; user-select: none; }
.modal-sm { max-width: 440px; width: 100%; }
.hint-err { font-size: 13px; color: #d92d20; margin-bottom: 10px; }

.empty { text-align: center; color: var(--stone); padding: 36px 0; }
.empty svg { vertical-align: -3px; margin-right: 6px; }
.load-error { color: var(--error); padding: 24px 0; }

/* 分页条 */
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.pager-info { font-size: 12.5px; color: var(--slate); }
.pager-size { display: flex; align-items: center; gap: 8px; }
.pager-label { font-size: 12.5px; color: var(--stone); }
.pager-size .seg-tab { padding: 4px 10px; font-size: 12px; }
.pager-nav { display: flex; align-items: center; gap: 8px; }
.pager-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--canvas); border: 1px solid var(--hairline-strong); border-radius: var(--radius-sm);
  color: var(--slate); cursor: pointer; transition: all 0.15s ease;
}
.pager-btn:hover:not(:disabled) { border-color: var(--steel); color: var(--ink); }
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-page { font-size: 12.5px; color: var(--slate); min-width: 72px; text-align: center; }

/* 详情弹窗 */
.qa-modal { max-width: 640px; width: 100%; }
.qa-q {
  font-size: 15px; font-weight: 600; line-height: 1.6; margin-bottom: 8px;
  max-height: 150px; overflow-y: auto; /* 长提问截高滚动，不撑爆弹窗 */
}
.modal-sub { color: var(--slate); line-height: 1.7; }
.answer {
  background: var(--surface-soft); border-radius: var(--radius-md);
  font-size: 13.5px; line-height: 1.8; color: var(--ink);
  padding: 14px 16px; margin-bottom: 14px;
  max-height: 340px; overflow-y: auto; /* 长回答滚动查看 */
  white-space: pre-wrap; overflow-wrap: anywhere; /* 保留换行；长网址可断行 */
}
.answer::-webkit-scrollbar, .qa-q::-webkit-scrollbar { width: 6px; }
.answer::-webkit-scrollbar-thumb, .qa-q::-webkit-scrollbar-thumb {
  background: var(--hairline-strong); border-radius: 999px;
}
/* 网址链接化：蓝色可点击直达（与用户端问答页同款） */
.answer :deep(a.content-link) { color: var(--primary); word-break: break-all; }
.answer :deep(a.content-link:hover) { text-decoration: underline; }
/* 来源说明分区（v-html 内容需 :deep）：小字灰字弱化，与正文区分主次 */
.answer :deep(.src-note) {
  margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--hairline-strong);
  font-size: 12px; line-height: 1.7; color: var(--slate);
}
.answer :deep(.src-note-title) { font-weight: 600; color: var(--slate); margin-bottom: 2px; }
.src-block { margin-bottom: 4px; }
.src-label { font-size: 12.5px; font-weight: 600; color: var(--slate); margin-bottom: 8px; }
.src-chips { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.src-chip {
  font-size: 12px; color: var(--slate); background: var(--surface-soft);
  border: 1px solid var(--hairline); border-radius: 999px; padding: 3px 10px;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.src-none { font-size: 12.5px; color: var(--stone); }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
}
</style>
