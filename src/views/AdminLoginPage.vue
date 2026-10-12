<script setup lang="ts">
/**
 * 管理员登录页：深蓝背景 + 居中卡片
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const account = ref('')
const password = ref('')
const loading = ref(false)

function login() {
  loading.value = true
  setTimeout(() => {
    localStorage.setItem('zy_admin_token', 'admin-demo-token')
    loading.value = false
    router.push('/admin/dashboard')
  }, 600)
}
</script>

<template>
  <div class="page">
    <span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><span class="dot d4"></span>

    <div class="login-card">
      <div class="logo"><AppIcon name="shield" :size="24" /></div>
      <h1 class="h3">智源问答 · 管理控制台</h1>
      <p class="text-sm mb-lg">仅限授权管理员访问，操作将被审计记录</p>

      <form @submit.prevent="login">
        <div class="field">
          <label class="field-label">管理员账号</label>
          <input v-model="account" class="input" placeholder="admin@zhiyuan.ai" required />
        </div>
        <div class="field">
          <label class="field-label">密码</label>
          <input v-model="password" class="input" type="password" placeholder="请输入密码" required />
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '验证中…' : '登录控制台' }}
        </button>
      </form>

      <div class="back"><AppIcon name="arrow-left" :size="13" /> 返回用户端请访问 <a href="http://localhost:5173">用户端地址</a></div>
    </div>
  </div>
</template>

<style scoped>
.page {
  height: 100%; display: flex; align-items: center; justify-content: center;
  background: var(--brand-navy); position: relative; overflow: hidden; padding: 24px;
}
.dot { position: absolute; border-radius: 50%; }
.d1 { top: 14%; left: 10%; width: 14px; height: 14px; background: #ff64c8; }
.d2 { top: 24%; right: 14%; width: 10px; height: 10px; background: #f5d75e; }
.d3 { bottom: 18%; left: 20%; width: 12px; height: 12px; background: #2a9d99; }
.d4 { bottom: 26%; right: 8%; width: 16px; height: 16px; background: #5645d4; }

.login-card {
  width: 420px; max-width: 100%; background: var(--canvas);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-mockup);
  padding: 36px; text-align: center; position: relative; z-index: 1;
}
.logo {
  width: 54px; height: 54px; border-radius: 14px; margin: 0 auto 16px;
  background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
}
.login-card .field { text-align: left; }
.back { margin-top: 20px; font-size: 12px; color: var(--stone); display: flex; align-items: center; justify-content: center; gap: 5px; }
</style>
