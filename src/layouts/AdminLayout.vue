<script setup lang="ts">
/**
 * 管理控制台布局：深蓝侧边栏（区别于用户端浅色侧边栏）+ 内容区
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

const navs = [
  { path: '/admin/dashboard', icon: 'chart', label: '系统总览' },
  { path: '/admin/users', icon: 'users', label: '用户管理' },
  { path: '/admin/spaces', icon: 'folder', label: '知识空间管理' },
  { path: '/admin/documents', icon: 'layers', label: '文档解析管理' },
  { path: '/admin/logs', icon: 'server', label: '系统日志' },
  { path: '/admin/feedbacks', icon: 'inbox', label: '反馈处理' },
  { path: '/admin/guide', icon: 'star', label: '使用说明' },
]

function logout() {
  localStorage.removeItem('zy_admin_token')
  router.push('/admin/login')
}
</script>

<template>
  <div class="shell">
    <!-- 移动端顶栏 -->
    <header class="mobile-topbar">
      <button class="m-btn" @click="sidebarOpen = !sidebarOpen"><AppIcon name="menu" /></button>
      <span class="h4">智源问答 · 管理控制台</span>
    </header>

    <!-- 深蓝侧边栏 -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="brand">
        <div class="brand-logo"><AppIcon name="shield" :size="18" /></div>
        <div>
          <div class="brand-name">管理控制台</div>
          <div class="brand-sub">智源问答 Admin</div>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="nav-item"
          :class="{ active: route.path === n.path }"
          @click="sidebarOpen = false"
        >
          <AppIcon :name="n.icon" :size="17" />
          <span>{{ n.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/admin" class="sys-status">
          <span class="dot dot-green"></span> 系统运行正常
        </router-link>
        <div class="admin-card">
          <div class="avatar avatar-sm" style="background: #f5d75e; color: #0a1530">管</div>
          <div class="flex-1 ellipsis">
            <div class="admin-name">超级管理员</div>
            <div class="admin-mail ellipsis">admin@zhiyuan.ai</div>
          </div>
          <button class="m-btn" title="退出登录" @click="logout"><AppIcon name="logout" :size="15" /></button>
        </div>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="mask" @click="sidebarOpen = false"></div>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell { display: flex; height: 100%; background: var(--surface-soft); }

.mobile-topbar {
  display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  height: 52px; align-items: center; gap: 12px; padding: 0 16px;
  background: var(--canvas); border-bottom: 1px solid var(--hairline);
}
.m-btn { border: none; background: transparent; color: inherit; padding: 6px; display: flex; border-radius: var(--radius-sm); }

.sidebar {
  width: 236px; flex-shrink: 0; display: flex; flex-direction: column;
  background: var(--brand-navy); color: var(--on-dark);
}
.brand { display: flex; align-items: center; gap: 10px; padding: 20px 16px; border-bottom: 1px solid var(--brand-navy-mid); }
.brand-logo {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.brand-name { font-size: 15px; font-weight: 600; }
.brand-sub { font-size: 11px; color: var(--on-dark-muted); }

.nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px;
  border-radius: var(--radius-md); color: var(--on-dark-muted);
  font-size: 14px; font-weight: 500; transition: all 0.15s ease;
}
.nav-item:hover { background: var(--brand-navy-mid); color: var(--on-dark); }
.nav-item.active { background: var(--primary); color: #fff; }

.sidebar-footer { padding: 12px; border-top: 1px solid var(--brand-navy-mid); display: flex; flex-direction: column; gap: 10px; }
.sys-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--on-dark-muted); padding: 4px 6px; }
.admin-card { display: flex; align-items: center; gap: 10px; }
.admin-name { font-size: 13px; font-weight: 600; }
.admin-mail { font-size: 11px; color: var(--on-dark-muted); }
.admin-card .m-btn:hover { background: var(--brand-navy-mid); color: #ff8787; }

.mask { display: none; }
.content { flex: 1; min-width: 0; overflow-y: auto; display: flex; flex-direction: column; }

@media (max-width: 900px) {
  .mobile-topbar { display: flex; }
  .sidebar { position: fixed; z-index: 50; top: 0; bottom: 0; left: -264px; transition: left 0.2s ease; }
  .sidebar.open { left: 0; }
  .mask { display: block; position: fixed; inset: 0; background: rgba(15, 15, 15, 0.4); z-index: 45; }
  .content { padding-top: 52px; }
}
</style>
