<script setup lang="ts">
/**
 * 管理控制台布局：浅色侧边栏（与用户端同一设计系统）+ 内容区
 * 「账号管理」统一管理用户与管理员账号（管理员分类仅超管可见）；管理员与用户一样可进入个人设置
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AnnouncementModal from '@/components/AnnouncementModal.vue'
import { session, isSuper, logoutAdmin, ensureAccountsLoaded, ensureMe, USER_ORIGIN } from '@/store/auth'
import LogoMark from '@/components/LogoMark.vue'
import { ensureNotesLoaded, ensureQaLoaded, ensureQuizLoaded, ensureFeedbacksLoaded } from '@/store/admin'
import { ensureFaqsLoaded } from '@/store/faq'
import { ensureTipsLoaded } from '@/store/tips'
import { ensureAnnouncementsLoaded, refreshUnread, unreadCount } from '@/store/announcement'

const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

const navs = [
  { path: '/admin/welcome', icon: 'star', label: '工作台' },
  { path: '/admin/dashboard', icon: 'chart', label: '数据看板' },
  { path: '/admin/accounts', icon: 'users', label: '账号管理' },
  { path: '/admin/notes', icon: 'book', label: '课堂纪要' },
  { path: '/admin/qa', icon: 'chat', label: '问答记录' },
  { path: '/admin/quiz', icon: 'edit', label: '题库管理' },
  { path: '/admin/feedbacks', icon: 'flag', label: '问题反馈' },
  { path: '/admin/samples', icon: 'database', label: '训练样本' },
  { path: '/admin/audit', icon: 'shield', label: '内容审核' },
  { path: '/admin/announcements', icon: 'horn', label: '公告管理' },
  { path: '/admin/guide', icon: 'info', label: '使用说明' },
  { path: '/admin/settings', icon: 'sliders', label: '个人设置' },
]
const visibleNavs = computed(() => navs)

const roleLabel = computed(() => (isSuper.value ? '超级管理员' : '管理员'))
const initial = computed(() => (session.value?.name || '管')[0])

const showLogoutConfirm = ref(false)

/** 角标文案：99+ 封顶 */
function badgeText(n: number) {
  return n > 99 ? '99+' : String(n)
}

// 进入控制台即拉取巡检数据（幂等去重；失败静默，页面内操作再提示）
onMounted(() => {
  void ensureMe()
  void ensureAccountsLoaded().catch(() => {})
  void ensureNotesLoaded().catch(() => {})
  void ensureQaLoaded().catch(() => {})
  void ensureQuizLoaded().catch(() => {})
  void ensureFeedbacksLoaded().catch(() => {})
  void ensureFaqsLoaded().catch(() => {})
  void ensureTipsLoaded().catch(() => {})
  void ensureAnnouncementsLoaded().catch(() => {})
  void refreshUnread()
})

function handleLogout() {
  showLogoutConfirm.value = false
  logoutAdmin()
  // 退出登录统一回到首页；?logout=1 让用户端先清空本端残留会话，避免被守卫重定向进应用
  window.location.href = `${USER_ORIGIN}/login?logout=1`
}
</script>

