<script setup lang="ts">
/**
 * 欢迎页（工作台）：管理员登录后默认进入的简约首页
 * 按时段问候 + 核心数据速览 + 进入用户端按钮 + 常用入口 + FAQ 常见问题管理
 * FAQ 管理可分别维护用户端 / 管理端两套常见问题（问题标题 + 解决描述）
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { USER_ORIGIN, session, isSuper, accounts } from '@/store/auth'
import { getRefresh, getToken } from '@/api/http'
import { notes, qaRecords, quizItems, feedbacks, displayCourses } from '@/store/admin'
import { faqs, addFaq, updateFaq, removeFaq, type FaqItem, type FaqScope } from '@/store/faq'
import { tips, addTip, updateTip, removeTip, type TipItem, type TipScope } from '@/store/tips'

const router = useRouter()

const greet = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const dateLabel = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
)

const userCount = computed(() => accounts.filter((a) => a.role === 'user').length)
const pendingCount = computed(() => feedbacks.filter((f) => f.status === '待处理').length)
const roleLabel = computed(() => (isSuper.value ? '超级管理员' : '管理员'))

const stats = computed(() => [
  { label: '用户总数', value: userCount.value, icon: 'users', tint: 'st-lavender', unit: '人' },
  { label: '课堂纪要', value: notes.length, icon: 'book', tint: 'st-sky', unit: '份' },
  { label: '问答记录', value: qaRecords.length, icon: 'chat', tint: 'st-mint', unit: '条' },
  { label: '待处理反馈', value: pendingCount.value, icon: 'flag', tint: 'st-peach', unit: '条' },
])

const quizTotal = computed(() => quizItems.length)
const courseCount = computed(() => displayCourses.value.length)

/** 进入用户端（演示 SSO：携带登录态参数免登，管理员身份在用户端同样可用）
 * 必须带 t / rt（JWT）：用户端 acceptUserSso 缺 token 视为无效会落到登录页要求重新登录 */
function enterUserSide() {
  const s = session.value
  if (!s) return
  const q = new URLSearchParams({
    sso: '1',
    n: s.name,
    e: s.email,
    r: s.role,
    t: getToken() || '',
    rt: getRefresh() || '',
  })
  window.location.href = `${USER_ORIGIN}/studio?${q.toString()}`
}

// ---------- FAQ 常见问题管理（用户端 / 管理端两套） ----------
// 分权：管理端内容仅超级管理员可编辑，管理员只能维护用户端内容
const faqScope = ref<FaqScope>('user')
const faqList = computed(() => faqs[faqScope.value])
// 关键词搜索：在当前端的列表内过滤（匹配问题标题与解决描述）
const faqQuery = ref('')
const filteredFaqList = computed(() => {
  const k = faqQuery.value.trim().toLowerCase()
  if (!k) return faqList.value
  return faqList.value.filter((f) => (f.q + f.a).toLowerCase().includes(k))
})
const scopeLabel = computed(() => (faqScope.value === 'user' ? '用户端' : faqScope.value === 'home' ? '首页' : '管理端'))
/** 修改 / 删除弹窗里的展示位置说明（首页 FAQ 展示在着陆页，其余在对应端「使用说明」） */
const faqWhereLabel = computed(() => (faqScope.value === 'home' ? '用户端首页' : `${scopeLabel.value}「使用说明」`))
const canManageAdminContent = isSuper

// ---------- FAQ 列表分页（每页 3 / 5 / 10 条，切换端 / 搜索 / 每页条数后回到第 1 页） ----------
const faqPage = ref(1)
const faqPageSize = ref(3)
const faqTotalPages = computed(() => Math.max(1, Math.ceil(filteredFaqList.value.length / faqPageSize.value)))
const faqSafePage = computed(() => Math.min(faqPage.value, faqTotalPages.value))
const faqPaged = computed(() =>
  filteredFaqList.value.slice((faqSafePage.value - 1) * faqPageSize.value, faqSafePage.value * faqPageSize.value),
)
watch([faqScope, faqQuery], () => {
  faqPage.value = 1
})
function setFaqPageSize(s: number) {
  faqPageSize.value = s
  faqPage.value = 1
}

// 新增 / 编辑表单弹窗（editing 为 null 表示新增）
const showFaqForm = ref(false)
const faqEditing = ref<FaqItem | null>(null)
const faqForm = ref({ q: '', a: '' })
const faqFormError = ref('')

