<script setup lang="ts">
/**
 * 使用说明（管理端）：分权模型说明 + 各板块导览 + 使用技巧 + 常见问题
 */
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { isSuper } from '@/store/auth'

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
    desc: '拥有管理端全部权限，额外可创建 / 停用管理员账号、重置其密码。',
  },
]

// ---------- 板块导览 ----------
const boards = [
  { icon: 'star', tint: 'bo-lavender', name: '工作台', desc: '登录后的默认页：数据速览、常用入口，以及一键进入用户端', note: '' },
  { icon: 'chart', tint: 'bo-sky', name: '数据看板', desc: '近 7 日问答量、课程分布、实时热门追问词与滚动动态，掌握平台整体运行情况', note: '' },
  { icon: 'users', tint: 'bo-mint', name: '账号管理', desc: '统一管理用户与管理员账号：搜索、分类筛选（全部 / 用户 / 管理员 / 启用 / 已停用）、重置密码、停用或恢复；新注册账号排在前面', note: '' },
  { icon: 'book', tint: 'bo-yellow', name: '课堂纪要', desc: '查看用户生成的全部纪要详情（主题 / 知识点 / 定义 / 重点问题），可删除违规内容', note: '' },
  { icon: 'chat', tint: 'bo-lavender', name: '问答记录', desc: '查看智能问答明细，每条回答均带录音时间戳或板书页码溯源', note: '' },
  { icon: 'edit', tint: 'bo-sky', name: '题库管理', desc: '查看练习题（单选 / 多选 / 不定项 / 简答）的题干、选项与参考答案', note: '' },
  { icon: 'flag', tint: 'bo-peach', name: '问题反馈', desc: '查看用户提交的反馈标题、详细描述与截图，标记已处理', note: '' },
  { icon: 'sliders', tint: 'bo-mint', name: '个人设置', desc: '维护头像、用户名、手机号、邮箱与密码，修改即时同步侧边栏', note: '' },
]

// ---------- 使用技巧 ----------
const tips = [
  { icon: 'info', text: '演示环境下手机号 / 邮箱验证码统一为 123456；重置密码至少 8 位。' },
  { icon: 'lock', text: '停用账号只禁止登录、不删除数据，随时可以恢复；操作前会弹出二次确认。' },
  { icon: 'link', text: '管理员账号两端通用：在用户端登录会先进入管理端，工作台可一键回到用户端。' },
  { icon: 'users', text: '用户名修改后，欢迎语的称呼、侧边栏卡片会同步更新（重新登录同样生效）。' },
  { icon: 'eye', text: '看板图表与动态为演示数据，接入后端后替换为统计接口即可，页面结构不变。' },
]

// ---------- 常见问题 ----------
const faqs = ref([
  {
    q: '普通用户账号可以登录管理端吗？',
    a: '不可以。两端共用用户端首页的登录表单：普通用户账号登录后只会进入用户端；管理员 / 超级管理员账号登录后先进入管理端工作台，可在工作台一键进入用户端。',
    open: false,
  },
  {
    q: '管理员账号由谁创建？密码忘了怎么办？',
    a: '管理员账号统一由超级管理员在「账号管理」页创建（切换到「管理员」分类或点击右上角「新建管理员账号」），初始密码由超管线下告知；忘记密码时联系超级管理员重置，重置后可自行在个人设置中修改。',
    open: false,
  },
  {
    q: '停用管理员 / 用户账号会影响他们的数据吗？',
    a: '不会。停用仅禁止登录，账号名下的纪要、问答、题库数据全部保留；恢复后一切如常。删除类操作（如删除课堂纪要）才不可恢复，需谨慎确认。',
    open: false,
  },
  {
    q: '数据看板上的数字是真实的吗？',
    a: '当前为演示环境，看板指标、热门追问词与最新动态均来自前端演示数据：热门追问词实时统计自问答记录文本，最新动态每 3.5 秒轮播一次。接入后端后由统计接口提供。',
    open: false,
  },
])
function toggleFaq(i: number) {
  const f = faqs.value[i]
  if (f) f.open = !f.open
}
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
      <span class="group-sub">{{ isSuper ? '9 个板块' : '8 个板块（管理员账号仅超级管理员可见）' }}</span>
    </div>
    <div class="board-grid">
      <div v-for="b in boards" :key="b.name" class="card board-card">
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
      <span class="group-sub">5 个要点</span>
    </div>
    <div class="tip-list">
      <div v-for="t in tips" :key="t.text" class="tip-row">
        <span class="tip-ico"><AppIcon :name="t.icon" :size="14" /></span>
        <span>{{ t.text }}</span>
      </div>
    </div>

    <!-- 常见问题 -->
    <div class="group-head">
      <h2 class="group-title">常见问题</h2>
      <span class="group-sub">4 个高频疑问</span>
    </div>
    <div class="faq-list">
      <div v-for="(f, i) in faqs" :key="f.q" class="faq-item">
        <button class="faq-q" :class="{ open: f.open }" @click="toggleFaq(i)">
          <span class="faq-ico"><AppIcon name="plus" :size="14" /></span>
          <span>{{ f.q }}</span>
        </button>
        <p v-if="f.open" class="faq-a">{{ f.a }}</p>
      </div>
    </div>
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
.tip-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--surface-soft); border-radius: var(--radius-md);
  padding: 11px 14px; font-size: 13px; color: var(--ink); line-height: 1.65;
}
.tip-ico { color: var(--primary); flex-shrink: 0; margin-top: 2px; display: flex; }

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
.faq-q.open .faq-ico { transform: rotate(45deg); color: var(--primary); }
.faq-a { padding: 0 18px 15px 42px; font-size: 13px; color: var(--slate); line-height: 1.75; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .role-grid, .board-grid { grid-template-columns: 1fr; }
}
</style>
