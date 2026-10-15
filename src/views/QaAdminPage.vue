<script setup lang="ts">
/**
 * 问答记录：查看用户端智能问答的记录明细（问题 / 回答 / 溯源出处）
 * 与用户端问答页同构：每个回答都带录音时间戳或板书页码
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CourseSelect from '@/components/CourseSelect.vue'
import { qaRecords, courseDisplay, type QaRecord } from '@/store/admin'

const keyword = ref('')
const courseFilter = ref('全部')

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
const sourceTag = (t: string) => (t === '录音' ? 'tag-blue' : 'tag-yellow')
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
    </div>

    <div class="qa-list">
      <button v-for="q in paged" :key="q.id" class="card card-hover qa-row" @click="detail = q">
        <div class="qa-main">
          <div class="qa-question">{{ q.question }}</div>
          <div class="qa-meta">
            <span class="meta-item"><AppIcon name="user" :size="12" /> {{ q.asker }}</span>
            <span class="meta-item"><AppIcon name="book" :size="12" /> {{ q.noteTitle }}</span>
            <span class="meta-item"><AppIcon name="clock" :size="12" /> {{ q.time }}</span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="16" class="qa-arrow" />
      </button>
      <div v-if="!filtered.length" class="card empty">
        <AppIcon name="search" :size="16" /> 没有符合条件的问答记录
      </div>
    </div>

    <!-- 分页条：每页 10 / 20 / 30 条 -->
    <div class="pager">
      <span class="pager-info">共 {{ sorted.length }} 条</span>
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
        <p class="qa-q">{{ detail.question }}</p>
        <p class="modal-sub mb-sm">
          {{ detail.asker }} · {{ courseDisplay(detail.course) }} · 来自「{{ detail.noteTitle }}」 · {{ detail.time }}
        </p>
        <div class="answer">{{ detail.answer }}</div>
        <div class="src-row">
          <span class="src-label">溯源出处</span>
          <span v-for="s in detail.sources" :key="s.label" class="tag" :class="sourceTag(s.type)">
            <AppIcon :name="s.type === '录音' ? 'mic' : 'image'" :size="11" /> {{ s.label }}
          </span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
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
.qa-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--slate); }
.qa-arrow { color: var(--stone); flex-shrink: 0; }
.sort-tabs { flex-shrink: 0; }
.empty { text-align: center; color: var(--stone); padding: 36px 0; }
.empty svg { vertical-align: -3px; margin-right: 6px; }

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
.qa-modal { max-width: 600px; width: 100%; }
.qa-q { font-size: 15.5px; font-weight: 700; line-height: 1.55; margin-bottom: 8px; }
.modal-sub { color: var(--slate); line-height: 1.7; }
.answer {
  background: var(--surface-soft); border-radius: var(--radius-md);
  font-size: 13.5px; line-height: 1.8; color: var(--ink);
  padding: 14px 16px; margin-bottom: 14px;
}
.src-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.src-label { font-size: 12.5px; font-weight: 600; color: var(--slate); }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
}
</style>
