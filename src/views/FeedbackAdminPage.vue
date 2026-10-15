<script setup lang="ts">
/**
 * 问题反馈处理：查看用户提交的反馈（标题 + 详细描述 + 可选截图）
 * 点击卡片查看反馈详情与用户截图；待处理反馈可标记为已处理
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { feedbacks, resolveFeedback, type FeedbackItem } from '@/store/admin'

const filter = ref<'all' | '待处理' | '已处理'>('all')

const filtered = computed(() =>
  feedbacks.filter((f) => filter.value === 'all' || f.status === filter.value),
)
// 「全部」视图：待处理优先排前；同组内按提交时间从新到旧
const sorted = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a, b) => {
    if (filter.value === 'all' && (a.status === '待处理') !== (b.status === '待处理')) {
      return a.status === '待处理' ? -1 : 1
    }
    return b.time.localeCompare(a.time)
  })
  return arr
})
const pendingCount = computed(() => feedbacks.filter((f) => f.status === '待处理').length)

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

// ---------- 反馈详情弹窗 + 截图放大预览 ----------
const detail = ref<FeedbackItem | null>(null)
const preview = ref('')

function markDone(id: string) {
  resolveFeedback(id)
}
function markDoneInModal() {
  if (detail.value) markDone(detail.value.id)
}
</script>

<template>
  <div class="page">
    <header class="mb-md page-head">
      <div>
        <h1 class="h2">问题反馈</h1>
        <p class="text-sm">用户提交的反馈与建议（共 {{ feedbacks.length }} 条，待处理 {{ pendingCount }} 条）</p>
      </div>
    </header>

    <div class="toolbar">
      <div class="seg-tabs">
        <button class="seg-tab" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部（{{ feedbacks.length }}）</button>
        <button class="seg-tab" :class="{ active: filter === '待处理' }" @click="filter = '待处理'">待处理（{{ pendingCount }}）</button>
        <button class="seg-tab" :class="{ active: filter === '已处理' }" @click="filter = '已处理'">已处理（{{ feedbacks.length - pendingCount }}）</button>
      </div>
    </div>

    <div class="fb-grid">
      <div
        v-for="f in paged" :key="f.id"
        class="card card-lg card-hover fb-card"
        role="button" tabindex="0"
        :aria-label="`查看反馈详情：${f.title}`"
        @click="detail = f"
        @keydown.enter.prevent="detail = f"
        @keydown.space.prevent="detail = f"
      >
        <div class="fb-head">
          <div class="fb-title ellipsis">{{ f.title }}</div>
          <span class="tag" :class="f.status === '待处理' ? 'tag-orange' : 'tag-green'">{{ f.status }}</span>
        </div>
        <p class="fb-content">{{ f.content }}</p>
        <div class="fb-foot">
          <div class="fb-meta">
            <span class="meta-item"><AppIcon name="user" :size="12" /> {{ f.user }}</span>
            <span class="meta-item"><AppIcon name="mail" :size="12" /> {{ f.contact }}</span>
            <span class="meta-item"><AppIcon name="clock" :size="12" /> {{ f.time }}</span>
            <span v-if="f.images.length" class="meta-item"><AppIcon name="image" :size="12" /> {{ f.images.length }} 张截图</span>
          </div>
          <button v-if="f.status === '待处理'" class="btn btn-primary btn-sm" @click.stop="markDone(f.id)">
            <AppIcon name="check" :size="13" /> 标记已处理
          </button>
        </div>
      </div>
      <div v-if="!filtered.length" class="card empty">
        <AppIcon name="check" :size="16" /> 没有符合筛选条件的反馈
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

    <!-- 反馈详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal fb-modal">
        <div class="modal-title">{{ detail.title }}</div>
        <p class="modal-sub fb-sub">
          <span><AppIcon name="user" :size="12" /> {{ detail.user }}</span>
          <span><AppIcon name="mail" :size="12" /> {{ detail.contact }}</span>
          <span><AppIcon name="clock" :size="12" /> {{ detail.time }}</span>
          <span class="tag" :class="detail.status === '待处理' ? 'tag-orange' : 'tag-green'">{{ detail.status }}</span>
        </p>

        <div class="sec">
          <div class="sec-title"><AppIcon name="file" :size="13" /> 详细描述</div>
          <p class="fb-detail-text">{{ detail.content }}</p>
        </div>

        <div v-if="detail.images.length" class="sec">
          <div class="sec-title"><AppIcon name="image" :size="13" /> 用户截图（{{ detail.images.length }}）</div>
          <div class="shot-grid">
            <img
              v-for="(img, i) in detail.images" :key="i"
              :src="img" class="shot-img" alt="用户反馈截图"
              @click="preview = img"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
          <button v-if="detail.status === '待处理'" class="btn btn-primary" @click="markDoneInModal">
            <AppIcon name="check" :size="14" /> 标记已处理
          </button>
        </div>
      </div>
    </div>

    <!-- 截图放大预览 -->
    <div v-if="preview" class="modal-mask preview-mask" @click="preview = ''">
      <img :src="preview" class="preview-img" alt="截图放大预览" />
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; }

.toolbar { margin-bottom: 14px; }

.fb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fb-card { display: flex; flex-direction: column; }
.fb-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.fb-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--ink); }
.fb-card:hover .fb-title { color: var(--link-blue); }
.fb-content {
  flex: 1; font-size: 13.5px; line-height: 1.75; color: var(--slate); margin-bottom: 14px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fb-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.fb-meta { display: flex; flex-direction: column; gap: 5px; }
.meta-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--slate); }
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

/* 详情弹窗 */
.fb-modal { max-width: 640px; width: 100%; max-height: 86vh; overflow-y: auto; }
.fb-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; }
.fb-sub span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; }
.sec { margin-bottom: 16px; }
.sec-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; margin-bottom: 7px; color: var(--ink);
}
.fb-detail-text { font-size: 13px; color: var(--slate); line-height: 1.8; white-space: pre-wrap; }
.shot-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.shot-img {
  width: 180px; height: 120px; object-fit: cover;
  border: 1px solid var(--hairline-strong); border-radius: var(--radius-md);
  cursor: zoom-in; transition: border-color 0.15s ease;
}
.shot-img:hover { border-color: var(--primary); }

/* 截图放大预览：铺满视口的暗色遮罩 + 居中大图，点击任意处关闭 */
.preview-mask { z-index: 60; cursor: zoom-out; }
.preview-img {
  max-width: min(920px, 92vw); max-height: 88vh;
  border-radius: var(--radius-md); box-shadow: var(--shadow-card);
  display: block; object-fit: contain;
}

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .fb-grid { grid-template-columns: 1fr; }
}
</style>
