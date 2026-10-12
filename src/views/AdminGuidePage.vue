<script setup lang="ts">
/**
 * 管理端 · 使用说明：帮助管理员理解控制台职责与推荐运维流程
 */
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const modules = [
  { icon: 'chart', tint: 'tint-sky', name: '系统总览', desc: '每天的起点。查看 6 项核心指标（用户数 / 文档数 / 向量数 / 请求量 / 存储 / 健康度）和服务巡检面板，红色圆点代表异常服务需优先处理。' },
  { icon: 'users', tint: 'tint-lavender', name: '用户管理', desc: '管理平台账号：按角色 / 姓名筛选，可禁用违规账号、为忘记密码的员工生成临时密码、删除离职账户。' },
  { icon: 'folder', tint: 'tint-mint', name: '知识空间管理', desc: '规划知识结构。按业务线创建空间（技术文档 / 公司规章…），指派负责人，监控各空间的文档量与向量规模。' },
  { icon: 'layers', tint: 'tint-yellow-bold', name: '文档解析管理', desc: '平台流水线核心。实时查看解析队列进度，失败文档一键重试；这里的健康度直接决定用户端回答质量。' },
  { icon: 'server', tint: 'tint-peach', name: '系统日志', desc: '排查问题的第一现场。按 INFO / WARN / ERROR 分级筛选并支持关键词搜索，ERROR 级别需要当日跟进。' },
  { icon: 'inbox', tint: 'tint-rose', name: '反馈处理', desc: '用户之声。将反馈从「待处理」流转到「处理中」「已解决」，功能异常类反馈应结合系统日志定位原因。' },
]

const flow = [
  { n: 1, title: '晨间巡检', desc: '进入「系统总览」，确认 6 项巡检全部绿灯；重点看「LLM 推理服务」是否延迟偏高。' },
  { n: 2, title: '盯一眼解析队列', desc: '「文档解析管理」中查看排队 / 切片 / 向量化任务是否正常推进，失败文档评估后重试或通知上传者。' },
  { n: 3, title: '处理 ERROR 日志', desc: '「系统日志」筛选 ERROR 级别，如出现“向量库连接池耗尽”需立即检查服务负载。' },
  { n: 4, title: '跟进用户反馈', desc: '「反馈处理」清空待处理列表，功能异常类结合日志定位，处理完成后更新状态。' },
  { n: 5, title: '周度盘点', desc: '每周汇总知识空间增长与用户活跃 TOP5，规划下阶段的知识库运营重点。' },
]

const faqs = ref<{ q: string; a: string; open: boolean }[]>([
  {
    q: '文档解析失败（提示扫描件）怎么处理？',
    a: '扫描版 PDF 没有文字层，当前流水线无法直接解析。建议通知上传者用 OCR 工具转换后重新上传；管理端可在「文档解析管理」点击「重试」验证。',
    open: false,
  },
  {
    q: '用户忘记密码怎么办？',
    a: '在「用户管理」找到该用户，点击「重置密码」，系统会生成一个临时密码，请线下告知用户并提醒其尽快在个人设置中修改。',
    open: false,
  },
  {
    q: '向量库磁盘使用率过高怎么办？',
    a: '日志出现 WARN「磁盘使用率达到 78%」时，优先清理长期「解析失败」的残留向量数据与已下线知识空间；必要时扩容磁盘并重启解析服务。',
    open: false,
  },
  {
    q: '系统日志保留多久？',
    a: '默认保留 30 天，超期自动归档清理。如需审计更早的操作记录，请定期导出备份。',
    open: false,
  },
  {
    q: '禁用用户会删除他的数据吗？',
    a: '不会。禁用仅阻断登录，其提问历史与上传文档全部保留；确认需要彻底清除时再使用「删除」操作（不可恢复）。',
    open: false,
  },
])

