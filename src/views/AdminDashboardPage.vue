<script setup lang="ts">
/**
 * 管理端 · 系统总览仪表盘
 * 核心指标 / 问答请求趋势 / 用户活跃 TOP / 资源占用
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/AppIcon.vue'

const metrics = [
  { label: '注册用户总数', value: '1,284', unit: '人', delta: '今日 +17', tint: 'tint-sky', icon: 'users' },
  { label: '知识库文档总数', value: '108', unit: '篇', delta: '今日 +2', tint: 'tint-lavender', icon: 'book' },
  { label: '向量总数', value: '2.9', unit: '万条', delta: '全库检索正常', tint: 'tint-mint', icon: 'database' },
  { label: '今日问答请求', value: '1,862', unit: '次', delta: '平均响应 1.8s', tint: 'tint-peach', icon: 'chat' },
  { label: '存储用量', value: '68', unit: '%', delta: '剩余 42 GB', tint: 'tint-yellow', icon: 'server' },
  { label: '系统健康度', value: '98.6', unit: '%', delta: '7 项巡检全部通过', tint: 'tint-rose', icon: 'activity' },
]

const trendRef = ref<HTMLDivElement>()
const userRef = ref<HTMLDivElement>()
let charts: echarts.ECharts[] = []

function initCharts() {
  if (trendRef.value) {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 13 + i)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })
    const qps = [620, 700, 810, 760, 930, 1040, 980, 1120, 1210, 1090, 1260, 1380, 1290, 1862]
    const c = echarts.init(trendRef.value)
    c.setOption({
      grid: { top: 36, left: 52, right: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#c8c4be' } }, axisLabel: { color: '#787671' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#ede9e4' } }, axisLabel: { color: '#787671' } },
      series: [
        {
          name: '问答请求量',
          type: 'bar',
          data: qps,
          barWidth: 16,
          itemStyle: { borderRadius: [5, 5, 0, 0], color: '#5645d4' },
        },
      ],
    })
    charts.push(c)
  }

  if (userRef.value) {
    const c = echarts.init(userRef.value)
    c.setOption({
      grid: { top: 8, left: 70, right: 40, bottom: 8 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: ['林小智', '孙研发', '王文档', '赵提问', '周运营'],
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#37352f', fontSize: 12.5 },
      },
      series: [
        {
          type: 'bar',
          data: [326, 204, 158, 89, 45],
          barWidth: 14,
          itemStyle: { borderRadius: 7, color: '#7b3ff2' },
          showBackground: true,
          backgroundStyle: { color: '#ede9e4', borderRadius: 7 },
        },
      ],
    })
    charts.push(c)
  }
}

function resize() {
  charts.forEach((c) => c.resize())
}
onMounted(() => {
  initCharts()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  charts.forEach((c) => c.dispose())
  charts = []
})

// 服务巡检状态
const services = [
  { name: 'Web 前端服务', ok: true, note: '正常 · 负载 12%' },
  { name: 'API 网关', ok: true, note: '正常 · QPS 86' },
  { name: '向量数据库', ok: true, note: '正常 · 检索 P99 86ms' },
  { name: 'Embedding 服务', ok: true, note: '正常 · 队列 0' },
  { name: 'LLM 推理服务', ok: false, note: '延迟偏高 · 3.2s' },
  { name: '文档解析服务', ok: true, note: '正常 · 队列 1' },
]
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">系统总览</h1>
        <p class="text-sm">平台运行状态与资源占用的全局视图</p>
      </div>
      <div class="flex items-center gap-md">
        <router-link to="/admin/guide" class="guide-link"><AppIcon name="star" :size="14" /> 使用说明</router-link>
        <span class="text-caption">最近巡检：2026-10-12 09:00 · 每 10 分钟自动巡检一次</span>
      </div>
    </header>

    <!-- 指标卡 -->
    <div class="metric-grid">
      <div v-for="m in metrics" :key="m.label" class="metric-card" :class="m.tint">
        <div class="metric-top">
          <span class="metric-icon"><AppIcon :name="m.icon" :size="17" /></span>
          <span class="metric-label">{{ m.label }}</span>
        </div>
        <div class="metric-num">{{ m.value }}<span class="unit">{{ m.unit }}</span></div>
        <div class="metric-delta">{{ m.delta }}</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="chart-grid">
      <div class="card span-2">
        <div class="chart-head">
          <div class="h4">问答请求量趋势（近 14 天）</div>
          <span class="tag tag-purple">今日 1,862 次</span>
        </div>
        <div ref="trendRef" class="chart"></div>
      </div>
      <div class="card">
        <div class="chart-head"><div class="h4">用户活跃 TOP5（本月提问数）</div></div>
        <div ref="userRef" class="chart"></div>
      </div>
    </div>

    <!-- 服务巡检 -->
    <div class="card mt-md">
      <div class="flex items-center justify-between mb-md">
        <div class="h4">服务健康巡检</div>
        <span class="tag tag-green">5 / 6 正常</span>
      </div>
      <div class="svc-grid">
        <div v-for="s in services" :key="s.name" class="svc-item">
          <span class="dot" :class="s.ok ? 'dot-green' : 'dot-red'"></span>
          <div class="flex-1">
            <div class="svc-name">{{ s.name }}</div>
            <div class="text-caption">{{ s.note }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1240px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }

.metric-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.guide-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 600; color: var(--link-blue);
  border: 1px solid var(--hairline); border-radius: var(--radius-full); padding: 5px 12px;
  background: var(--canvas);
}
.guide-link:hover { border-color: var(--link-blue); }
.metric-card { border-radius: var(--radius-lg); padding: 16px; }
.metric-top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.metric-icon {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.65); display: flex; align-items: center; justify-content: center;
}
.metric-label { font-size: 12px; font-weight: 600; }
.metric-num { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
.metric-num .unit { font-size: 12px; font-weight: 500; margin-left: 3px; color: var(--slate); }
.metric-delta { font-size: 11px; color: var(--slate); margin-top: 6px; opacity: 0.85; }

.chart-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.span-2 { grid-column: span 1; }
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.chart { height: 250px; width: 100%; }

.svc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.svc-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border: 1px solid var(--hairline); border-radius: var(--radius-md); background: var(--surface-soft);
}
.svc-name { font-size: 13.5px; font-weight: 600; }

@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 860px) {
  .page { padding: 20px 16px; }
  .chart-grid { grid-template-columns: 1fr; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .svc-grid { grid-template-columns: 1fr; }
}
</style>
