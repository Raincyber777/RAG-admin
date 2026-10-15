<script setup lang="ts">
/**
 * 账号管理：用户账号与管理员账号统一管理（由原「用户管理」「管理员账号」合并）
 * 分类筛选：全部 / 用户 / 管理员 / 启用 / 已停用；各类内新注册的账号排前
 * 「全部」视图管理员账号排在用户账号前面；「管理员」分类与新建管理员仅超级管理员可用
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  accounts, session, isSuper, maskPhone, maskEmail,
  createAdmin, resetPassword, toggleStatus, type Account,
} from '@/store/auth'

type Cat = 'all' | 'user' | 'admin' | 'active' | 'disabled'
const cat = ref<Cat>('all')
const keyword = ref('')

const adminCount = computed(() => accounts.filter((a) => a.role !== 'user').length)
const userCount = computed(() => accounts.filter((a) => a.role === 'user').length)
// 非超级管理员仅能看到用户账号，启用 / 已停用计数同样只统计用户
const activeCount = computed(() =>
  accounts.filter((a) => (isSuper.value || a.role === 'user') && a.status === 'active').length,
)
const disabledCount = computed(() =>
  accounts.filter((a) => (isSuper.value || a.role === 'user') && a.status === 'disabled').length,
)

const matchKeyword = (a: Account) => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return true
  return a.name.toLowerCase().includes(k) || a.phone.includes(k) || a.email.toLowerCase().includes(k)
}

const filtered = computed(() =>
  accounts.filter((a) => {
    // 权限：非超级管理员仅能查看用户账号
    if (!isSuper.value && a.role !== 'user') return false
    if (cat.value === 'user' && a.role !== 'user') return false
    if (cat.value === 'admin' && a.role === 'user') return false
    if (cat.value === 'active' && a.status !== 'active') return false
    if (cat.value === 'disabled' && a.status !== 'disabled') return false
    return matchKeyword(a)
  }),
)

// 各分类内新注册的排前；「全部」视图（超管）管理员账号整体排在用户账号前面
const sorted = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a, b) => {
    if (cat.value === 'all' && isSuper.value && (a.role === 'user') !== (b.role === 'user')) {
      return a.role === 'user' ? 1 : -1
    }
    return b.createdAt.localeCompare(a.createdAt)
  })
  return arr
})

const isSelf = (a: Account) => session.value?.id === a.id
const roleLabel = (a: Account) => (a.role === 'super' ? '超级管理员' : a.role === 'admin' ? '管理员' : '普通用户')

const avatarTints = ['var(--tint-lavender)', 'var(--tint-sky)', 'var(--tint-mint)', 'var(--tint-peach)', 'var(--tint-yellow)']
function avatarBg(a: Account) {
  const i = Number(a.id.replace(/\D/g, '')) || 0
  return avatarTints[i % avatarTints.length]
}

// ---------- 新建管理员账号（仅超级管理员） ----------
const PHONE_RE = /^1[3-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const showCreate = ref(false)
const form = ref({ name: '', phone: '', email: '', password: '' })
const formError = ref('')
const formMsg = computed(() => {
  if (!form.value.name.trim()) return { text: '请输入用户名（2-20 位字符）', ok: false }
  if (form.value.name.trim().length < 2 || form.value.name.trim().length > 20) return { text: '用户名需为 2-20 位字符', ok: false }
  if (!form.value.phone.trim()) return { text: '请输入 11 位手机号', ok: false }
  if (!PHONE_RE.test(form.value.phone.trim())) return { text: '手机号格式不正确', ok: false }
  if (!form.value.email.trim()) return { text: '请输入邮箱地址', ok: false }
  if (!EMAIL_RE.test(form.value.email.trim())) return { text: '邮箱格式不正确', ok: false }
  if (!form.value.password) return { text: '请设置初始密码（至少 8 位）', ok: false }
  if (form.value.password.length < 8) return { text: '初始密码至少需要 8 位', ok: false }
  return { text: '信息填写完整，创建后账号即可登录管理端与用户端', ok: true }
})

function openCreate() {
  form.value = { name: '', phone: '', email: '', password: '' }
  formError.value = ''
  showCreate.value = true
}
function confirmCreate() {
  formError.value = ''
  const res = createAdmin(form.value)
  if (!res.ok) {
    formError.value = res.msg || '创建失败，请稍后重试'
    return
  }
  showCreate.value = false
  showTip(`已创建管理员账号「${form.value.name.trim()}」`)
}

// ---------- 重置密码 ----------
const resetTarget = ref<Account | null>(null)
const resetNext = ref('')
const resetError = ref('')
function openReset(a: Account) {
  resetTarget.value = a
  resetNext.value = ''
  resetError.value = ''
}
function confirmReset() {
  if (!resetTarget.value) return
  if (resetNext.value.length < 8) {
    resetError.value = '新密码至少需要 8 位'
    return
  }
  const name = resetTarget.value.name
  resetPassword(resetTarget.value, resetNext.value)
  resetTarget.value = null
  showTip(`已重置「${name}」的密码`)
}

// ---------- 停用 / 启用（超级管理员与自己的账号不可停用） ----------
const canToggle = (a: Account) => a.role !== 'super' && !isSelf(a)
const toggleTarget = ref<Account | null>(null)
function confirmToggle() {
  if (toggleTarget.value) toggleStatus(toggleTarget.value)
  toggleTarget.value = null
}

// ---------- 操作成功提示 ----------
const tip = ref('')
let tipTimer: number | undefined
function showTip(text: string) {
  tip.value = text
  if (tipTimer) window.clearTimeout(tipTimer)
  tipTimer = window.setTimeout(() => (tip.value = ''), 2400)
}
</script>

<template>
  <div class="page">
    <header class="mb-md page-head">
      <div>
        <h1 class="h2">账号管理</h1>
        <p class="text-sm">
          {{
            isSuper
              ? `统一管理用户与管理员账号（共 ${accounts.length} 个：用户 ${userCount} 个、管理员 ${adminCount} 个）`
              : `查看与维护用户账号（共 ${userCount} 人）`
          }}
        </p>
      </div>
      <button v-if="isSuper" class="btn btn-primary" @click="openCreate"><AppIcon name="plus" :size="15" /> 新建管理员账号</button>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <AppIcon name="search" :size="15" class="search-ico" />
        <input v-model="keyword" class="input" placeholder="搜索用户名 / 手机号 / 邮箱" />
      </div>
      <div class="seg-tabs">
        <template v-if="isSuper">
          <button class="seg-tab" :class="{ active: cat === 'all' }" @click="cat = 'all'">全部（{{ accounts.length }}）</button>
          <button class="seg-tab" :class="{ active: cat === 'user' }" @click="cat = 'user'">用户（{{ userCount }}）</button>
          <button class="seg-tab" :class="{ active: cat === 'admin' }" @click="cat = 'admin'">管理员（{{ adminCount }}）</button>
        </template>
        <button v-else class="seg-tab" :class="{ active: cat === 'all' }" @click="cat = 'all'">全部（{{ userCount }}）</button>
        <button class="seg-tab" :class="{ active: cat === 'active' }" @click="cat = 'active'">启用（{{ activeCount }}）</button>
        <button class="seg-tab" :class="{ active: cat === 'disabled' }" @click="cat = 'disabled'">已停用（{{ disabledCount }}）</button>
      </div>
    </div>

    <p v-if="tip" class="done-tip"><AppIcon name="check" :size="14" /> {{ tip }}</p>

    <div class="card table-card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>账号</th>
              <th>角色</th>
              <th>手机号</th>
              <th>邮箱</th>
              <th>纪要数</th>
              <th>问答数</th>
              <th>注册时间</th>
              <th>状态</th>
              <th class="th-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in sorted" :key="a.id">
              <td>
                <div class="user-cell">
                  <img v-if="a.avatar" :src="a.avatar" class="avatar avatar-sm avatar-photo" :alt="a.name + ' 的头像'" />
                  <span
                    v-else
                    class="avatar avatar-sm"
                    :class="a.role === 'super' ? 'avatar-super' : a.role === 'admin' ? 'avatar-admin' : ''"
                    :style="a.role === 'user' ? { background: avatarBg(a) } : undefined"
                  >{{ a.name[0] }}</span>
                  <span class="user-name">{{ a.name }}</span>
                  <span v-if="isSelf(a)" class="tag tag-gray">我</span>
                </div>
              </td>
              <td><span class="tag" :class="a.role === 'super' ? 'tag-purple' : a.role === 'admin' ? 'tag-blue' : 'tag-gray'">{{ roleLabel(a) }}</span></td>
              <td class="muted">{{ maskPhone(a.phone) }}</td>
              <td class="muted">{{ maskEmail(a.email) }}</td>
              <td>{{ a.role === 'user' ? (a.notes ?? 0) : '—' }}</td>
              <td>{{ a.role === 'user' ? (a.questions ?? 0) : '—' }}</td>
              <td class="muted">{{ a.createdAt }}</td>
              <td><span class="tag" :class="a.status === 'active' ? 'tag-green' : 'tag-gray'">{{ a.status === 'active' ? '正常' : '已停用' }}</span></td>
              <td class="td-actions">
                <button class="link-btn" @click="openReset(a)">重置密码</button>
                <button
                  v-if="canToggle(a)"
                  class="link-btn"
                  :class="{ 'link-danger': a.status === 'active' }"
                  @click="toggleTarget = a"
                >{{ a.status === 'active' ? '停用' : '启用' }}</button>
              </td>
            </tr>
            <tr v-if="!sorted.length">
              <td colspan="9" class="empty">
                <AppIcon name="search" :size="16" /> 没有符合条件的账号
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="perm-note">
      <AppIcon name="info" :size="13" />
      分权说明：超级管理员可管理用户与管理员账号，新注册的账号在各类中排在前面；管理员仅可管理用户账号；普通用户账号仅能登录用户端。
    </p>

    <!-- 新建管理员弹窗 -->
    <div v-if="showCreate" class="modal-mask" @click.self="showCreate = false">
      <div class="modal create-modal">
        <div class="modal-title">新建管理员账号</div>
        <p class="modal-sub">创建后的账号角色为「管理员」，可登录管理端与用户端；初始密码请线下告知本人。</p>
        <div class="field">
          <label class="field-label">用户名</label>
          <input v-model="form.name" class="input" placeholder="2-20 位字符" maxlength="20" />
        </div>
        <div class="field">
          <label class="field-label">手机号</label>
          <input v-model="form.phone" class="input" type="tel" inputmode="numeric" placeholder="11 位手机号" maxlength="11" />
        </div>
        <div class="field">
          <label class="field-label">邮箱</label>
          <input v-model="form.email" class="input" type="email" placeholder="name@zhiyuan.ai" />
        </div>
        <div class="field">
          <label class="field-label">初始密码</label>
          <input v-model="form.password" class="input" type="text" placeholder="至少 8 位，建议包含字母与数字" />
          <p class="field-hint" :class="formError ? 'hint-err' : formMsg.ok ? 'hint-ok' : ''">
            {{ formError || formMsg.text }}
          </p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" :disabled="!formMsg.ok && !formError" @click="confirmCreate">确认创建</button>
        </div>
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <div v-if="resetTarget" class="modal-mask" @click.self="resetTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">重置密码</div>
        <p class="modal-sub">为「{{ resetTarget.name }}」（{{ roleLabel(resetTarget) }}）设置新的登录密码。</p>
        <div class="field">
          <label class="field-label">新密码</label>
          <input v-model="resetNext" class="input" type="text" placeholder="至少 8 位，建议包含字母与数字" @input="resetError = ''" />
          <p v-if="resetError" class="field-hint hint-err">{{ resetError }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="resetTarget = null">取消</button>
          <button class="btn btn-primary" @click="confirmReset">确认重置</button>
        </div>
      </div>
    </div>

    <!-- 停用 / 启用确认弹窗 -->
    <div v-if="toggleTarget" class="modal-mask" @click.self="toggleTarget = null">
      <div class="modal modal-sm">
        <div class="modal-title">{{ toggleTarget.status === 'active' ? '停用账号' : '恢复账号' }}</div>
        <p class="modal-sub">
          {{ toggleTarget.status === 'active'
            ? `停用后「${toggleTarget.name}」将无法登录${toggleTarget.role === 'user' ? '用户端' : '管理端与用户端'}，账号数据保留。确定停用吗？`
            : `恢复后「${toggleTarget.name}」可重新登录正常使用。确定恢复吗？` }}
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="toggleTarget = null">取消</button>
          <button class="btn" :class="toggleTarget.status === 'active' ? 'btn-danger' : 'btn-primary'" @click="confirmToggle">
            {{ toggleTarget.status === 'active' ? '确认停用' : '确认恢复' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.search-box { position: relative; width: 300px; max-width: 100%; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--stone); pointer-events: none; }
.search-box .input { padding-left: 32px; }

.done-tip {
  display: flex; align-items: center; gap: 6px;
  background: var(--tint-mint); color: var(--brand-green);
  font-size: 13px; font-weight: 500; border-radius: var(--radius-md);
  padding: 9px 13px; margin-bottom: 12px;
}

.table-card { padding: 0; overflow: hidden; }
.table th { text-align: left; font-size: 12px; color: var(--stone); font-weight: 600; padding: 12px 14px; background: var(--surface-soft); white-space: nowrap; }
.table td { padding: 12px 14px; font-size: 13px; border-top: 1px solid var(--hairline-soft); white-space: nowrap; }
.user-cell { display: flex; align-items: center; gap: 9px; }
.user-name { font-weight: 600; }
.avatar-super { background: var(--brand-purple); color: #fff; }
.avatar-admin { background: var(--brand-teal); color: #fff; }
.avatar-photo { object-fit: cover; }
.muted { color: var(--slate); }
.th-actions, .td-actions { text-align: right; }
.td-actions { white-space: nowrap; }
.link-btn { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--link-blue); cursor: pointer; padding: 3px 6px; border-radius: var(--radius-sm); }
.link-btn:hover { background: var(--tint-sky); }
.link-danger { color: #d92d20; }
.link-danger:hover { background: var(--tint-rose); }

.perm-note {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 12.5px; color: var(--stone); line-height: 1.7; margin-top: 12px;
}
.perm-note svg { flex-shrink: 0; margin-top: 3px; }

.create-modal { max-width: 460px; width: 100%; }
.modal-sm { max-width: 420px; }
.modal-sub { color: var(--slate); line-height: 1.7; }
.hint-ok { color: var(--brand-green); }
.hint-err { color: #d92d20; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
}
</style>
