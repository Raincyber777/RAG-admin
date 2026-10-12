<script setup lang="ts">
/**
 * 管理端 · 反馈处理：查看用户反馈，更新处理状态
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { feedbacks as mockFeedbacks, type AdminFeedback } from '@/mock/adminData'

const list = ref<AdminFeedback[]>([...mockFeedbacks])
const statusFilter = ref<'all' | AdminFeedback['status']>('all')

const statusText: Record<AdminFeedback['status'], string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
}
const statusTag: Record<AdminFeedback['status'], string> = {
  pending: 'tag-red',
  processing: 'tag-orange',
  resolved: 'tag-green',
}

const filtered = computed(() =>
  list.value.filter((f) => statusFilter.value === 'all' || f.status === statusFilter.value)
)

function setStatus(f: AdminFeedback, status: AdminFeedback['status']) {
  f.status = status
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">反馈处理</h1>
        <p class="text-sm">用户提交的 Bug 与建议，及时响应提升体验</p>
      </div>
      <select v-model="statusFilter" class="select status-select">
        <option value="all">全部状态</option>
        <option value="pending">待处理</option>
        <option value="processing">处理中</option>
        <option value="resolved">已解决</option>
      </select>
    </header>

    <div class="fb-grid">
      <div v-for="f in filtered" :key="f.id" class="card fb-card">
        <div class="flex items-center justify-between gap-sm mb-sm">
          <div class="flex items-center gap-sm">
            <div class="avatar avatar-sm" style="background: #7b3ff2">{{ f.user[0] }}</div>
            <div>
              <div class="fb-user">{{ f.user }}</div>
              <div class="text-caption">{{ f.time }}</div>
            </div>
          </div>
          <span class="tag" :class="statusTag[f.status]">{{ statusText[f.status] }}</span>
        </div>
        <div class="flex items-center gap-sm mb-xs">
          <span class="tag tag-blue">{{ f.type }}</span>
          <b class="fb-title ellipsis">{{ f.title }}</b>
        </div>
        <p class="fb-desc">{{ f.desc }}</p>
        <div class="fb-actions">
          <button class="btn btn-ghost btn-sm" :class="{ 'cur': f.status === 'pending' }" @click="setStatus(f, 'pending')">
            <AppIcon name="clock" :size="13" /> 待处理
          </button>
          <button class="btn btn-ghost btn-sm" @click="setStatus(f, 'processing')">
            <AppIcon name="refresh" :size="13" /> 处理中
          </button>
          <button class="btn btn-ghost btn-sm" @click="setStatus(f, 'resolved')">
            <AppIcon name="check" :size="13" /> 已解决
          </button>
        </div>
      </div>
    </div>

    <div v-if="!filtered.length" class="empty card">
      <AppIcon name="inbox" :size="28" />
      <p>该状态下暂无反馈</p>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1200px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
.status-select { width: 130px; height: 40px; }

.fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.fb-user { font-size: 13.5px; font-weight: 600; }
.fb-title { font-size: 14px; }
.fb-desc { font-size: 13px; color: var(--slate); line-height: 1.6; margin-bottom: 12px; }
.fb-actions {
  display: flex; gap: 6px; padding-top: 10px;
  border-top: 1px solid var(--hairline-soft);
}
.fb-actions .btn.cur { background: var(--tint-lavender); color: var(--brand-purple-800); }

.empty { text-align: center; padding: 48px 0; color: var(--stone); margin-top: 14px; }
.empty p { margin-top: 10px; font-size: 13px; }

@media (max-width: 860px) {
  .page { padding: 20px 16px; }
  .fb-grid { grid-template-columns: 1fr; }
}
</style>
