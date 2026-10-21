<script setup lang="ts">
/**
 * 敏感内容审核日志：健康建档 / 健康拦截 / 政治引导 / 违规拦截的脱敏流水（只读）
 * 内容已经后端脱敏（手机号 / 邮箱 / 健康词条打码），管理端不提供原文与用户健康档案
 */
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSelect, { type SelectOption } from '@/components/AppSelect.vue'
import { auditLogs, ensureAuditLoaded, type AuditLog } from '@/store/admin'

onMounted(() => {
  void ensureAuditLoaded().catch(() => {})
})

// 类型筛选：可输入过滤的下拉框
const filter = ref('all') // 'all' | 健康建档 | 健康拦截 | 政治引导 | 违规拦截
const filterOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '健康建档', value: '健康建档' },
  { label: '健康拦截', value: '健康拦截' },
  { label: '政治引导', value: '政治引导' },
  { label: '违规拦截', value: '违规拦截' },
]
const filtered = computed(() =>
  auditLogs.filter((a) => filter.value === 'all' || a.kindText === filter.value),
)
const sorted = computed(() => [...filtered.value].sort((a, b) => b.time.localeCompare(a.time)))

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

// ---------- 详情弹窗 ----------
const detail = ref<AuditLog | null>(null)
const detailText = computed(() => {
  const d = detail.value?.detail
  if (!d || !Object.keys(d).length) return ''
  try {
    return JSON.stringify(d, null, 2)
  } catch {
    return String(d)
  }
})

const kindTag: Record<AuditLog['kind'], string> = {
  health_extract: 'tag-blue',
  health_block: 'tag-orange',
  political: 'tag-purple',
  blocked: 'tag-red',
}
</script>

<template>
  <div class="page">
    <header class="mb-md page-head">
      <div>
        <h1 class="h2">内容审核</h1>
        <p class="text-sm">敏感内容处理流水（共 {{ auditLogs.length }} 条）——内容已脱敏，仅用于合规巡检</p>
      </div>
    </header>

    <div class="toolbar">
      <AppSelect v-model="filter" :options="filterOptions" class="status-select" aria-label="按类型筛选" />
    </div>

    <div class="card table-card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>类型</th>
              <th>脱敏内容</th>
              <th>处理动作</th>
              <th class="th-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in paged" :key="a.id">
              <td class="muted nowrap">{{ a.time }}</td>
              <td>{{ a.user }}</td>
              <td><span class="tag" :class="kindTag[a.kind]">{{ a.kindText }}</span></td>
              <td class="log-q">{{ a.question }}</td>
              <td><span class="tag tag-gray">{{ a.actionText }}</span></td>
              <td class="td-actions">
                <button class="link-btn" @click="detail = a">详情</button>
              </td>
            </tr>
            <tr v-if="!sorted.length">
              <td colspan="6" class="empty">
                <AppIcon name="shield" :size="16" /> 暂无审核记录
              </td>
            </tr>
          </tbody>
        </table>
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

    <p class="perm-note">
      <AppIcon name="info" :size="13" />
      分权说明：日志中的联系方式与健康词条均已脱敏；健康档案原文仅用户本人可见，管理端不提供查询。
    </p>

    <!-- 详情弹窗 -->
    <div v-if="detail" class="modal-mask" @click.self="detail = null">
      <div class="modal audit-modal">
        <div class="modal-title">审核详情</div>
        <p class="modal-sub audit-sub">
          <span class="tag" :class="kindTag[detail.kind]">{{ detail.kindText }}</span>
          <span><AppIcon name="user" :size="12" /> {{ detail.user }}</span>
          <span><AppIcon name="clock" :size="12" /> {{ detail.time }}</span>
          <span class="tag tag-gray">{{ detail.actionText }}</span>
        </p>
        <div class="sec">
          <div class="sec-title"><AppIcon name="chat" :size="13" /> 内容（已脱敏）</div>
          <p class="audit-text">{{ detail.question }}</p>
        </div>
        <div v-if="detailText" class="sec">
          <div class="sec-title"><AppIcon name="file" :size="13" /> 处理明细</div>
          <pre class="audit-detail">{{ detailText }}</pre>
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
.page-head { display: flex; align-items: flex-end; justify-content: space-between; }

.toolbar { margin-bottom: 14px; }
.status-select { width: 190px; max-width: 100%; }

.nowrap { white-space: nowrap; }
.muted { color: var(--stone); font-size: 13px; }
.log-q { max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

.perm-note {
  display: flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: var(--stone); margin-top: 14px;
}

/* 详情弹窗 */
.audit-modal { max-width: 620px; width: 100%; max-height: 86vh; overflow-y: auto; }
.audit-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; }
.audit-sub span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; }
.sec { margin-bottom: 16px; }
.sec-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; margin-bottom: 7px; color: var(--ink);
}
.audit-text { font-size: 13px; color: var(--slate); line-height: 1.8; white-space: pre-wrap; }
.audit-detail {
  font-family: inherit; font-size: 12.5px; color: var(--slate); line-height: 1.8;
  background: var(--surface-soft); border-radius: var(--radius-md); padding: 12px;
  white-space: pre-wrap; word-break: break-all; margin: 0;
}

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
}
</style>
