<script setup lang="ts">
/**
 * 使用说明（管理端）：分权模型说明 + 各板块导览 + 使用技巧 + 常见问题
 * 使用技巧 / 常见问题来自后端配置（工作台维护），分页展示；库为空时回退内置默认
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import FaqModal from '@/components/FaqModal.vue'
import { isSuper } from '@/store/auth'
import { faqs as storeFaqs } from '@/store/faq'
import { tips as storeTips } from '@/store/tips'

// ---------- 分权模型 ----------
const roles = [
  {
    tag: 'tag-gray', name: '普通用户', icon: 'user', tint: 'ro-stone',
    desc: '仅能登录用户端（5173）：上传课堂材料、生成纪要、追问与练习。无法进入管理端。',
  },
  {
    tag: 'tag-blue', name: '管理员', icon: 'shield', tint: 'ro-teal',
    desc: '可登录管理端与用户端：管理用户与内容、处理反馈、查看看板。不能创建管理员账号。',
  },
  {
    tag: 'tag-purple', name: '超级管理员', icon: 'shield', tint: 'ro-purple',
    desc: '拥有管理端全部权限，额外可创建 / 停用管理员账号、重置其密码，并在「协议管理」中维护《用户协议》与《隐私政策》。',
  },
]

// ---------- 板块导览 ----------
const boards = [
  { icon: 'star', tint: 'bo-lavender', name: '工作台', desc: '登录后的默认页：数据速览、常用入口，以及一键进入用户端', note: '' },
  { icon: 'chart', tint: 'bo-sky', name: '数据看板', desc: '近 7 日问答量、课程分布、实时热门追问词与滚动动态，掌握平台整体运行情况', note: '' },
  { icon: 'users', tint: 'bo-mint', name: '账号管理', desc: '统一管理用户与管理员账号：搜索、分类筛选（全部 / 用户 / 管理员 / 启用 / 已停用）、重置密码、停用或恢复；新注册账号排在前面', note: '' },
  { icon: 'book', tint: 'bo-yellow', name: '课堂纪要', desc: '查看用户生成的全部纪要详情（主题 / 知识点 / 定义 / 重点问题），可勾选批量删除违规内容（名下问答与练习一并清除）', note: '' },
  { icon: 'chat', tint: 'bo-lavender', name: '问答记录', desc: '查看智能问答明细，回答内网址可点击直达、来源说明分区展示，溯源出处标注录音时间戳或板书页码；支持全选批量删除', note: '' },
  { icon: 'edit', tint: 'bo-sky', name: '题库管理', desc: '查看练习题（单选 / 多选 / 不定项 / 简答）的题干、选项与参考答案，支持全选批量删除', note: '' },
  { icon: 'database', tint: 'bo-mint', name: '训练样本', desc: '对话数据飞轮：从用户真实问答中筛出高质量样本（点赞 / 复制等正反馈），由 AI 过滤后进入「待审核」队列，人工通过后可导出为 JSONL 微调语料，用于后续检索调优与模型训练', note: '' },
  { icon: 'shield', tint: 'bo-peach', name: '内容审核', desc: '敏感内容审计日志：健康信息抽取、禁忌阻断、违规拦截等处理记录（内容脱敏展示），只读留痕', note: '' },
  { icon: 'flag', tint: 'bo-peach', name: '问题反馈', desc: '查看用户提交的反馈标题、详细描述与截图，标记已处理', note: '' },
  { icon: 'horn', tint: 'bo-yellow', name: '公告管理', desc: '发布公告（发布者本人不弹提醒）、点击卡片查看完整内容、直接编辑修改（需确认，不重新提醒）、撤回与批量删除；「发布日志」全程留痕', note: '' },
  { icon: 'sliders', tint: 'bo-mint', name: '个人设置', desc: '维护头像、用户名、手机号、邮箱与密码，修改即时同步侧边栏', note: '' },
]

// 仅超级管理员可见的板块（协议管理入口在「公告管理」页第三个标签）
const superBoards = [
  {
    icon: 'shield', tint: 'bo-purple', name: '协议管理', note: '仅超级管理员',
    desc: '在「公告管理 → 协议管理」中维护《用户协议》与《隐私政策》：编辑器已预填当前生效内容，可直接修改，保存后立即对所有身份生效',
  },
]

const visibleBoards = computed(() => (isSuper.value ? [...boards, ...superBoards] : boards))

// ---------- 使用技巧（工作台维护；分页展示） ----------
const DEFAULT_TIPS = [
  '更换手机号 / 邮箱需输入验证码，60 秒后可重发；重置密码至少 8 位。',
  '停用账号只禁止登录、不删除数据，随时可以恢复；操作前会弹出二次确认。',
  '管理员账号两端通用：在用户端登录会先进入管理端，工作台可一键回到用户端。',
  '用户名修改后，欢迎语的称呼、侧边栏卡片会同步更新（重新登录同样生效）。',
  '看板核心指标实时来自后端统计接口，热门追问词与最新动态持续更新中。',
]
const TIP_ICONS = ['info', 'lock', 'link', 'users', 'eye']
/** 按技巧的全局序号循环取图标（后端只存文本，图标为展示层装饰） */
function tipIcon(globalIndex: number) {
  return TIP_ICONS[globalIndex % TIP_ICONS.length] ?? 'info'
}
const tipItems = computed(() => (storeTips.admin.length ? storeTips.admin.map((t) => t.text) : DEFAULT_TIPS))
// 关键词搜索：过滤后分页（输入或清空关键词时回到第 1 页）
const tipQuery = ref('')
const filteredTips = computed(() => {
  const k = tipQuery.value.trim().toLowerCase()
  if (!k) return tipItems.value
  return tipItems.value.filter((t) => t.toLowerCase().includes(k))
})
const tipPage = ref(1)
const TIP_PAGE_SIZE = 5
const tipTotalPages = computed(() => Math.max(1, Math.ceil(filteredTips.value.length / TIP_PAGE_SIZE)))
const tipSafePage = computed(() => Math.min(tipPage.value, tipTotalPages.value))
const tipsPaged = computed(() =>
  filteredTips.value.slice((tipSafePage.value - 1) * TIP_PAGE_SIZE, tipSafePage.value * TIP_PAGE_SIZE),
)
watch(tipQuery, () => {
  tipPage.value = 1
})

