<script setup lang="ts">
/**
 * 训练样本审核（数据进化闭环的最后一道人工关口）：
 * 生成（按反馈信号筛选 + 强模型预筛）→ 待审核 → 人工通过 / 驳回 → 导出 JSONL 微调素材
 * 页面下方为「知识库缺口」：反复无依据的问题聚合，补充课堂材料后标记闭环
 */
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSelect, { type SelectOption } from '@/components/AppSelect.vue'
import {
  trainSamples, ensureSamplesLoaded, reviewSample, generateSamples, exportSamplesJsonl,
  kbGaps, ensureGapsLoaded, resolveGap, ignoreGap,
  type TrainSample, type KbGap,
} from '@/store/admin'

onMounted(() => {
  void ensureSamplesLoaded().catch(() => {})
  void ensureGapsLoaded().catch(() => {})
})

// 状态筛选：可输入过滤的下拉框
const filter = ref('all') // 'all' | '待审核' | '已通过' | '已驳回'
const filterOptions: SelectOption[] = [
  { label: '全部状态', value: 'all' },
  { label: '待审核', value: '待审核' },
  { label: '已通过', value: '已通过' },
  { label: '已驳回', value: '已驳回' },
]
const filtered = computed(() =>
  trainSamples.filter((s) => filter.value === 'all' || s.status === filter.value),
)
const sorted = computed(() => [...filtered.value].sort((a, b) => b.time.localeCompare(a.time)))
const pendingCount = computed(() => trainSamples.filter((s) => s.status === '待审核').length)
const approvedCount = computed(() => trainSamples.filter((s) => s.status === '已通过').length)

// ---------- 分页（每页 10 / 20 / 30 条，切换筛选后回到第 1 页） ----------
const page = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const safePage = computed(() => Math.min(page.value, totalPages.value))
const paged = computed(() =>
  sorted.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value),
)
watch(filter, () => {
  page.value = 1
})
function setPageSize(s: number) {
  pageSize.value = s
  page.value = 1
}

// ---------- 操作提示 / 错误 ----------
const opError = ref('')
const tip = ref('')
let tipTimer: number | undefined
function showTip(text: string) {
  tip.value = text
  if (tipTimer) window.clearTimeout(tipTimer)
  tipTimer = window.setTimeout(() => (tip.value = ''), 3000)
}

// ---------- 生成 / 导出 ----------
const generating = ref(false)
async function onGenerate() {
  if (generating.value) return
  generating.value = true
  opError.value = ''
  try {
    const r = await generateSamples()
    showTip(`本次生成 ${r.created} 条候选样本，过滤 / 跳过 ${r.skipped} 条`)
  } catch (e) {
    opError.value = e instanceof Error ? e.message : '生成失败，请稍后重试'
  } finally {
    generating.value = false
  }
}

const exporting = ref(false)
async function onExport() {
  if (exporting.value) return
  exporting.value = true
  opError.value = ''
  try {
    await exportSamplesJsonl()
    showTip(`已导出 ${approvedCount.value} 条已通过样本（training_samples.jsonl）`)
  } catch (e) {
    opError.value = e instanceof Error ? e.message : '导出失败，请稍后重试'
  } finally {
    exporting.value = false
  }
}

// ---------- 审核（详情弹窗 / 卡片直达） ----------
const detail = ref<TrainSample | null>(null)
const reviewingId = ref('')
async function actReview(s: TrainSample, approve: boolean) {
  if (reviewingId.value) return
  reviewingId.value = s.id
  opError.value = ''
  try {
    await reviewSample(s.id, approve)
    if (detail.value?.id === s.id) detail.value = null
    showTip(approve ? '样本已通过，导出时将包含该条' : '样本已驳回，不会进入训练素材')
  } catch (e) {
    opError.value = e instanceof Error ? e.message : '操作失败，请稍后重试'
  } finally {
    reviewingId.value = ''
  }
}

// ---------- 知识库缺口 ----------
const openGaps = computed(() => kbGaps.filter((g) => g.status === '待补充'))
const gapBusyId = ref('')
async function actGap(g: KbGap, resolve: boolean) {
  if (gapBusyId.value) return
  gapBusyId.value = g.id
  opError.value = ''
  try {
    await (resolve ? resolveGap(g.id) : ignoreGap(g.id))
    showTip(resolve ? '已标记为「已补充」，后续材料入库即可回答该类问题' : '已忽略该缺口')
  } catch (e) {
    opError.value = e instanceof Error ? e.message : '操作失败，请稍后重试'
  } finally {
    gapBusyId.value = ''
  }
}

const statusTag = (s: TrainSample['status']) =>
  s === '待审核' ? 'tag-yellow' : s === '已通过' ? 'tag-green' : 'tag-red'