function openFaqCreate() {
  faqEditing.value = null
  faqForm.value = { q: '', a: '' }
  faqFormError.value = ''
  showFaqForm.value = true
}
function openFaqEdit(item: FaqItem) {
  faqEditing.value = item
  faqForm.value = { q: item.q, a: item.a }
  faqFormError.value = ''
  showFaqForm.value = true
}
async function confirmFaqSave() {
  const q = faqForm.value.q.trim()
  const a = faqForm.value.a.trim()
  if (!q) {
    faqFormError.value = '请输入问题标题'
    return
  }
  if (!a) {
    faqFormError.value = '请输入解决描述'
    return
  }
  try {
    if (faqEditing.value) {
      await updateFaq(faqScope.value, faqEditing.value.id, q, a)
    } else {
      await addFaq(faqScope.value, q, a)
      // 新增的条目追加在列表末尾，跳到最后一页确保立即可见
      faqPage.value = Math.max(1, Math.ceil(filteredFaqList.value.length / faqPageSize.value))
    }
    showFaqForm.value = false
  } catch (e) {
    faqFormError.value = e instanceof Error ? e.message : '保存失败，请稍后再试'
  }
}

// 删除确认
const faqDeleteTarget = ref<FaqItem | null>(null)
const faqDeleteError = ref('')
async function confirmFaqDelete() {
  if (!faqDeleteTarget.value) return
  try {
    await removeFaq(faqScope.value, faqDeleteTarget.value.id)
    faqDeleteTarget.value = null
    faqDeleteError.value = ''
  } catch (e) {
    faqDeleteError.value = e instanceof Error ? e.message : '删除失败，请稍后再试'
  }
}

// ---------- 使用技巧管理（用户端 / 管理端两套，分权与 FAQ 一致） ----------
const tipScope = ref<TipScope>('user')
const tipList = computed(() => tips[tipScope.value])
const tipScopeLabel = computed(() => (tipScope.value === 'user' ? '用户端' : '管理端'))

// ---------- 使用技巧列表分页（每页 3 / 5 / 10 条，切换端 / 搜索 / 每页条数后回到第 1 页） ----------
const tipQuery = ref('')
const filteredTipList = computed(() => {
  const k = tipQuery.value.trim().toLowerCase()
  if (!k) return tipList.value
  return tipList.value.filter((t) => t.text.toLowerCase().includes(k))
})
const tipPage = ref(1)
const tipPageSize = ref(3)
const tipTotalPages = computed(() => Math.max(1, Math.ceil(filteredTipList.value.length / tipPageSize.value)))
const tipSafePage = computed(() => Math.min(tipPage.value, tipTotalPages.value))
const tipPaged = computed(() =>
  filteredTipList.value.slice((tipSafePage.value - 1) * tipPageSize.value, tipSafePage.value * tipPageSize.value),
)
watch([tipScope, tipQuery], () => {
  tipPage.value = 1
})
function setTipPageSize(s: number) {
  tipPageSize.value = s
  tipPage.value = 1
}

// 新增 / 编辑表单弹窗（editing 为 null 表示新增）
const showTipForm = ref(false)
const tipEditing = ref<TipItem | null>(null)
const tipForm = ref({ text: '' })
const tipFormError = ref('')

function openTipCreate() {
  tipEditing.value = null
  tipForm.value = { text: '' }
  tipFormError.value = ''
  showTipForm.value = true
}
function openTipEdit(item: TipItem) {
  tipEditing.value = item
  tipForm.value = { text: item.text }
  tipFormError.value = ''
  showTipForm.value = true
}
async function confirmTipSave() {
  const text = tipForm.value.text.trim()
  if (!text) {
    tipFormError.value = '请输入技巧内容'
    return
  }
  try {
    if (tipEditing.value) {
      await updateTip(tipScope.value, tipEditing.value.id, text)
    } else {
      await addTip(tipScope.value, text)
      // 新增的条目追加在列表末尾，跳到最后一页确保立即可见
      tipPage.value = Math.max(1, Math.ceil(filteredTipList.value.length / tipPageSize.value))
    }
    showTipForm.value = false
  } catch (e) {
    tipFormError.value = e instanceof Error ? e.message : '保存失败，请稍后再试'
  }
}