// ---------- 常见问题：工作台维护的管理端 FAQ（store 由布局挂载时拉取；后端不可用时本地兜底） ----------
const DEFAULT_FAQS = [
  {
    id: 'd1',
    q: '普通用户账号可以登录管理端吗？',
    a: '不可以。两端共用用户端首页的登录表单：普通用户账号登录后只会进入用户端；管理员 / 超级管理员账号登录后先进入管理端工作台，可在工作台一键进入用户端。',
  },
  {
    id: 'd2',
    q: '管理员账号由谁创建？密码忘了怎么办？',
    a: '管理员账号统一由超级管理员在「账号管理」页创建（切换到「管理员」分类或点击右上角「新建管理员账号」），初始密码由超管线下告知；忘记密码时联系超级管理员重置，重置后可自行在个人设置中修改。',
  },
  {
    id: 'd3',
    q: '停用管理员 / 用户账号会影响他们的数据吗？',
    a: '不会。停用仅禁止登录，账号名下的纪要、问答、题库数据全部保留；恢复后一切如常。删除类操作（如删除课堂纪要）才不可恢复，需谨慎确认。',
  },
  {
    id: 'd4',
    q: '数据看板上的数字是真实的吗？',
    a: '看板核心指标实时来自后端统计接口。常见问题均可在工作台维护并同步到本页。',
  },
  {
    id: 'd5',
    q: '「训练样本」页是干嘛的？生成样本和 JSONL 导出是什么意思？',
    a: '训练样本用于沉淀高质量问答数据：系统从真实问答中挑出带正反馈（点赞 / 复制）且有据可依的记录，点「生成样本」由 AI 清洗过滤后进入「待审核」队列；管理员逐条审核，通过后点「导出 JSONL」下载标准训练语料文件（每行一个样本，含问题 / 上下文 / 答案 / 来源），可直接用于模型微调或检索调优。审核不通过的样本不会出现在导出里。',
  },
]
const faqItemsAll = computed(() => (storeFaqs.admin.length ? storeFaqs.admin : DEFAULT_FAQS))
/** 当前查看的 FAQ（点击列表项弹窗展示完整内容；null 表示关闭） */
const faqView = ref<{ q: string; a: string } | null>(null)
// 关键词搜索：匹配问题与解答（过滤后分页，输入或清空关键词时回到第 1 页）
const faqQuery = ref('')
const filteredFaqs = computed(() => {
  const k = faqQuery.value.trim().toLowerCase()
  if (!k) return faqItemsAll.value
  return faqItemsAll.value.filter((f) => (f.q + f.a).toLowerCase().includes(k))
})
const faqPage = ref(1)
const FAQ_PAGE_SIZE = 5
const faqTotalPages = computed(() => Math.max(1, Math.ceil(filteredFaqs.value.length / FAQ_PAGE_SIZE)))
const faqSafePage = computed(() => Math.min(faqPage.value, faqTotalPages.value))
const faqItems = computed(() =>
  filteredFaqs.value.slice((faqSafePage.value - 1) * FAQ_PAGE_SIZE, faqSafePage.value * FAQ_PAGE_SIZE),
)
watch(faqQuery, () => {
  faqPage.value = 1
})
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">使用说明</h1>
      <p class="text-sm">智学纪要管理控制台的功能导览与分权说明</p>
    </header>

    <!-- 分权模型 -->
    <div class="group-head">
      <h2 class="group-title">角色与分权</h2>
      <span class="group-sub">三类账号 · 权限不同</span>
    </div>
    <div class="role-grid">
      <div v-for="r in roles" :key="r.name" class="card card-lg role-card">
        <div class="role-head">
          <span class="role-ico" :class="r.tint"><AppIcon :name="r.icon" :size="16" /></span>
          <span class="role-name">{{ r.name }}</span>
          <span class="tag" :class="r.tag">{{ r.name === '普通用户' ? '用户端' : '双端' }}</span>
        </div>
        <p class="role-desc">{{ r.desc }}</p>
      </div>
    </div>

    <!-- 板块导览 -->
    <div class="group-head">
      <h2 class="group-title">板块导览</h2>
      <span class="group-sub">{{ isSuper ? `${visibleBoards.length} 个板块` : `${visibleBoards.length} 个板块（协议管理仅超级管理员可见）` }}</span>
    </div>
    <div class="board-grid">
      <div v-for="b in visibleBoards" :key="b.name" class="card board-card">
        <div class="board-head">
          <span class="board-ico" :class="b.tint"><AppIcon :name="b.icon" :size="16" /></span>
          <span class="board-name">{{ b.name }}</span>
          <span v-if="b.note" class="tag tag-purple">{{ b.note }}</span>
        </div>
        <p class="board-desc">{{ b.desc }}</p>
      </div>
    </div>

    <!-- 使用技巧 -->
    <div class="group-head">
      <h2 class="group-title">使用技巧</h2>
      <span class="group-sub">{{ tipItems.length }} 个要点</span>
    </div>
    <div class="search-box">
      <AppIcon name="search" :size="15" />
      <input v-model="tipQuery" class="search-input" type="text" placeholder="搜索使用技巧关键词" />
      <button v-if="tipQuery" class="search-clear" aria-label="清空技巧搜索" @click="tipQuery = ''">
        <AppIcon name="x" :size="13" />
      </button>
    </div>
    <div class="tip-list">
      <div v-for="(t, i) in tipsPaged" :key="t" class="tip-row">
        <span class="tip-ico"><AppIcon :name="tipIcon((tipSafePage - 1) * TIP_PAGE_SIZE + i)" :size="14" /></span>
        <span>{{ t }}</span>
      </div>
      <p v-if="!filteredTips.length" class="empty-tip">未找到与「{{ tipQuery.trim() }}」相关的使用技巧，换个关键词试试</p>
    </div>
    <div v-if="filteredTips.length" class="pager">
      <span class="pager-info">共 {{ filteredTips.length }} 条</span>
      <div class="pager-nav">
        <button class="pager-btn" :disabled="tipSafePage <= 1" aria-label="上一页" @click="tipPage = tipSafePage - 1">
          <AppIcon name="chevron-left" :size="14" />
        </button>
        <span class="pager-page">第 {{ tipSafePage }} / {{ tipTotalPages }} 页</span>
        <button class="pager-btn" :disabled="tipSafePage >= tipTotalPages" aria-label="下一页" @click="tipPage = tipSafePage + 1">
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- 常见问题 -->
    <div class="group-head">
      <h2 class="group-title">常见问题</h2>
      <span class="group-sub">{{ faqItemsAll.length }} 个高频疑问</span>
    </div>
    <div class="search-box faq-search">
      <AppIcon name="search" :size="15" />
      <input v-model="faqQuery" class="search-input" type="text" placeholder="搜索常见问题关键词" />
      <button v-if="faqQuery" class="search-clear" aria-label="清空问题搜索" @click="faqQuery = ''">
        <AppIcon name="x" :size="13" />
      </button>
    </div>
    <div class="faq-list">
      <div v-for="f in faqItems" :key="f.id" class="faq-item">
        <button class="faq-q" @click="faqView = f">
          <span class="faq-ico"><AppIcon name="chevron-right" :size="14" /></span>
          <span>{{ f.q }}</span>
        </button>
      </div>
      <p v-if="!filteredFaqs.length" class="empty-tip">未找到与「{{ faqQuery.trim() }}」相关的常见问题，换个关键词试试</p>
    </div>
    <div v-if="filteredFaqs.length" class="pager">
      <span class="pager-info">共 {{ filteredFaqs.length }} 条</span>
      <div class="pager-nav">
        <button class="pager-btn" :disabled="faqSafePage <= 1" aria-label="上一页" @click="faqPage = faqSafePage - 1">
          <AppIcon name="chevron-left" :size="14" />
        </button>
        <span class="pager-page">第 {{ faqSafePage }} / {{ faqTotalPages }} 页</span>
        <button class="pager-btn" :disabled="faqSafePage >= faqTotalPages" aria-label="下一页" @click="faqPage = faqSafePage + 1">
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- 常见问题详情弹窗 -->
    <FaqModal :faq="faqView" @close="faqView = null" />
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 48px; max-width: 1080px; width: 100%; margin: 0 auto; }

