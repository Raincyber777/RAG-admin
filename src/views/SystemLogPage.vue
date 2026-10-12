<script setup lang="ts">
/**
 * 管理端 · 系统日志：按级别筛选 / 关键词搜索
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { logs, type LogItem } from '@/mock/adminData'

const level = ref<'all' | LogItem['level']>('all')
const search = ref('')

const filtered = computed(() =>
  logs.filter(
    (l) =>
      (level.value === 'all' || l.level === level.value) &&
      (l.message.includes(search.value.trim()) || l.module.includes(search.value.trim()))
  )
)

const levelTag: Record<LogItem['level'], string> = {
  INFO: 'tag-blue',
  WARN: 'tag-yellow',
  ERROR: 'tag-red',
}
const levelDot: Record<LogItem['level'], string> = {
  INFO: 'dot-green',
  WARN: 'dot-yellow',
  ERROR: 'dot-red',
}

const counts = computed(() => ({
  info: logs.filter((l) => l.level === 'INFO').length,
  warn: logs.filter((l) => l.level === 'WARN').length,
  error: logs.filter((l) => l.level === 'ERROR').length,
}))
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">系统日志</h1>
        <p class="text-sm">记录文档解析、问答服务、用户系统的关键事件</p>
      </div>
      <div class="flex gap-sm flex-wrap">
        <div class="search-box">
          <AppIcon name="search" :size="15" />
          <input v-model="search" class="search-input" placeholder="搜索日志内容 / 模块" />
        </div>
        <select v-model="level" class="select level-select">
          <option value="all">全部级别</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>
    </header>

    <!-- 级别统计 -->
    <div class="stat-row mb-md">
      <div class="lv"><span class="dot dot-green"></span> INFO <b>{{ counts.info }}</b></div>
      <div class="lv"><span class="dot dot-yellow"></span> WARN <b>{{ counts.warn }}</b></div>
      <div class="lv"><span class="dot dot-red"></span> ERROR <b>{{ counts.error }}</b></div>
      <div class="lv muted">共 {{ logs.length }} 条 · 保留 30 天</div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width: 170px">时间</th>
            <th style="width: 90px">级别</th>
            <th style="width: 110px">模块</th>
            <th>日志内容</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in filtered" :key="l.id">
            <td class="muted mono">{{ l.time }}</td>
            <td><span class="tag" :class="levelTag[l.level]"><span class="dot" :class="levelDot[l.level]"></span> {{ l.level }}</span></td>
            <td><span class="tag tag-gray">{{ l.module }}</span></td>
            <td>{{ l.message }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="4" class="empty-cell">没有匹配的日志</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1240px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; }
.search-box {
  display: flex; align-items: center; gap: 8px; width: 260px; padding: 0 12px; height: 40px;
  background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  color: var(--stone);
}
.search-input { border: none; outline: none; flex: 1; font-size: 13px; background: transparent; }
.level-select { width: 130px; height: 40px; }

.stat-row {
  display: flex; gap: 28px; flex-wrap: wrap;
  background: var(--surface); border-radius: var(--radius-lg); padding: 14px 20px;
}
.lv { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--slate); }
.lv b { color: var(--ink); }
.mono { font-family: 'Consolas', 'Courier New', monospace; font-size: 12.5px; }
.empty-cell { text-align: center; padding: 40px 0 !important; color: var(--stone); }

@media (max-width: 860px) {
  .page { padding: 20px 16px; }
}
</style>