const gapTag = (s: KbGap['status']) =>
  s === '待补充' ? 'tag-orange' : s === '已补充' ? 'tag-green' : 'tag-gray'
</script>

<template>
  <div class="page">
    <header class="mb-md page-head">
      <div>
        <h1 class="h2">训练样本</h1>
        <p class="text-sm">
          反馈驱动的高质量问答沉淀（共 {{ trainSamples.length }} 条，待审核 {{ pendingCount }} 条，已通过 {{ approvedCount }} 条）
        </p>
      </div>
      <div class="head-btns">
        <button class="btn btn-secondary" :disabled="exporting" @click="onExport">
          <AppIcon name="download" :size="15" /> {{ exporting ? '导出中…' : '导出 JSONL' }}
        </button>
        <button class="btn btn-primary" :disabled="generating" @click="onGenerate">
          <AppIcon name="spark" :size="15" /> {{ generating ? '生成中…' : '生成样本' }}
        </button>
      </div>
    </header>

    <div class="toolbar">
      <AppSelect v-model="filter" :options="filterOptions" class="status-select" aria-label="按审核状态筛选" />
    </div>

    <p v-if="tip" class="done-tip"><AppIcon name="check" :size="14" /> {{ tip }}</p>
    <p v-if="opError" class="op-err"><AppIcon name="alert" :size="13" /> {{ opError }}</p>

    <div class="sample-grid">
      <div
        v-for="s in paged" :key="s.id"
        class="card card-lg card-hover sample-card"
        role="button" tabindex="0"
        :aria-label="`查看样本详情：${s.query}`"
        @click="detail = s"
        @keydown.enter.prevent="detail = s"
        @keydown.space.prevent="detail = s"
      >
        <div class="sample-head">
          <div class="sample-title ellipsis">{{ s.query }}</div>
          <span class="tag" :class="statusTag(s.status)">{{ s.status }}</span>
        </div>
        <p class="sample-answer">{{ s.answer }}</p>
        <div class="sample-foot">
          <div class="sample-meta">
            <span class="meta-item"><AppIcon name="book" :size="12" /> {{ s.noteTitle || '自由对话' }}</span>
            <span class="meta-item"><AppIcon name="layers" :size="12" /> {{ s.context.length }} 个召回片段</span>
            <span class="meta-item"><AppIcon name="clock" :size="12" /> {{ s.time }}</span>
          </div>
          <div v-if="s.status === '待审核'" class="sample-actions">
            <button class="btn btn-secondary btn-sm" :disabled="reviewingId === s.id" @click.stop="actReview(s, false)">驳回</button>
            <button class="btn btn-primary btn-sm" :disabled="reviewingId === s.id" @click.stop="actReview(s, true)">
              <AppIcon name="check" :size="13" /> 通过
            </button>
          </div>
        </div>
      </div>
      <div v-if="!filtered.length" class="card empty">
        <AppIcon name="database" :size="16" /> 暂无样本：先在问答页积累点赞 / 复制等反馈，再点「生成样本」
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

    <!-- 知识库缺口：无依据问题聚合，补充材料后闭环 -->
    <section class="gap-sec">
      <div class="sec-head">
        <h2 class="sec-title"><AppIcon name="alert" :size="15" /> 知识库缺口</h2>
        <p class="text-sm">回答无依据的问题自动聚合在此（{{ openGaps.length }} 条待补充）——上传对应课堂材料后标记「已补充」</p>
      </div>
      <div class="card table-card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>问题</th>
                <th class="th-count">出现次数</th>
                <th>状态</th>
                <th>最近出现</th>
                <th class="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in kbGaps" :key="g.id">
                <td class="gap-q">{{ g.question }}</td>
                <td><span class="tag" :class="g.count >= 3 ? 'tag-red' : 'tag-gray'">× {{ g.count }}</span></td>
                <td><span class="tag" :class="gapTag(g.status)">{{ g.status }}</span></td>
                <td class="muted">{{ g.time }}</td>
                <td class="td-actions">
                  <template v-if="g.status === '待补充'">
                    <button class="link-btn" :disabled="gapBusyId === g.id" @click="actGap(g, true)">标记已补充</button>
                    <button class="link-btn link-danger" :disabled="gapBusyId === g.id" @click="actGap(g, false)">忽略</button>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
              <tr v-if="!kbGaps.length">
                <td colspan="5" class="empty">
                  <AppIcon name="check" :size="16" /> 暂无缺口：知识库覆盖良好
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 样本详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal sample-modal">
        <div class="modal-title">{{ detail.query }}</div>
        <p class="modal-sub sample-sub">
          <span class="tag" :class="statusTag(detail.status)">{{ detail.status }}</span>
          <span><AppIcon name="book" :size="12" /> {{ detail.noteTitle || '自由对话' }}</span>
          <span><AppIcon name="clock" :size="12" /> {{ detail.time }}</span>
        </p>

        <div class="sec">
          <div class="sec-title"><AppIcon name="chat" :size="13" /> 学生提问</div>
          <p class="sample-text">{{ detail.query }}</p>
          <p v-if="detail.rewrite" class="rewrite-line">改写后检索：{{ detail.rewrite }}</p>
        </div>

        <div class="sec">
          <div class="sec-title"><AppIcon name="layers" :size="13" /> 召回片段（{{ detail.context.length }}）</div>
          <div v-for="(c, i) in detail.context" :key="i" class="ctx-item">
            <div class="ctx-meta">
              <span class="ctx-ref">{{ c.ref || `片段 ${i + 1}` }}</span>
              <span class="ctx-score">相似度 {{ c.score }}</span>
            </div>
            <p class="ctx-text">{{ c.text }}</p>
          </div>
        </div>

        <div class="sec">
          <div class="sec-title"><AppIcon name="spark" :size="13" /> 标准答案</div>
          <p class="sample-text">{{ detail.answer }}</p>
        </div>

        <div v-if="detail.sources.length" class="sec">
          <div class="sec-title"><AppIcon name="link" :size="13" /> 引用来源（{{ detail.sources.length }}）</div>
          <p v-for="(ref, i) in detail.sources" :key="i" class="src-line">
            [{{ i + 1 }}] {{ ref.time ? `录音 ${ref.time}` : ref.label || '外部来源' }}：{{ ref.detail }}
          </p>
        </div>

        <p v-if="detail.reviewerNote" class="reviewer-note">审核备注：{{ detail.reviewerNote }}</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
          <template v-if="detail.status === '待审核'">
            <button class="btn btn-secondary" :disabled="reviewingId === detail.id" @click="actReview(detail, false)">驳回</button>
            <button class="btn btn-primary" :disabled="reviewingId === detail.id" @click="actReview(detail, true)">
              <AppIcon name="check" :size="14" /> 通过
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; }
.head-btns { display: flex; gap: 10px; }

