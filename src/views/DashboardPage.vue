<script setup lang="ts">
/**
 * 数据看板：核心指标 + 近 7 日问答量（ECharts 柱状图）+ 课程分布（ECharts 条形图）
 * 热门追问词：从问答记录的「问题 + 回答」文本实时统计高频概念，问答变化词云随之变化
 * 最新动态：轮播展示，最新一条定期从顶部推入、依次覆盖旧动态
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/AppIcon.vue'
import { accounts } from '@/store/auth'
import { notes, qaRecords, quizItems, feedbacks, weeklyQa, recentEvents } from '@/store/admin'

const userCount = accounts.filter((a) => a.role === 'user').length
const pendingCount = feedbacks.filter((f) => f.status === '待处理').length

const stats = [
  { label: '用户总数', value: userCount, icon: 'users', tint: 'st-lavender', delta: '较上周 +1' },
  { label: '课堂纪要', value: notes.length, icon: 'book', tint: 'st-sky', delta: '本周新增 3' },
  { label: '问答记录', value: 835, icon: 'chat', tint: 'st-mint', delta: '近 7 日 ' + weeklyQa.reduce((s, w) => s + w.count, 0) + ' 次' },
  { label: '练习题库', value: quizItems.length, icon: 'edit', tint: 'st-peach', delta: '覆盖 3 门课程' },
  { label: '待处理反馈', value: pendingCount, icon: 'flag', tint: 'st-rose', delta: pendingCount ? '需要尽快处理' : '暂无待办' },
]

// ---------- ECharts：近 7 日问答量 ----------
const trendRef = ref<HTMLElement>()
const distRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let distChart: echarts.ECharts | null = null

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderColor: '#eceef2',
  borderWidth: 1,
  textStyle: { color: '#262b35', fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 24px rgba(10,21,48,0.12); border-radius: 10px;',
}

function initTrend() {
  if (!trendRef.value) return
  trendChart = echarts.init(trendRef.value)
  trendChart.setOption({
    grid: { left: 6, right: 6, top: 30, bottom: 2, containLabel: true },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (p: unknown) => {
        const arr = p as Array<{ name: string; value: number }>
        const d = arr[0]
        return d ? `${d.name}<br/><strong>${d.value}</strong> 次问答` : ''
      },
    },
    xAxis: {
      type: 'category', data: weeklyQa.map((w) => w.day), boundaryGap: true,
      axisLine: { lineStyle: { color: '#eceef2' } }, axisTick: { show: false },
      axisLabel: { color: '#9aa3b2', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f7' } },
      axisLabel: { color: '#9aa3b2', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: weeklyQa.map((w) => w.count),
      barWidth: '44%',
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#7b3ff2' },
          { offset: 1, color: '#5645d4' },
        ]),
      },
      showBackground: true,
      backgroundStyle: { color: '#f5f6f9', borderRadius: [8, 8, 0, 0] },
      label: { show: true, position: 'top', color: '#5b6472', fontSize: 11, fontWeight: 600 },
    }],
  })
}

// ---------- ECharts：课程分布（按纪要数） ----------
const courseDist = computed(() => {
  const map = new Map<string, number>()
  for (const n of notes) map.set(n.course, (map.get(n.course) || 0) + 1)
  return [...map.entries()].map(([course, count]) => ({ course, count }))
})

function initDist() {
  if (!distRef.value) return
  distChart = echarts.init(distRef.value)
  distChart.setOption({
    grid: { left: 6, right: 40, top: 10, bottom: 10, containLabel: true },
    tooltip: {
      trigger: 'item',
      ...TOOLTIP_STYLE,
      formatter: (p: unknown) => {
        const d = p as { name: string; value: number }
        return `${d.name}<br/><strong>${d.value}</strong> 份纪要`
      },
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: courseDist.value.map((r) => r.course).reverse(),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#3d4351', fontSize: 12, fontWeight: 600 },
    },
    series: [{
      type: 'bar',
      data: courseDist.value.map((r) => r.count).reverse(),
      barWidth: 12,
      itemStyle: { borderRadius: 6, color: '#2a9d99' },
      label: { show: true, position: 'right', formatter: '{c} 份', color: '#5b6472', fontSize: 11 },
    }],
  })
}

function onResize() {
  trendChart?.resize()
  distChart?.resize()
}
onMounted(() => {
  initTrend()
  initDist()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  distChart?.dispose()
})

// ---------- 热门追问词：从问答记录文本实时统计 ----------
const CANDIDATE_WORDS = [
  '泰勒公式', '麦克劳林', '拉格朗日', '佩亚诺', '级数', '收敛', '莱布尼茨',
  '进程', '线程', '阻塞', '调度', '页面置换', 'LRU', '虚拟内存', '缺页',
  '二叉树', '遍历', '先序', '中序', '后序', '完全二叉树', '时间复杂度',
  'Dijkstra', 'Floyd', '最短路径', '负权', '邻接',
  '偏导数', '全微分', '连续', '可微',
]
function countOccurrences(text: string, word: string) {
  return text.split(word).length - 1
}
const hotWords = computed(() => {
  const text = qaRecords.map((q) => `${q.question} ${q.answer}`).join(' ').toLowerCase()
  return CANDIDATE_WORDS.map((word) => ({ word, count: countOccurrences(text, word) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})
const maxHot = computed(() => Math.max(...hotWords.value.map((w) => w.count), 1))
const hotSize = (c: number) => 12 + Math.round((c / maxHot.value) * 6)
const hotTag = (i: number) => ['tag-purple', 'tag-blue', 'tag-green', 'tag-orange', 'tag-yellow'][i % 5]

// ---------- 最新动态：轮播覆盖 ----------
const FEED_SHOW = 5
const feedOffset = ref(0)
let feedTimer: number | null = null
onMounted(() => {
  feedTimer = window.setInterval(() => {
    feedOffset.value = (feedOffset.value + 1) % recentEvents.length
  }, 3500)
})
onBeforeUnmount(() => {
  if (feedTimer) window.clearInterval(feedTimer)
})
const visibleEvents = computed(() => {
  const out: typeof recentEvents = []
  for (let i = 0; i < Math.min(FEED_SHOW, recentEvents.length); i++) {
    const e = recentEvents[(feedOffset.value + i) % recentEvents.length]
    if (e) out.push(e)
  }
  return out
})
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">数据看板</h1>
      <p class="text-sm">平台运行与使用情况总览（演示数据）</p>
    </header>

    <!-- 核心指标 -->
    <section class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="card stat-card">
        <span class="stat-ico" :class="s.tint"><AppIcon :name="s.icon" :size="18" /></span>
        <div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-delta">{{ s.delta }}</div>
        </div>
      </div>
    </section>

    <div class="grid">
      <div class="col">
        <!-- 近 7 日问答量（ECharts） -->
        <section class="card card-lg">
          <div class="h4 mb-sm">近 7 日问答量</div>
          <div ref="trendRef" class="chart chart-trend" role="img" aria-label="近 7 日问答量柱状图"></div>
        </section>

        <!-- 课程分布（ECharts） -->
        <section class="card card-lg">
          <div class="h4 mb-sm">课程分布（按纪要数）</div>
          <div ref="distRef" class="chart chart-dist" role="img" aria-label="课程分布条形图"></div>
        </section>
      </div>

      <div class="col">
        <!-- 热门追问词（按问答记录实时统计） -->
        <section class="card card-lg">
          <div class="h4 mb-sm">热门追问词</div>
          <p class="text-caption mb-sm">实时统计自智能问答的问题与回答，追问越多字号越大</p>
          <div class="word-cloud">
            <span
              v-for="(w, i) in hotWords" :key="w.word"
              class="tag word" :class="hotTag(i)"
              :style="{ fontSize: hotSize(w.count) + 'px' }"
              :title="`问答记录中出现 ${w.count} 次`"
            >{{ w.word }}</span>
            <span v-if="!hotWords.length" class="text-caption">暂无热门追问词</span>
          </div>
        </section>

        <!-- 最新动态（轮播覆盖） -->
        <section class="card card-lg">
          <div class="feed-head">
            <div class="h4">最新动态</div>
            <span class="live-dot" aria-hidden="true"></span>
          </div>
          <TransitionGroup tag="ul" name="feed" class="events">
            <li v-for="e in visibleEvents" :key="e.time + e.text" class="event">
              <span class="dot dot-purple"></span>
              <span class="event-text">{{ e.text }}</span>
              <span class="event-time">{{ e.time }}</span>
            </li>
          </TransitionGroup>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }

.stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { display: flex; align-items: flex-start; gap: 12px; padding: 16px; }
.stat-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.st-lavender { background: var(--tint-lavender); color: var(--primary); }
.st-sky { background: var(--tint-sky); color: var(--link-blue); }
.st-mint { background: var(--tint-mint); color: var(--brand-green); }
.st-peach { background: var(--tint-peach); color: var(--brand-orange); }
.st-rose { background: var(--tint-rose); color: var(--error); }
.stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.2; }
.stat-label { font-size: 12.5px; color: var(--slate); }
.stat-delta { font-size: 11px; color: var(--stone); margin-top: 2px; }

.grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 16px; }

/* ECharts 容器 */
.chart { width: 100%; }
.chart-trend { height: 250px; }
.chart-dist { height: 168px; }

/* 词云 */
.word-cloud { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.word { cursor: default; }

/* 最新动态 */
.feed-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-green); animation: live-pulse 1.6s ease-in-out infinite; }
@keyframes live-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(42, 157, 153, 0.35); }
  50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(42, 157, 153, 0); }
}
.events { list-style: none; display: flex; flex-direction: column; gap: 12px; position: relative; }
.event { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.55; }
.event .dot { margin-top: 6px; flex-shrink: 0; }
.event-text { flex: 1; color: var(--ink); }
.event-time { font-size: 11.5px; color: var(--stone); flex-shrink: 0; margin-top: 2px; }

/* 轮播覆盖动画：新动态从顶部滑入覆盖，旧动态沉底淡出，其余平滑下移 */
.feed-move { transition: transform 0.45s ease; }
.feed-enter-active { transition: opacity 0.45s ease, transform 0.45s ease; }
.feed-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; position: absolute; left: 0; right: 0; }
.feed-enter-from { opacity: 0; transform: translateY(-16px); }
.feed-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 1020px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
</style>