.group-head { display: flex; align-items: center; gap: 10px; margin: 30px 0 14px; }
.group-head:first-of-type { margin-top: 4px; }
.group-title { font-size: 15px; font-weight: 600; color: var(--charcoal); letter-spacing: 0.2px; }
.group-sub { font-size: 12.5px; color: var(--stone); }
.group-head::after { content: ''; flex: 1; height: 1px; background: var(--hairline); }

/* 角色卡片 */
.role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.role-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.role-ico { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ro-stone { background: var(--surface-soft); color: var(--steel); }
.ro-teal { background: var(--tint-mint); color: var(--brand-green); }
.ro-purple { background: var(--tint-lavender); color: var(--primary); }
.role-name { font-size: 14.5px; font-weight: 700; flex: 1; }
.role-desc { font-size: 12.5px; color: var(--slate); line-height: 1.75; }

/* 板块导览 */
.board-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.board-card { padding: 16px 18px; }
.board-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; flex-wrap: wrap; }
.board-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bo-lavender { background: var(--tint-lavender); color: var(--primary); }
.bo-sky { background: var(--tint-sky); color: var(--link-blue); }
.bo-mint { background: var(--tint-mint); color: var(--brand-green); }
.bo-yellow { background: var(--tint-yellow); color: #8a6d00; }
.bo-peach { background: var(--tint-peach); color: var(--brand-orange); }
.bo-purple { background: var(--tint-lavender); color: var(--brand-purple); }
.board-name { font-size: 14px; font-weight: 700; flex: 1; }
.board-desc { font-size: 12.5px; color: var(--slate); line-height: 1.7; }

/* 技巧 */
.tip-list { display: flex; flex-direction: column; gap: 8px; }

/* 搜索框（使用技巧 / 常见问题共用） */
.search-box {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--hairline-strong); border-radius: var(--radius-md);
  background: var(--canvas); padding: 0 12px; height: 38px;
  color: var(--stone); margin-bottom: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--tint-lavender); }
