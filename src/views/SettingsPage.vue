<script setup lang="ts">
/**
 * 个人设置（管理员）：资料 / 手机号 / 邮箱 / 头像 / 密码
 * 与用户端个人设置同构；修改即时同步侧边栏用户卡片与会话
 * 处理参数等配置统一采用系统最佳配置，不提供调整入口
 */
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  accounts, session, isSuper, me as meUser, accountFromApi,
  updateProfile, applyUserToSession, maskPhone, maskEmail,
} from '@/store/auth'
import { authApi } from '@/api'
import { UPLOAD_ACCEPT, isSupportedImage } from '@/utils/uploadFormats'

// 优先用 ensureMe 拉取的后端资料（非超管账号列表可能不含自己），回落到账号列表匹配
const me = computed(() =>
  meUser.value ? accountFromApi(meUser.value) : accounts.find((a) => a.id === session.value?.id),
)

// ---------- 敏感信息眼睛开关：手机号 / 密码默认用「·」掩码显示，点击眼睛可查看真实内容 ----------
const showPhone = ref(false) // 当前手机号（锁定行）
const showNewPhone = ref(false) // 新手机号输入框
const showPwdOld = ref(false)
const showPwdNew = ref(false)
const showPwdConfirm = ref(false)

// ---------- 个人资料 ----------
const nameInput = ref(session.value?.name ?? '')
const savedProfile = ref(false)
const showSaveConfirm = ref(false)
function saveProfile() {
  showSaveConfirm.value = true
}
const saveError = ref('')
async function confirmSave() {
  saveError.value = ''
  const res = await updateProfile({ name: nameInput.value.trim() || session.value?.name })
  if (!res.ok) {
    saveError.value = res.msg || '保存失败，请稍后再试'
    return
  }
  showSaveConfirm.value = false
  savedProfile.value = true
  setTimeout(() => (savedProfile.value = false), 1800)
}

// 头像上传：调后端接口，返回的媒体地址同步到会话（侧边栏即时更新）
const avatarInput = ref<HTMLInputElement>()
const avatarTip = ref('')
let avatarTipTimer: number | null = null
function pickAvatar() {
  avatarInput.value?.click()
}
async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  if (!isSupportedImage(f.name)) {
    showAvatarTip('仅支持图片格式（jpg / jpeg / png / webp / gif）')
    return
  }
  if (f.size > 5 * 1024 * 1024) {
    showAvatarTip('图片大小不能超过 5MB')
    return
  }
  try {
    const u = await authApi.updateAvatar(f)
    applyUserToSession(u)
    showAvatarTip('头像已更新')
  } catch (err) {
    showAvatarTip(err instanceof Error ? err.message : '头像上传失败，请稍后再试')
  }
}
function showAvatarTip(t: string) {
  avatarTip.value = t
  if (avatarTipTimer) window.clearTimeout(avatarTipTimer)
  avatarTipTimer = window.setTimeout(() => (avatarTip.value = ''), 2600)
}