<template>
  <div class="shell">
    <!-- 移动端顶栏 -->
    <header class="mobile-topbar">
      <button class="m-btn" @click="sidebarOpen = !sidebarOpen"><AppIcon name="menu" /></button>
      <span class="h4">智学纪要 · 管理控制台</span>
    </header>

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="brand" @click="router.push('/admin/welcome')">
        <div class="brand-logo">
          <LogoMark :size="26" />
        </div>
        <div>
          <div class="brand-name">智学纪要</div>
          <div class="brand-sub">管理控制台</div>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="n in visibleNavs"
          :key="n.path"
          :to="n.path"
          class="nav-item"
          :class="{ active: route.path === n.path }"
          @click="sidebarOpen = false"
        >
          <AppIcon :name="n.icon" :size="17" />
          <span>{{ n.label }}</span>
          <!-- 新公告角标：公告管理导航上的未读数 -->
          <span v-if="n.path === '/admin/announcements' && unreadCount > 0" class="nav-badge">{{ badgeText(unreadCount) }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-card">
          <img v-if="session?.avatar" :src="session.avatar" class="avatar avatar-photo" :alt="session.name + ' 的头像'" />
          <div v-else class="avatar" :class="isSuper ? 'avatar-super' : 'avatar-admin'">{{ initial }}</div>
          <div class="flex-1 ellipsis">
            <div class="admin-name-row">
              <span class="admin-name ellipsis">{{ session?.name || '管理员' }}</span>
              <span class="tag" :class="isSuper ? 'tag-purple' : 'tag-blue'">{{ roleLabel }}</span>
            </div>
            <div class="admin-mail ellipsis">{{ session?.email || '—' }}</div>
          </div>
          <button class="m-btn" title="退出登录" aria-label="退出登录" @click="showLogoutConfirm = true"><AppIcon name="logout" :size="15" /></button>
        </div>
      </div>
    </aside>

    <!-- 遮罩（移动端） -->
    <div v-if="sidebarOpen" class="mask" @click="sidebarOpen = false"></div>

    <!-- 内容区 -->
    <main class="content">
      <router-view />
    </main>

    <!-- 退出登录确认弹窗 -->
    <div v-if="showLogoutConfirm" class="modal-mask" @click.self="showLogoutConfirm = false">
      <div class="modal modal-sm">
        <div class="modal-title">退出登录</div>
        <p class="modal-sub">确定要退出管理控制台吗？退出后需重新登录。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showLogoutConfirm = false">取消</button>
          <button class="btn btn-danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>

    <!-- 登录后新公告弹窗：只提醒一次，点「我知道了」后不再弹（发新公告除外） -->
    <AnnouncementModal />
  </div>
</template>

<style scoped>
.shell { display: flex; height: 100%; background: var(--surface-soft); }

.mobile-topbar {
  display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  height: 52px; align-items: center; gap: 12px; padding: 0 16px;
  background: var(--canvas); border-bottom: 1px solid var(--hairline);
}
.m-btn { border: none; background: transparent; color: var(--stone); padding: 6px; display: flex; border-radius: var(--radius-sm); }
.m-btn:hover { color: var(--ink); }

.sidebar {
  width: 232px; flex-shrink: 0; display: flex; flex-direction: column;
  background: var(--canvas); border-right: 1px solid var(--hairline);
}
.brand {
  display: flex; align-items: center; gap: 10px; padding: 20px 16px;
  border-bottom: 1px solid var(--hairline-soft); cursor: pointer;
}
.brand-logo { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brand-name { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; }
.brand-sub { font-size: 11px; color: var(--stone); }

.nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: var(--radius-md);
  color: var(--slate); font-size: 14px; font-weight: 500; transition: all 0.15s ease;
}
.nav-item:hover { background: var(--surface); color: var(--ink); }
.nav-item.active { background: var(--tint-lavender); color: var(--brand-purple-800); }
/* 新公告未读角标 */
.nav-badge {
  margin-left: auto; min-width: 17px; height: 17px; padding: 0 5px;
  border-radius: 999px; background: var(--error); color: #fff;
  font-size: 10.5px; font-weight: 700; line-height: 17px; text-align: center;
}

.sidebar-footer { padding: 12px; border-top: 1px solid var(--hairline-soft); }
.admin-card { display: flex; align-items: center; gap: 10px; }
.avatar-super { background: var(--brand-purple); color: #fff; }
.avatar-admin { background: var(--brand-teal); color: #fff; }
.avatar-photo { object-fit: cover; }
.admin-name-row { display: flex; align-items: center; gap: 6px; }
.admin-name { font-size: 13px; font-weight: 600; }
.admin-mail { font-size: 11px; color: var(--stone); }
.admin-card .m-btn:hover { color: var(--error); }

.mask { display: none; }
.content { flex: 1; min-width: 0; overflow-y: auto; display: flex; flex-direction: column; }

@media (max-width: 900px) {
  .mobile-topbar { display: flex; }
  .sidebar {
    position: fixed; z-index: 50; top: 0; bottom: 0; left: -260px;
    transition: left 0.2s ease; box-shadow: var(--shadow-modal);
  }
  .sidebar.open { left: 0; }
  .mask { display: block; position: fixed; inset: 0; background: rgba(15, 15, 15, 0.4); z-index: 45; }
  .content { padding-top: 52px; }
}
</style>