// 删除确认
const tipDeleteTarget = ref<TipItem | null>(null)
const tipDeleteError = ref('')
async function confirmTipDelete() {
  if (!tipDeleteTarget.value) return
  try {
    await removeTip(tipScope.value, tipDeleteTarget.value.id)
    tipDeleteTarget.value = null
    tipDeleteError.value = ''
  } catch (e) {
    tipDeleteError.value = e instanceof Error ? e.message : '删除失败，请稍后再试'
  }
}
</script>

<template>
  <div class="page">
    <span class="deco p1" aria-hidden="true"></span>
    <span class="deco p2" aria-hidden="true"></span>
    <span class="deco p3" aria-hidden="true"></span>

    <section class="hero">
      <span class="eyebrow"><AppIcon name="shield" :size="13" /> {{ roleLabel }} · 管理控制台</span>
      <h1>{{ greet }}，{{ session?.name || '管理员' }}</h1>
      <p class="date">{{ dateLabel }} · 欢迎回到智学纪要管理控制台</p>

      <div class="hero-actions">
        <button class="btn btn-primary btn-lg enter-btn" @click="enterUserSide">
          进入用户端 <AppIcon name="send" :size="15" />
        </button>
        <button class="btn btn-secondary btn-lg" @click="router.push('/admin/dashboard')">查看数据看板</button>
      </div>
    </section>

    <section class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="card stat-card">
        <span class="stat-ico" :class="s.tint"><AppIcon :name="s.icon" :size="18" /></span>
        <div>
          <div class="stat-value">{{ s.value }}<span class="stat-unit">{{ s.unit }}</span></div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <section class="quick-row">
      <button class="card card-hover quick-card" @click="router.push('/admin/feedbacks')">
        <span class="quick-ico q-yellow"><AppIcon name="flag" :size="16" /></span>
        <div class="flex-1">
          <div class="quick-title">处理反馈{{ pendingCount ? `（${pendingCount} 条待处理）` : '' }}</div>
          <div class="quick-desc">查看用户提交的反馈详情与截图</div>
        </div>
        <AppIcon name="chevron-right" :size="15" class="quick-arrow" />
      </button>
      <button class="card card-hover quick-card" @click="router.push('/admin/accounts')">
        <span class="quick-ico q-blue"><AppIcon name="users" :size="16" /></span>
        <div class="flex-1">
          <div class="quick-title">账号管理</div>
          <div class="quick-desc">统一管理用户与管理员账号{{ isSuper ? '' : '（用户账号）' }}</div>
        </div>
        <AppIcon name="chevron-right" :size="15" class="quick-arrow" />
      </button>
      <button class="card card-hover quick-card" @click="router.push('/admin/quiz')">
        <span class="quick-ico q-mint"><AppIcon name="edit" :size="16" /></span>
        <div class="flex-1">
          <div class="quick-title">题库巡检</div>
          <div class="quick-desc">共 {{ quizTotal }} 道练习题，覆盖 {{ courseCount }} 门课程</div>
        </div>
        <AppIcon name="chevron-right" :size="15" class="quick-arrow" />
      </button>
      <button class="card card-hover quick-card" @click="router.push('/admin/notes')">
        <span class="quick-ico q-purple"><AppIcon name="book" :size="16" /></span>
        <div class="flex-1">
          <div class="quick-title">课堂纪要巡检</div>
          <div class="quick-desc">查看纪要详情，处理违规内容</div>
        </div>
        <AppIcon name="chevron-right" :size="15" class="quick-arrow" />
      </button>
    </section>

    <!-- FAQ 常见问题管理 -->
    <section class="card faq-manage">
      <div class="faq-head">
        <div>
          <div class="h4"><AppIcon name="info" :size="16" /> FAQ 常见问题管理</div>
          <p class="faq-sub">维护用户端「使用说明」、用户端首页与管理端「使用说明」中的常见问题，每条由问题标题与解决描述组成</p>
        </div>
        <button class="btn btn-primary" @click="openFaqCreate"><AppIcon name="plus" :size="15" /> 新增 FAQ</button>
      </div>

      <div class="seg-tabs faq-tabs">
        <button class="seg-tab" :class="{ active: faqScope === 'user' }" @click="faqScope = 'user'">用户端 FAQ（{{ faqs.user.length }}）</button>
        <button class="seg-tab" :class="{ active: faqScope === 'home' }" @click="faqScope = 'home'">首页 FAQ（{{ faqs.home.length }}）</button>
        <button v-if="canManageAdminContent" class="seg-tab" :class="{ active: faqScope === 'admin' }" @click="faqScope = 'admin'">管理端 FAQ（{{ faqs.admin.length }}）</button>
      </div>
      <p v-if="!canManageAdminContent" class="perm-hint">管理端 FAQ 仅超级管理员可编辑，你当前维护的是用户端内容</p>

      <div class="search-box">
        <AppIcon name="search" :size="15" />
        <input v-model="faqQuery" class="search-input" type="text" :placeholder="`搜索${scopeLabel} FAQ 关键词`" />
        <button v-if="faqQuery" class="search-clear" aria-label="清空 FAQ 搜索" @click="faqQuery = ''">
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <div class="faq-list">
        <div v-for="f in faqPaged" :key="f.id" class="faq-row">
          <div class="flex-1 faq-texts">
            <div class="faq-q">{{ f.q }}</div>
            <p class="faq-a">{{ f.a }}</p>
          </div>
          <div class="faq-ops">
            <button class="link-btn" @click="openFaqEdit(f)">编辑</button>
            <button class="link-btn link-danger" @click="faqDeleteTarget = f">删除</button>
          </div>
        </div>
        <p v-if="!filteredFaqList.length" class="faq-empty">
          {{ faqQuery.trim() ? `未找到与「${faqQuery.trim()}」相关的${scopeLabel} FAQ` : `暂无${scopeLabel} FAQ，点击右上角「新增 FAQ」添加` }}
        </p>
      </div>

      <!-- 分页条：每页 3 / 5 / 10 条 -->
      <div v-if="filteredFaqList.length" class="pager">
        <span class="pager-info">共 {{ filteredFaqList.length }} 条</span>
        <div class="pager-size">
          <span class="pager-label">每页</span>
          <div class="seg-tabs">
            <button
              v-for="s in [3, 5, 10]" :key="s"
              class="seg-tab" :class="{ active: faqPageSize === s }"
              @click="setFaqPageSize(s)"
            >{{ s }}</button>
          </div>
        </div>
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
    </section>

    <!-- 新增 / 编辑 FAQ 弹窗 -->
    <div v-if="showFaqForm" class="modal-mask" @click.self="showFaqForm = false">
      <div class="modal faq-modal">
        <div class="modal-title">{{ faqEditing ? '编辑 FAQ' : '新增 FAQ' }}（{{ scopeLabel }}）</div>
        <p class="modal-sub">修改保存后会展示在{{ faqWhereLabel }}的常见问题列表中。</p>
        <div class="field">
          <label class="field-label">问题标题</label>
          <input v-model="faqForm.q" class="input" placeholder="一句话概括常见问题" maxlength="60" @input="faqFormError = ''" />
        </div>
        <div class="field">
          <label class="field-label">解决描述</label>
          <textarea v-model="faqForm.a" class="textarea" rows="5" placeholder="该问题的解决方法或说明" @input="faqFormError = ''"></textarea>
          <p v-if="faqFormError" class="field-hint hint-err">{{ faqFormError }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showFaqForm = false">取消</button>
          <button class="btn btn-primary" @click="confirmFaqSave">{{ faqEditing ? '保存修改' : '确认新增' }}</button>
        </div>
      </div>
    </div>

    <!-- 删除 FAQ 确认弹窗 -->
    <div v-if="faqDeleteTarget" class="modal-mask" @click.self="faqDeleteTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">删除 FAQ</div>
        <p class="modal-sub">确定删除「{{ faqDeleteTarget.q }}」吗？删除后{{ faqWhereLabel }}中将不再展示该问题。</p>
        <p v-if="faqDeleteError" class="field-hint hint-err">{{ faqDeleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="faqDeleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmFaqDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 使用技巧管理 -->
    <section class="card faq-manage">
      <div class="faq-head">
        <div>
          <div class="h4"><AppIcon name="spark" :size="16" /> 使用技巧管理</div>
          <p class="faq-sub">维护用户端与管理端「使用说明」中的使用技巧，每条为一句要点</p>
        </div>
        <button class="btn btn-primary" @click="openTipCreate"><AppIcon name="plus" :size="15" /> 新增技巧</button>
      </div>

      <div class="seg-tabs faq-tabs">
        <button class="seg-tab" :class="{ active: tipScope === 'user' }" @click="tipScope = 'user'">用户端技巧（{{ tips.user.length }}）</button>
        <button v-if="canManageAdminContent" class="seg-tab" :class="{ active: tipScope === 'admin' }" @click="tipScope = 'admin'">管理端技巧（{{ tips.admin.length }}）</button>
      </div>
      <p v-if="!canManageAdminContent" class="perm-hint">管理端使用技巧仅超级管理员可编辑，你当前维护的是用户端内容</p>

      <div class="search-box">
        <AppIcon name="search" :size="15" />
        <input v-model="tipQuery" class="search-input" type="text" :placeholder="`搜索${tipScopeLabel}使用技巧关键词`" />
        <button v-if="tipQuery" class="search-clear" aria-label="清空技巧搜索" @click="tipQuery = ''">
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <div class="faq-list">
        <div v-for="(t, i) in tipPaged" :key="t.id" class="faq-row">
          <div class="flex-1 faq-texts">
            <div class="faq-q">{{ (tipSafePage - 1) * tipPageSize + i + 1 }}. {{ t.text }}</div>
          </div>
          <div class="faq-ops">
            <button class="link-btn" @click="openTipEdit(t)">编辑</button>
            <button class="link-btn link-danger" @click="tipDeleteTarget = t">删除</button>
          </div>
        </div>
        <p v-if="!filteredTipList.length" class="faq-empty">
          {{ tipQuery.trim() ? `未找到与「${tipQuery.trim()}」相关的${tipScopeLabel}使用技巧` : `暂无${tipScopeLabel}使用技巧，点击右上角「新增技巧」添加` }}
        </p>
      </div>

      <!-- 分页条：每页 3 / 5 / 10 条 -->
      <div v-if="filteredTipList.length" class="pager">
        <span class="pager-info">共 {{ filteredTipList.length }} 条</span>
        <div class="pager-size">
          <span class="pager-label">每页</span>
          <div class="seg-tabs">
            <button
              v-for="s in [3, 5, 10]" :key="s"
              class="seg-tab" :class="{ active: tipPageSize === s }"
              @click="setTipPageSize(s)"
            >{{ s }}</button>
          </div>
        </div>
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
    </section>

    <!-- 新增 / 编辑使用技巧弹窗 -->
    <div v-if="showTipForm" class="modal-mask" @click.self="showTipForm = false">
      <div class="modal faq-modal">
        <div class="modal-title">{{ tipEditing ? '编辑技巧' : '新增技巧' }}（{{ tipScopeLabel }}）</div>
        <p class="modal-sub">修改保存后会展示在{{ tipScopeLabel }}「使用说明」的使用技巧列表中。</p>
        <div class="field">
          <label class="field-label">技巧内容</label>
          <textarea v-model="tipForm.text" class="textarea" rows="4" placeholder="一句可操作的要点，如：更换手机号需先输入短信验证码" maxlength="200" @input="tipFormError = ''"></textarea>
          <p v-if="tipFormError" class="field-hint hint-err">{{ tipFormError }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showTipForm = false">取消</button>
          <button class="btn btn-primary" @click="confirmTipSave">{{ tipEditing ? '保存修改' : '确认新增' }}</button>
        </div>
      </div>
    </div>

    <!-- 删除使用技巧确认弹窗 -->
    <div v-if="tipDeleteTarget" class="modal-mask" @click.self="tipDeleteTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">删除使用技巧</div>
        <p class="modal-sub">确定删除「{{ tipDeleteTarget.text.slice(0, 30) }}{{ tipDeleteTarget.text.length > 30 ? '…' : '' }}」吗？删除后{{ tipScopeLabel }}使用说明中将不再展示该技巧。</p>
        <p v-if="tipDeleteError" class="field-hint hint-err">{{ tipDeleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="tipDeleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmTipDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 40px 36px 48px; max-width: 1080px; width: 100%; margin: 0 auto; position: relative; }
/* 背景几何装饰 */
.deco { position: absolute; pointer-events: none; opacity: 0.8; z-index: 0; }
.p1 { top: -60px; right: -70px; width: 230px; height: 230px; background: var(--tint-lavender); border-radius: 0 0 0 100%; }
.p2 { top: 180px; right: 8%; width: 120px; height: 120px; background: var(--tint-yellow); border-radius: 100% 0 0 0; }
.p3 { bottom: -70px; left: -60px; width: 200px; height: 200px; background: var(--tint-mint); border-radius: 0 100% 0 0; }

.hero, .stat-grid, .quick-row, .faq-manage { position: relative; z-index: 1; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--tint-lavender); color: var(--brand-purple-800);
  font-size: 12.5px; font-weight: 700; padding: 6px 13px; border-radius: var(--radius-full);
  margin-bottom: 18px;
}
.hero h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 8px; }
.date { font-size: 14px; color: var(--slate); margin-bottom: 26px; }
.hero-actions { display: flex; gap: 12px; }
.enter-btn { display: inline-flex; align-items: center; gap: 8px; }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 34px; }
.stat-card { display: flex; align-items: center; gap: 14px; padding: 18px; }
.stat-ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.st-lavender { background: var(--tint-lavender); color: var(--primary); }
.st-sky { background: var(--tint-sky); color: var(--link-blue); }
.st-mint { background: var(--tint-mint); color: var(--brand-green); }
.st-peach { background: var(--tint-peach); color: var(--brand-orange); }
.stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.2; }
.stat-unit { font-size: 12px; font-weight: 500; color: var(--stone); margin-left: 3px; }
.stat-label { font-size: 12.5px; color: var(--slate); }

.quick-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.quick-card { display: flex; align-items: center; gap: 12px; padding: 16px 18px; text-align: left; cursor: pointer; }
.quick-ico { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-yellow { background: var(--tint-yellow); color: var(--brand-yellow-ink, #8a6d00); }
.q-blue { background: var(--tint-sky); color: var(--link-blue); }
.q-purple { background: var(--tint-lavender); color: var(--primary); }
.q-mint { background: var(--tint-mint); color: var(--brand-green); }
.quick-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.quick-desc { font-size: 12px; color: var(--stone); }
.quick-arrow { color: var(--stone); flex-shrink: 0; }

/* FAQ 常见问题管理 */
.faq-manage { margin-top: 14px; padding: 20px 22px; }
.faq-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.faq-sub { font-size: 12.5px; color: var(--stone); margin-top: 3px; }
.faq-tabs { margin-top: 14px; }
.perm-hint { font-size: 12px; color: var(--stone); margin-top: 8px; }

/* 搜索框（FAQ / 使用技巧管理共用） */
.search-box {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--hairline-strong); border-radius: var(--radius-md);
  background: var(--canvas); padding: 0 12px; height: 36px;
  color: var(--stone); margin-top: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--tint-lavender); }
.search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: inherit; font-size: 13px; color: var(--ink);
}
.search-input::placeholder { color: var(--stone); }
.search-clear {
  border: none; background: transparent; color: var(--stone); cursor: pointer;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); flex-shrink: 0;
}
.search-clear:hover { color: var(--ink); background: var(--surface-soft); }
.faq-list { display: flex; flex-direction: column; }
.faq-row { display: flex; align-items: flex-start; gap: 12px; padding: 13px 2px; border-top: 1px solid var(--hairline-soft); }
.faq-row:first-child { border-top: none; }
.faq-texts { min-width: 0; }
.faq-q { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.faq-a {
  font-size: 12.5px; color: var(--slate); line-height: 1.7; margin-top: 3px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.faq-ops { display: flex; gap: 4px; flex-shrink: 0; }
.link-btn { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--link-blue); cursor: pointer; padding: 3px 6px; border-radius: var(--radius-sm); }
.link-btn:hover { background: var(--tint-sky); }
.link-danger { color: #d92d20; }
.link-danger:hover { background: var(--tint-rose); }
.faq-empty { text-align: center; color: var(--stone); font-size: 13px; padding: 22px 0; }

/* 分页条 */
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
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

.faq-modal { max-width: 480px; width: 100%; }
.modal-sm { max-width: 420px; }
.modal-sub { color: var(--slate); line-height: 1.7; }
.hint-err { color: #d92d20; }

@media (max-width: 900px) {
  .page { padding: 28px 20px 40px; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-row { grid-template-columns: 1fr; }
  .hero h1 { font-size: 26px; }
}
</style>