function toggle(i: number) {
  const item = faqs.value[i]
  if (item) item.open = !item.open
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="h1">使用说明</h1>
      <p class="text-md">管理控制台负责平台的「人、知识、健康度」三条线。下面 5 分钟带你理清每个模块的职责和推荐操作节奏。</p>
    </header>

    <!-- 职责横幅 -->
    <section class="banner tint-yellow-bold">
      <div class="banner-head">
        <AppIcon name="shield" :size="20" />
        <span>管理员三大职责</span>
      </div>
      <div class="duty-grid">
        <div class="duty"><b>管知识</b><span>规划知识空间、保障解析流水线稳定，让 AI “学得对”</span></div>
        <div class="duty"><b>管用户</b><span>账号生命周期管理与权限分配，让平台“用得放心”</span></div>
        <div class="duty"><b>管健康</b><span>巡检服务状态、跟进日志与反馈，让系统“跑得稳定”</span></div>
      </div>
    </section>

    <!-- 模块导览 -->
    <h2 class="h3 sec-title">六大管理模块</h2>
    <div class="mod-grid">
      <div v-for="m in modules" :key="m.name" class="mod-card" :class="m.tint">
        <div class="mod-icon"><AppIcon :name="m.icon" :size="18" /></div>
        <div class="h4">{{ m.name }}</div>
        <p class="mod-desc">{{ m.desc }}</p>
      </div>
    </div>

    <!-- 推荐运维节奏 -->
    <h2 class="h3 sec-title">推荐的日常运维节奏</h2>
    <div class="card flow-card">
      <div v-for="s in flow" :key="s.n" class="flow-row">
        <div class="flow-num">{{ s.n }}</div>
        <div>
          <div class="flow-title">{{ s.title }}</div>
          <p class="flow-desc">{{ s.desc }}</p>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <h2 class="h3 sec-title">常见问题 FAQ</h2>
    <div class="faq-list">
      <div v-for="(f, i) in faqs" :key="f.q" class="faq-item">
        <button class="faq-q" @click="toggle(i)">
          <AppIcon name="chevron-right" :size="15" :style="{ transform: f.open ? 'rotate(90deg)' : '' }" />
          <span>{{ f.q }}</span>
        </button>
        <p v-if="f.open" class="faq-a">{{ f.a }}</p>
      </div>
    </div>

    <p class="text-caption foot">遇到控制台本身的故障，请携带 ERROR 日志截图联系平台研发团队。</p>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 48px; max-width: 1040px; width: 100%; margin: 0 auto; }
.head { margin-bottom: 22px; }
.head .text-md { margin-top: 8px; color: var(--slate); }

.banner { border-radius: var(--radius-lg); padding: 26px 28px; margin-bottom: 32px; }
.banner-head { display: flex; align-items: center; gap: 9px; font-size: 17px; font-weight: 700; margin-bottom: 18px; }
.duty-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.duty b { display: block; font-size: 15px; margin-bottom: 4px; }
.duty span { font-size: 13px; color: var(--slate); line-height: 1.6; }

.sec-title { margin-bottom: 14px; }
.mod-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
.mod-card { border-radius: var(--radius-lg); padding: 20px; }
.mod-icon {
  width: 36px; height: 36px; border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.6); display: flex; align-items: center; justify-content: center;
  margin-bottom: 12px;
}
.mod-desc { font-size: 13px; color: var(--slate); line-height: 1.65; margin-top: 6px; }

.flow-card { margin-bottom: 32px; padding: 10px 22px; }
.flow-row {
  display: flex; gap: 14px; padding: 15px 0;
  border-bottom: 1px solid var(--hairline-soft);
}
.flow-row:last-child { border-bottom: none; }
.flow-num {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  background: var(--brand-navy); color: var(--brand-yellow);
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.flow-title { font-size: 14.5px; font-weight: 600; }
.flow-desc { font-size: 13px; color: var(--slate); line-height: 1.6; margin-top: 3px; }

.faq-list { border: 1px solid var(--hairline); border-radius: var(--radius-lg); overflow: hidden; background: var(--canvas); }
.faq-item { border-bottom: 1px solid var(--hairline); }
.faq-item:last-child { border-bottom: none; }
.faq-q {
  width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
  background: transparent; border: none; padding: 16px 20px;
  font-size: 15px; font-weight: 600; color: var(--ink); font-family: inherit;
}
.faq-q:hover { background: var(--surface-soft); }
.faq-q svg { color: var(--stone); transition: transform 0.15s ease; flex-shrink: 0; }
.faq-a { padding: 0 20px 16px 45px; font-size: 13.5px; color: var(--slate); line-height: 1.7; }

.foot { margin-top: 18px; text-align: center; }

@media (max-width: 860px) {
  .page { padding: 20px 16px 40px; }
  .duty-grid, .mod-grid { grid-template-columns: 1fr; }
}
</style>