.toolbar { margin-bottom: 14px; }
.status-select { width: 190px; max-width: 100%; }

.done-tip {
  display: flex; align-items: center; gap: 6px;
  background: var(--tint-mint); color: var(--brand-green);
  font-size: 13px; font-weight: 500; border-radius: var(--radius-md);
  padding: 9px 13px; margin-bottom: 12px;
}
.op-err {
  display: flex; align-items: center; gap: 6px;
  background: var(--tint-rose); color: #d92d20;
  font-size: 13px; font-weight: 500; border-radius: var(--radius-md);
  padding: 9px 13px; margin-bottom: 12px;
}

.sample-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sample-card { display: flex; flex-direction: column; }
.sample-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.sample-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--ink); }
.sample-card:hover .sample-title { color: var(--link-blue); }
.sample-answer {
  flex: 1; font-size: 13.5px; line-height: 1.75; color: var(--slate); margin-bottom: 14px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.sample-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.sample-meta { display: flex; flex-direction: column; gap: 5px; }
.meta-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--slate); }
.sample-actions { display: flex; gap: 8px; flex-shrink: 0; }
.empty { text-align: center; color: var(--stone); padding: 36px 0; grid-column: 1 / -1; }
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

/* 知识库缺口 */
.gap-sec { margin-top: 34px; }
.sec-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.sec-title { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: var(--ink); }
.th-count { width: 90px; }
.gap-q { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: var(--stone); font-size: 13px; }

/* 详情弹窗 */
.sample-modal { max-width: 660px; width: 100%; max-height: 86vh; overflow-y: auto; }
.sample-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; }
.sample-sub span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; }
.sec { margin-bottom: 16px; }
.sec-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; margin-bottom: 7px; color: var(--ink);
}
.sample-text { font-size: 13px; color: var(--slate); line-height: 1.8; white-space: pre-wrap; }
.rewrite-line { font-size: 12.5px; color: var(--stone); margin-top: 6px; }
.ctx-item { border: 1px solid var(--hairline-soft); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 8px; }
.ctx-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.ctx-ref { font-size: 12px; font-weight: 600; color: var(--primary); }
.ctx-score { font-size: 12px; color: var(--stone); }
.ctx-text { font-size: 12.5px; color: var(--slate); line-height: 1.7; }
.src-line { font-size: 12.5px; color: var(--slate); line-height: 1.7; margin-bottom: 4px; }
.reviewer-note { font-size: 12.5px; color: var(--stone); margin-bottom: 10px; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .sample-grid { grid-template-columns: 1fr; }
  .page-head { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>