.search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: inherit; font-size: 13.5px; color: var(--ink);
}
.search-input::placeholder { color: var(--stone); }
.search-clear {
  border: none; background: transparent; color: var(--stone); cursor: pointer;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); flex-shrink: 0;
}
.search-clear:hover { color: var(--ink); background: var(--surface-soft); }
.empty-tip { text-align: center; color: var(--stone); font-size: 13px; padding: 20px 0; }
.faq-list .empty-tip { border-top: 1px solid var(--hairline); }
.tip-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--surface-soft); border-radius: var(--radius-md);
  padding: 11px 14px; font-size: 13px; color: var(--ink); line-height: 1.65;
}
.tip-ico { color: var(--primary); flex-shrink: 0; margin-top: 2px; display: flex; }

/* 分页条（使用技巧 / 常见问题） */
.pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 12px; }
.pager-info { font-size: 12.5px; color: var(--slate); margin-right: auto; }
.pager-nav { display: flex; align-items: center; gap: 8px; }
.pager-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--canvas); border: 1px solid var(--hairline-strong); border-radius: var(--radius-sm);
  color: var(--slate); cursor: pointer; transition: all 0.15s ease;
}
.pager-btn:hover:not(:disabled) { border-color: var(--steel); color: var(--ink); }
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-page { font-size: 12.5px; color: var(--slate); min-width: 72px; text-align: center; }

/* FAQ */
.faq-list { border: 1px solid var(--hairline); border-radius: 14px; overflow: hidden; background: var(--canvas); }
.faq-item + .faq-item { border-top: 1px solid var(--hairline); }
.faq-q {
  width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
  background: transparent; border: none; font-family: inherit; cursor: pointer;
  padding: 15px 18px; font-size: 14px; font-weight: 600; color: var(--ink);
}
.faq-q:hover { background: var(--surface-soft); }
.faq-ico { display: flex; color: var(--stone); transition: transform 0.18s ease, color 0.18s ease; flex-shrink: 0; }
.faq-q:hover .faq-ico { color: var(--primary); transform: translateX(2px); }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .role-grid, .board-grid { grid-template-columns: 1fr; }
}
</style>
