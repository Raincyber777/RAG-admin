<script setup lang="ts">
/**
 * 题库管理：查看用户端自创题练习生成的题目（单选 / 多选 / 不定项 / 简答）
 * 支持课程与题型筛选，可查看题目详情（选项与答案）
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CourseSelect from '@/components/CourseSelect.vue'
import { quizItems, courseDisplay, type QuizItem, type QuizType } from '@/store/admin'

const keyword = ref('')
const courseFilter = ref('全部')
const typeFilter = ref<'全部' | QuizType>('全部')

const types: Array<'全部' | QuizType> = ['全部', '单选', '多选', '不定项', '简答']

const filtered = computed(() =>
  quizItems.filter((q) => {
    if (courseFilter.value !== '全部' && courseDisplay(q.course) !== courseFilter.value) return false
    if (typeFilter.value !== '全部' && q.type !== typeFilter.value) return false
    const k = keyword.value.trim().toLowerCase()
    if (!k) return true
    return q.stem.toLowerCase().includes(k) || q.uploader.includes(k) || q.chapter.includes(k)
  }),
)

// ---------- 分页（每页 10 / 20 / 30 条，筛选或搜索后回到第 1 页） ----------
const page = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const safePage = computed(() => Math.min(page.value, totalPages.value))
const paged = computed(() =>
  filtered.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value),
)
watch([keyword, courseFilter, typeFilter], () => {
  page.value = 1
})
function setPageSize(s: number) {
  pageSize.value = s
  page.value = 1
}

const choiceCount = quizItems.filter((q) => q.type !== '简答').length
const simpleCount = quizItems.filter((q) => q.type === '简答').length
const courseCount = new Set(quizItems.map((q) => q.course)).size
const stats = [
  { label: '题目总数', value: quizItems.length },
  { label: '选择题', value: choiceCount },
  { label: '简答题', value: simpleCount },
  { label: '覆盖课程', value: courseCount },
]

const detail = ref<QuizItem | null>(null)
const typeTag = (t: QuizType) =>
  t === '单选' ? 'tag-blue' : t === '多选' ? 'tag-purple' : t === '不定项' ? 'tag-orange' : 'tag-green'
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">题库管理</h1>
      <p class="text-sm">用户端自创题练习生成的题目汇总，可查看题干、选项与答案</p>
    </header>

    <section class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="card stat-chip">
        <span class="stat-value">{{ s.value }}</span>
        <span class="stat-label">{{ s.label }}</span>
      </div>
    </section>

    <div class="toolbar">
      <div class="search-box">
        <AppIcon name="search" :size="15" class="search-ico" />
        <input v-model="keyword" class="input" placeholder="搜索题干 / 章节 / 创建人" />
      </div>
      <div class="filters">
        <div class="seg-tabs">
          <button
            v-for="t in types" :key="t"
            class="seg-tab" :class="{ active: typeFilter === t }"
            @click="typeFilter = t"
          >{{ t }}</button>
        </div>
        <CourseSelect v-model="courseFilter" />
      </div>
    </div>

    <div class="quiz-list">
      <button v-for="q in paged" :key="q.id" class="card card-hover quiz-row" @click="detail = q">
        <div class="quiz-main">
          <div class="quiz-stem">
            <span class="tag" :class="typeTag(q.type)">{{ q.type }}</span>
            <span class="stem-text">{{ q.stem }}</span>
          </div>
          <div class="quiz-meta">
            <span class="tag tag-gray">{{ courseDisplay(q.course) }}</span>
            <span class="meta-item"><AppIcon name="layers" :size="12" /> {{ q.chapter }}</span>
            <span class="meta-item"><AppIcon name="user" :size="12" /> {{ q.uploader }}</span>
            <span class="meta-item"><AppIcon name="calendar" :size="12" /> {{ q.createdAt }}</span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="16" class="quiz-arrow" />
      </button>
      <div v-if="!filtered.length" class="card empty">
        <AppIcon name="search" :size="16" /> 没有符合条件的题目
      </div>
    </div>

    <!-- 分页条：每页 10 / 20 / 30 条 -->
    <div class="pager">
      <span class="pager-info">共 {{ filtered.length }} 题</span>
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

    <!-- 题目详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal quiz-modal">
        <div class="modal-title">
          <span class="tag" :class="typeTag(detail.type)">{{ detail.type }}</span>
          题目详情
        </div>
        <p class="modal-sub">{{ courseDisplay(detail.course) }} · {{ detail.chapter }} · 由 {{ detail.uploader }} 于 {{ detail.createdAt }} 创建</p>
        <p class="stem">{{ detail.stem }}</p>
        <ul v-if="detail.options" class="options">
          <li v-for="o in detail.options" :key="o" class="option">{{ o }}</li>
        </ul>
        <div class="answer-box">
          <AppIcon name="check" :size="14" />
          <span><strong>参考答案：</strong>{{ detail.answer }}</span>
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

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-chip { display: flex; align-items: baseline; gap: 8px; padding: 14px 18px; }
.stat-value { font-size: 21px; font-weight: 800; letter-spacing: -0.3px; }
.stat-label { font-size: 12.5px; color: var(--slate); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.search-box { position: relative; width: 280px; max-width: 100%; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--stone); pointer-events: none; }
.search-box .input { padding-left: 32px; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

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

.quiz-list { display: flex; flex-direction: column; gap: 10px; }
.quiz-row { display: flex; align-items: center; gap: 14px; padding: 15px 18px; cursor: pointer; width: 100%; text-align: left; }
.quiz-main { flex: 1; min-width: 0; }
.quiz-stem { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.stem-text { font-size: 13.5px; font-weight: 600; line-height: 1.5; }
.quiz-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--slate); }
.quiz-arrow { color: var(--stone); flex-shrink: 0; }
.empty { text-align: center; color: var(--stone); padding: 36px 0; }
.empty svg { vertical-align: -3px; margin-right: 6px; }

/* 详情弹窗 */
.quiz-modal { max-width: 600px; width: 100%; }
.modal-title { display: flex; align-items: center; gap: 8px; }
.modal-sub { color: var(--slate); line-height: 1.7; }
.stem { font-size: 14.5px; font-weight: 600; line-height: 1.6; margin: 12px 0; }
.options { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.option {
  background: var(--surface-soft); border-radius: var(--radius-md);
  font-size: 13px; color: var(--slate); padding: 9px 13px; line-height: 1.6;
}
.answer-box {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--tint-mint); color: var(--brand-green);
  font-size: 13px; line-height: 1.7; border-radius: var(--radius-md);
  padding: 11px 14px;
}
.answer-box svg { flex-shrink: 0; margin-top: 3px; }

@media (max-width: 1020px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .page { padding: 20px 16px; }
}
</style>
