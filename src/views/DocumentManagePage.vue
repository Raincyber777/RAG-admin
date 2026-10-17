<script setup lang="ts">
/**
 * 管理端 · 文档解析管理：解析队列监控 / 全量文档 / 重试 / 删除
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { adminDocs, type AdminDoc } from '@/mock/adminData'

const list = ref<AdminDoc[]>(adminDocs.map((d) => ({ ...d })))
const statusFilter = ref<'all' | AdminDoc['status']>('all')

const statusText: Record<AdminDoc['status'], string> = {
  queued: '排队中',
  parsing: '正在切片',
  vectorizing: '向量化中',
  done: '解析完成',
  failed: '解析失败',
}
const statusTag: Record<AdminDoc['status'], string> = {
  queued: 'tag-yellow',
  parsing: 'tag-purple',
  vectorizing: 'tag-blue',
  done: 'tag-green',
  failed: 'tag-red',
}

const filtered = computed(() =>
  list.value.filter((d) => statusFilter.value === 'all' || d.status === statusFilter.value)
)
const queue = computed(() => list.value.filter((d) => d.status !== 'done' && d.status !== 'failed'))

function retry(d: AdminDoc) {
  d.status = 'queued'
  d.progress = 0
  d.chunks = 0
  // 模拟重新解析
  setTimeout(() => { d.status = 'parsing' }, 1200)
  setTimeout(() => { d.status = 'vectorizing'; d.progress = 55 }, 3600)
  setTimeout(() => { d.status = 'done'; d.progress = 100; d.chunks = 30 + Math.floor(Math.random() * 150) }, 6200)
}
function removeDoc(d: AdminDoc) {
  if (confirm(`确定删除文档「${d.name}」及其向量数据？`)) {
    list.value = list.value.filter((x) => x.id !== d.id)
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">文档解析管理</h1>
        <p class="text-sm">监控全平台的文档解析流水线：切片 → 向量化 → 入库</p>
      </div>
      <div class="flex gap-sm flex-wrap">
        <select v-model="statusFilter" class="select status-select">
          <option value="all">全部状态</option>
          <option value="queued">排队中</option>
          <option value="parsing">正在切片</option>
          <option value="vectorizing">向量化中</option>
          <option value="done">解析完成</option>
          <option value="failed">解析失败</option>
        </select>
      </div>
    </header>

    <!-- 解析队列 -->
    <div class="card queue-card mb-md">
      <div class="flex items-center justify-between mb-md">
        <div class="h4"><AppIcon name="activity" :size="16" /> 实时解析队列 · {{ queue.length }} 个任务</div>
        <span class="tag tag-purple"><span class="spinner" style="width: 11px; height: 11px; border-width: 1.5px"></span> 流水线运行中</span>
      </div>
      <div v-if="queue.length" class="queue-list">
        <div v-for="d in queue" :key="d.id" class="queue-item">
          <div class="flex items-center gap-sm mb-xs">
            <AppIcon name="file" :size="14" class="muted" />
            <span class="ellipsis q-name">{{ d.name }}</span>
            <span class="tag" :class="statusTag[d.status]">{{ statusText[d.status] }}</span>
          </div>
          <div class="q-bar"><i :style="{ width: d.progress + '%' }"></i></div>
          <div class="flex justify-between text-caption">
            <span>{{ d.space }} · {{ d.owner }}</span>
            <span>{{ d.progress }}%</span>
          </div>
        </div>
      </div>
      <p v-else class="text-sm muted">当前队列为空，所有文档均已解析完成</p>
    </div>

    <!-- 全量文档 -->
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>文档</th>
            <th>知识空间</th>
            <th>上传者</th>
            <th>切片数</th>
            <th>状态 / 进度</th>
            <th>时间</th>
            <th style="width: 130px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in filtered" :key="d.id">
            <td><div class="d-name ellipsis">{{ d.name }}</div></td>
            <td><span class="tag tag-purple">{{ d.space }}</span></td>
            <td>{{ d.owner }}</td>
            <td>{{ d.chunks || 0 }}</td>
            <td>
              <div class="flex-col gap-xs" style="min-width: 130px">
                <span class="tag" :class="statusTag[d.status]" style="align-self: flex-start">{{ statusText[d.status] }}</span>
                <div v-if="d.status !== 'done' && d.status !== 'failed'" class="q-bar"><i :style="{ width: d.progress + '%' }"></i></div>
              </div>
            </td>
            <td class="muted">{{ d.time }}</td>
            <td>
              <div class="flex gap-xs">
                <button class="btn btn-ghost btn-sm" @click="retry(d)"><AppIcon name="refresh" :size="13" /> 重试</button>
                <button class="action-btn danger" title="删除" @click="removeDoc(d)"><AppIcon name="trash" :size="15" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1240px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
.status-select { width: 140px; height: 40px; }

.queue-card { background: var(--canvas); }
.queue-list { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
.queue-item { padding: 12px 14px; border: 1px solid var(--hairline); border-radius: var(--radius-md); background: var(--surface-soft); }
.q-name { font-size: 13px; font-weight: 500; max-width: 300px; }
.q-bar { height: 6px; border-radius: 3px; background: var(--hairline-soft); overflow: hidden; margin: 6px 0 4px; }
.q-bar i {
  display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, var(--brand-purple-300), var(--primary));
  transition: width 0.4s ease;
}
.d-name { font-weight: 500; max-width: 280px; }
.action-btn {
  border: none; background: transparent; color: var(--steel);
  padding: 6px; border-radius: var(--radius-sm); display: flex;
}
.action-btn.danger:hover { color: var(--error); background: #fdecec; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .queue-list { grid-template-columns: 1fr; }
}
</style>
