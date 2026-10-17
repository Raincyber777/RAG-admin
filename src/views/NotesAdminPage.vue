<script setup lang="ts">
/**
 * 课堂纪要管理：查看全部用户生成成功的课堂纪要，支持搜索 / 课程下拉筛选 / 分页（10 / 20 / 30）
 * 课程下拉与用户端课程表同构：用户端新增课程后自动出现，可在选项上重命名 / 删除（删除弹窗告知后果）
 * 可查看纪要详情（主题 / 知识点 / 定义公式 / 重点问题），可删除违规纪要
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CourseSelect from '@/components/CourseSelect.vue'
import { notes, removeNote, courseDisplay, type AdminNote } from '@/store/admin'

const keyword = ref('')
const courseFilter = ref('全部')

const filtered = computed(() =>
  notes.filter((n) => {
    if (courseFilter.value !== '全部' && courseDisplay(n.course) !== courseFilter.value) return false
    const k = keyword.value.trim().toLowerCase()
    if (!k) return true
    return n.title.toLowerCase().includes(k) || n.uploader.includes(k) || n.theme.toLowerCase().includes(k)
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
watch([keyword, courseFilter], () => {
  page.value = 1
})
function setPageSize(s: number) {
  pageSize.value = s
  page.value = 1
}

// ---------- 详情弹窗 ----------
const detail = ref<AdminNote | null>(null)

// ---------- 删除确认 ----------
const deleteTarget = ref<AdminNote | null>(null)
const deleteError = ref('')
async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await removeNote(deleteTarget.value.id)
    deleteTarget.value = null
    detail.value = null
    deleteError.value = ''
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : '删除失败，请确认后端已启动'
  }
}
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">课堂纪要</h1>
      <p class="text-sm">用户生成成功的课堂纪要（共 {{ notes.length }} 份），可查看详情或删除违规内容</p>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <AppIcon name="search" :size="15" class="search-ico" />
        <input v-model="keyword" class="input" placeholder="搜索纪要标题 / 上传者 / 主题" />
      </div>
      <CourseSelect v-model="courseFilter" />
    </div>

    <div class="note-list">
      <div v-for="n in paged" :key="n.id" class="card note-row">
        <div class="note-main">
          <div class="note-title-line">
            <span class="note-title">{{ n.title }}</span>
            <span class="tag tag-gray">{{ courseDisplay(n.course) }}</span>
          </div>
          <div class="note-meta">
            <span class="meta-item"><AppIcon name="user" :size="12" /> {{ n.uploader }}</span>
            <span class="meta-item"><AppIcon name="clock" :size="12" /> {{ n.createdAt }}</span>
            <span class="meta-item"><AppIcon name="mic" :size="12" /> 录音 {{ n.duration }}</span>
          </div>
          <p v-if="n.theme" class="note-theme">{{ n.theme }}</p>
        </div>
        <div class="note-actions">
          <button class="btn btn-secondary btn-sm" @click="detail = n">查看</button>
          <button class="btn btn-secondary btn-sm del-btn" @click="deleteTarget = n"><AppIcon name="trash" :size="14" /> 删除</button>
        </div>
      </div>
      <div v-if="!filtered.length" class="card empty">
        <AppIcon name="search" :size="16" /> 没有符合条件的课堂纪要
      </div>
    </div>

    <!-- 分页条：每页 10 / 20 / 30 条 -->
    <div class="pager">
      <span class="pager-info">共 {{ filtered.length }} 份</span>
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

    <!-- 纪要详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal note-modal">
        <div class="modal-title">{{ detail.title }}</div>
        <p class="modal-sub">
          {{ courseDisplay(detail.course) }} · 上传者 {{ detail.uploader }} · {{ detail.createdAt }} · 录音 {{ detail.duration }}
        </p>

        <div class="sec">
          <div class="sec-title"><AppIcon name="spark" :size="13" /> 课程主题</div>
          <p class="theme-text">{{ detail.theme }}</p>
        </div>
        <div class="sec">
          <div class="sec-title"><AppIcon name="check" :size="13" /> 核心知识点</div>
          <ul class="sec-list">
            <li v-for="p in detail.points" :key="p">{{ p }}</li>
          </ul>
        </div>
        <div class="sec">
          <div class="sec-title"><AppIcon name="book" :size="13" /> 重要定义与公式</div>
          <ul class="sec-list">
            <li v-for="d in detail.definitions" :key="d">{{ d }}</li>
          </ul>
        </div>
        <div class="sec">
          <div class="sec-title sec-em"><AppIcon name="alert" :size="13" /> 重点问题</div>
          <ul class="sec-list em-list">
            <li v-for="e in detail.emphasized" :key="e">
              <AppIcon name="alert" :size="13" class="em-ico" />
              <span>{{ e }}</span>
            </li>
          </ul>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="detail = null">关闭</button>
          <button class="btn btn-danger" @click="deleteTarget = detail"><AppIcon name="trash" :size="14" /> 删除该纪要</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="modal-mask" @click.self="deleteTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">删除课堂纪要</div>
        <p class="modal-sub">确定删除「{{ deleteTarget.title }}」吗？该纪要的问答与练习数据将一并移除，此操作不可恢复。</p>
        <p v-if="deleteError" class="modal-sub hint-err">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="deleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
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

.note-list { display: flex; flex-direction: column; gap: 10px; }
.note-row { display: flex; align-items: center; gap: 16px; padding: 16px 18px; }
.note-main { flex: 1; min-width: 0; }
.note-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.note-title { font-size: 14.5px; font-weight: 700; }
.note-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--slate); }
.note-theme { margin-top: 6px; font-size: 12.5px; color: var(--slate); }
.note-actions { display: flex; gap: 8px; flex-shrink: 0; }
.del-btn { color: #d92d20; }
.del-btn:hover { border-color: #d92d20; }
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
.note-modal { max-width: 640px; width: 100%; }
.sec { margin-bottom: 16px; }
.sec-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; margin-bottom: 7px; color: var(--ink);
}
.sec-em { color: var(--brand-orange); }
.theme-text { font-size: 13px; color: var(--slate); line-height: 1.7; }
.sec-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
.sec-list li { font-size: 13px; color: var(--slate); line-height: 1.65; }
/* 重点问题：与用户端一致，用线性警示图标替代 emoji 星星 */
.em-list li { display: flex; align-items: flex-start; gap: 6px; }
.em-ico { color: var(--brand-orange); flex-shrink: 0; margin-top: 3px; }
.modal-sub { color: var(--slate); line-height: 1.7; }
.hint-err { color: #d92d20; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .note-row { flex-direction: column; align-items: stretch; }
  .note-actions { justify-content: flex-end; }
}
</style>