// ---------- 手机号 / 邮箱更换（验证码 60s 一次，演示验证码 123456） ----------
const PHONE_RE = /^1[3-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEMO_CODE = '123456'
// 手机号 / 邮箱是否被其他账号绑定：提交时由后端校验并返回错误

const phone = reactive({ changing: false, value: '', code: '', error: '', sent: '', done: false })
const email = reactive({ changing: false, value: '', code: '', error: '', sent: '', done: false })
const cooldowns = reactive({ phone: 0, email: 0 })
const timers: Record<'phone' | 'email', number> = { phone: 0, email: 0 }

// 输入时实时校验提示（不等提交才报错）
const phoneMsg = computed(() => {
  const v = phone.value.trim()
  if (!v) return { text: '请输入 11 位手机号', ok: false }
  if (!PHONE_RE.test(v)) return { text: '手机号格式不正确', ok: false }
  if (v === me.value?.phone) return { text: '新手机号与当前手机号相同', ok: false }
  if (accounts.some((a) => a.id !== me.value?.id && a.phone === v)) return { text: '该手机号已绑定其他账号', ok: false }
  return { text: '请填写能正常接收短信的手机号', ok: true }
})
const emailMsg = computed(() => {
  const v = email.value.trim()
  if (!v) return { text: '请输入邮箱地址', ok: false }
  if (!EMAIL_RE.test(v)) return { text: '邮箱格式不正确', ok: false }
  if (v === me.value?.email) return { text: '新邮箱与当前邮箱相同', ok: false }
  if (accounts.some((a) => a.id !== me.value?.id && a.email === v)) return { text: '该邮箱已绑定其他账号', ok: false }
  return { text: '请填写可正常收信的邮箱地址', ok: true }
})

function startCooldown(which: 'phone' | 'email') {
  cooldowns[which] = 60
  timers[which] = window.setInterval(() => {
    cooldowns[which] = Math.max(0, cooldowns[which] - 1)
    if (cooldowns[which] === 0) window.clearInterval(timers[which])
  }, 1000)
}
function stopCooldown(which: 'phone' | 'email') {
  cooldowns[which] = 0
  window.clearInterval(timers[which])
}

function startPhone() {
  Object.assign(phone, { changing: true, value: '', code: '', error: '', sent: '' })
  showNewPhone.value = false
}
function sendPhoneCode() {
  phone.error = ''
  if (!phoneMsg.value.ok) { phone.error = phoneMsg.value.text; return }
  startCooldown('phone')
  phone.sent = `验证码已发送至 ${maskPhone(phone.value.trim())}（验证码：${DEMO_CODE}）`
}
async function confirmPhone() {
  phone.error = ''
  if (!/^\d{6}$/.test(phone.code)) { phone.error = '请输入 6 位数字验证码'; return }
  if (phone.code !== DEMO_CODE) { phone.error = '验证码不正确，请重新输入'; return }
  const res = await updateProfile({ phone: phone.value.trim() })
  if (!res.ok) { phone.error = res.msg || '更换失败，请稍后再试'; return }
  cancelPhone()
  phone.done = true
  setTimeout(() => (phone.done = false), 2600)
}
function cancelPhone() {
  Object.assign(phone, { changing: false, value: '', code: '', error: '', sent: '' })
  showNewPhone.value = false
  stopCooldown('phone')
}

function startEmail() {
  Object.assign(email, { changing: true, value: '', code: '', error: '', sent: '' })
}
function sendEmailCode() {
  email.error = ''
  if (!emailMsg.value.ok) { email.error = emailMsg.value.text; return }
  startCooldown('email')
  email.sent = `验证码已发送至原邮箱 ${maskEmail(session.value?.email || '')}（验证码：${DEMO_CODE}）`
}
async function confirmEmail() {
  email.error = ''
  if (!/^\d{6}$/.test(email.code)) { email.error = '请输入 6 位数字验证码'; return }
  if (email.code !== DEMO_CODE) { email.error = '验证码不正确，请重新输入'; return }
  const res = await updateProfile({ email: email.value.trim() })
  if (!res.ok) { email.error = res.msg || '更换失败，请稍后再试'; return }
  cancelEmail()
  email.done = true
  setTimeout(() => (email.done = false), 2600)
}
function cancelEmail() {
  Object.assign(email, { changing: false, value: '', code: '', error: '', sent: '' })
  stopCooldown('email')
}

onBeforeUnmount(() => {
  stopCooldown('phone')
  stopCooldown('email')
  if (avatarTipTimer) window.clearTimeout(avatarTipTimer)
})

// 修改密码：调后端 /auth/password/（校验当前密码正确性与新密码强度）
const pwdForm = reactive({ old: '', next: '', confirm: '', error: '' })
const savedPwd = ref(false)
const pwdBusy = ref(false)
async function updatePassword() {
  pwdForm.error = ''
  if (!pwdForm.old) { pwdForm.error = '请输入当前密码'; return }
  if (pwdForm.next.length < 8) { pwdForm.error = '新密码至少需要 8 位'; return }
  if (pwdForm.next === pwdForm.old) { pwdForm.error = '新密码不能与当前密码相同'; return }
  if (!pwdForm.confirm) { pwdForm.error = '请再次输入新密码'; return }
  if (pwdForm.confirm !== pwdForm.next) { pwdForm.error = '两次输入的新密码不一致'; return }
  pwdBusy.value = true
  try {
    await authApi.changePassword(pwdForm.old, pwdForm.next)
    Object.assign(pwdForm, { old: '', next: '', confirm: '' })
    savedPwd.value = true
    setTimeout(() => (savedPwd.value = false), 1800)
  } catch (e) {
    pwdForm.error = e instanceof Error ? e.message : '修改失败，请稍后再试'
  } finally {
    pwdBusy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="mb-md">
      <h1 class="h2">个人设置</h1>
      <p class="text-sm">维护个人资料与账号安全</p>
    </header>

    <!-- 账号与安全：个人资料 + 修改密码 -->
    <div class="group-head">
      <h2 class="group-title">账号与安全</h2>
      <span class="group-sub">资料 · 密码</span>
    </div>
    <div class="grid">
      <div class="col">
        <!-- 个人资料 -->
        <section class="card card-lg">
          <div class="flex items-center gap-md mb-md">
            <button class="avatar-edit" type="button" title="更换头像" aria-label="更换头像" @click="pickAvatar">
              <img v-if="session?.avatar" :src="session.avatar" class="avatar-img" alt="管理员头像" />
              <span v-else class="avatar avatar-lg" :class="isSuper ? 'avatar-super' : 'avatar-admin'">{{ nameInput[0] || '管' }}</span>
              <span class="avatar-mask"><AppIcon name="image" :size="12" /> 更换</span>
            </button>
            <input ref="avatarInput" type="file" hidden :accept="UPLOAD_ACCEPT.image" @change="onAvatarChange" />
            <div>
              <div class="h3">{{ nameInput || session?.name }} <span class="tag" :class="isSuper ? 'tag-purple' : 'tag-blue'">{{ isSuper ? '超级管理员' : '管理员' }}</span></div>
              <div class="text-sm">{{ session?.email }}</div>
            </div>
          </div>
          <p v-if="avatarTip" class="avatar-tip">{{ avatarTip }}</p>

          <div class="field">
            <label class="field-label">用户名</label>
            <input v-model="nameInput" class="input" placeholder="请输入用户名" />
            <p v-if="saveError" class="field-hint hint-err">{{ saveError }}</p>
          </div>

          <div class="field">
            <label class="field-label">电话号码</label>
            <div v-if="!phone.changing" class="locked-row">
              <div class="secret-wrap flex-1">
                <input
                  class="input input-locked"
                  :value="showPhone ? (me?.phone ?? '') : (me?.phone ?? '').replace(/./g, '·')"
                  readonly
                  aria-label="当前手机号（默认掩码显示，可点击眼睛查看）"
                />
                <button
                  class="eye-btn"
                  type="button"
                  :aria-label="showPhone ? '隐藏手机号' : '查看手机号'"
                  @click="showPhone = !showPhone"
                >
                  <AppIcon :name="showPhone ? 'eye-off' : 'eye'" :size="15" />
                </button>
              </div>
              <button class="btn btn-secondary change-btn" @click="startPhone">更换</button>
            </div>
            <div v-else class="change-panel">
              <div class="secret-wrap">
                <input
                  v-model="phone.value"
                  class="input"
                  :class="{ 'text-masked': !showNewPhone }"
                  type="text"
                  placeholder="请输入新手机号"
                  maxlength="11"
                  inputmode="numeric"
                  autocomplete="off"
                  @input="phone.error = ''"
                />
                <button
                  class="eye-btn"
                  type="button"
                  :aria-label="showNewPhone ? '隐藏新手机号' : '查看新手机号'"
                  @click="showNewPhone = !showNewPhone"
                >
                  <AppIcon :name="showNewPhone ? 'eye-off' : 'eye'" :size="15" />
                </button>
              </div>
              <p class="field-hint" :class="phone.error || !phoneMsg.ok ? 'hint-err' : 'hint-ok'">
                {{ phone.error || phoneMsg.text }}
              </p>
              <div class="code-row">
                <input v-model="phone.code" class="input" placeholder="6 位验证码" maxlength="6" inputmode="numeric" />
                <button class="btn btn-secondary code-btn" :disabled="cooldowns.phone > 0 || !phoneMsg.ok" @click="sendPhoneCode">
                  {{ cooldowns.phone > 0 ? cooldowns.phone + 's 后重发' : '获取验证码' }}
                </button>
              </div>
              <p v-if="phone.sent" class="field-hint hint-ok">{{ phone.sent }}</p>
              <div class="change-actions">
                <button class="btn btn-primary" @click="confirmPhone">确认更换</button>
                <button class="btn btn-secondary" @click="cancelPhone">取消</button>
              </div>
            </div>
            <p v-if="phone.done && !phone.changing" class="field-hint hint-ok">手机号已更换</p>
          </div>

          <div class="field">
            <label class="field-label">邮箱</label>
            <div v-if="!email.changing" class="locked-row">
              <input class="input input-locked" :value="session?.email" readonly aria-label="当前邮箱" />
              <button class="btn btn-secondary change-btn" @click="startEmail">更换</button>
            </div>
            <div v-else class="change-panel">
              <input
                v-model="email.value"
                class="input"
                type="email"
                placeholder="请输入新邮箱地址"
                @input="email.error = ''"
              />
              <p class="field-hint" :class="email.error || !emailMsg.ok ? 'hint-err' : 'hint-ok'">
                {{ email.error || emailMsg.text }}
              </p>
              <div class="code-row">
                <input v-model="email.code" class="input" placeholder="6 位验证码" maxlength="6" inputmode="numeric" />
                <button class="btn btn-secondary code-btn" :disabled="cooldowns.email > 0 || !emailMsg.ok" @click="sendEmailCode">
                  {{ cooldowns.email > 0 ? cooldowns.email + 's 后重发' : '获取验证码' }}
                </button>
              </div>
              <p v-if="email.sent" class="field-hint hint-ok">{{ email.sent }}</p>
              <div class="change-actions">
                <button class="btn btn-primary" @click="confirmEmail">确认更换</button>
                <button class="btn btn-secondary" @click="cancelEmail">取消</button>
              </div>
            </div>
            <p v-if="email.done && !email.changing" class="field-hint hint-ok">邮箱已更换</p>
          </div>

          <button class="btn btn-primary" @click="saveProfile">
            <AppIcon v-if="savedProfile" name="check" :size="15" /> {{ savedProfile ? '已保存' : '保存资料' }}
          </button>
        </section>

      </div>
      <div class="col">
          <!-- 修改密码：与个人资料同组，账号安全相关设置集中在一起 -->
          <section class="card card-lg">
            <div class="h4 mb-sm"><AppIcon name="lock" :size="15" /> 修改密码</div>
            <div class="field">
              <label class="field-label">当前密码</label>
              <div class="secret-wrap">
                <input
                  v-model="pwdForm.old"
                  class="input"
                  :type="showPwdOld ? 'text' : 'password'"
                  placeholder="请输入当前密码"
                  autocomplete="current-password"
                />
                <button
                  class="eye-btn"
                  type="button"
                  :aria-label="showPwdOld ? '隐藏当前密码' : '查看当前密码'"
                  @click="showPwdOld = !showPwdOld"
                >
                  <AppIcon :name="showPwdOld ? 'eye-off' : 'eye'" :size="15" />
                </button>
              </div>
            </div>
            <div class="field">
              <label class="field-label">新密码</label>
              <div class="secret-wrap">
                <input
                  v-model="pwdForm.next"
                  class="input"
                  :type="showPwdNew ? 'text' : 'password'"
                  placeholder="请输入新密码"
                  autocomplete="new-password"
                />
                <button
                  class="eye-btn"
                  type="button"
                  :aria-label="showPwdNew ? '隐藏新密码' : '查看新密码'"
                  @click="showPwdNew = !showPwdNew"
                >
                  <AppIcon :name="showPwdNew ? 'eye-off' : 'eye'" :size="15" />
                </button>
              </div>
              <p class="field-hint">至少 8 位，建议包含字母、数字与符号</p>
            </div>
            <div class="field">
              <label class="field-label">确认新密码</label>
              <div class="secret-wrap">
                <input
                  v-model="pwdForm.confirm"
                  class="input"
                  :type="showPwdConfirm ? 'text' : 'password'"
                  placeholder="请再次输入新密码"
                  autocomplete="new-password"
                  @input="pwdForm.error = ''"
                />
                <button
                  class="eye-btn"
                  type="button"
                  :aria-label="showPwdConfirm ? '隐藏确认密码' : '查看确认密码'"
                  @click="showPwdConfirm = !showPwdConfirm"
                >
                  <AppIcon :name="showPwdConfirm ? 'eye-off' : 'eye'" :size="15" />
                </button>
              </div>
            </div>
            <p v-if="pwdForm.error" class="field-hint hint-err">{{ pwdForm.error }}</p>
            <button class="btn btn-primary" :disabled="pwdBusy" @click="updatePassword">
              <AppIcon v-if="savedPwd" name="check" :size="15" /> {{ savedPwd ? '已更新' : '更新密码' }}
            </button>
          </section>
        </div>
      </div>

    <!-- 保存资料确认弹窗 -->
    <div v-if="showSaveConfirm" class="modal-mask" @click.self="showSaveConfirm = false">
      <div class="modal modal-sm">
        <div class="modal-title">保存个人资料</div>
        <p class="modal-sub">确认保存修改后的用户名吗？头像以及手机号、邮箱的更改已在验证通过后立即生效。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showSaveConfirm = false">取消</button>
          <button class="btn btn-primary" @click="confirmSave">确认保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1080px; width: 100%; margin: 0 auto; }
/* 分组标题：组名 + 说明 + 贯穿分隔线 */
.group-head { display: flex; align-items: center; gap: 10px; margin: 30px 0 14px; }
.group-head:first-of-type { margin-top: 4px; }
.group-title { font-size: 15px; font-weight: 600; color: var(--charcoal); letter-spacing: 0.2px; }
.group-sub { font-size: 12.5px; color: var(--stone); }
.group-head::after { content: ''; flex: 1; height: 1px; background: var(--hairline); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 16px; }

/* ---------- 个人资料 ---------- */
.avatar-edit {
  position: relative; width: 64px; height: 64px; border-radius: 50%;
  padding: 0; border: none; background: none; cursor: pointer;
  overflow: hidden; flex-shrink: 0; display: block;
}
.avatar-img { width: 64px; height: 64px; object-fit: cover; border-radius: 50%; display: block; }
.avatar-super { background: var(--brand-purple); color: #fff; }
.avatar-admin { background: var(--brand-teal); color: #fff; }
.avatar-mask {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(15, 15, 15, 0.45); color: #fff;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; font-weight: 600; opacity: 0; transition: opacity 0.15s ease;
}
.avatar-edit:hover .avatar-mask, .avatar-edit:focus-visible .avatar-mask { opacity: 1; }
.avatar-tip { font-size: 12px; color: var(--brand-green); margin: -8px 0 12px; }
.locked-row { display: flex; align-items: center; gap: 8px; }
.input-locked { background: var(--surface-soft); color: var(--steel); cursor: not-allowed; }
/* 敏感信息掩码（手机号 / 密码）：右侧眼睛按钮切换明文 / 掩码 */
.secret-wrap { position: relative; }
.secret-wrap .input { padding-right: 40px; width: 100%; }
.text-masked { -webkit-text-security: disc; }
.eye-btn {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--stone); cursor: pointer;
  border-radius: var(--radius-sm); padding: 0;
}
.eye-btn:hover { color: var(--ink); background: var(--surface-soft); }
.change-btn { flex-shrink: 0; }
.change-panel {
  border: 1px solid var(--hairline); border-radius: var(--radius-md);
  background: var(--surface-soft); padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.code-row { display: flex; align-items: center; gap: 8px; }
.code-row .input { flex: 1; }
.code-btn { flex-shrink: 0; white-space: nowrap; }
.change-actions { display: flex; gap: 8px; margin-top: 2px; }
.field-hint.hint-ok { color: var(--brand-green); }
.field-hint.hint-err { color: #d92d20; }
.modal-sm { max-width: 440px; }
.modal-sub { color: var(--slate); line-height: 1.7; }

@media (max-width: 900px) {
  .page { padding: 20px 16px; }
  .grid { grid-template-columns: 1fr; }
}
</style>
