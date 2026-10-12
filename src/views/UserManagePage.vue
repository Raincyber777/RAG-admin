<script setup lang="ts">
/**
 * 管理端 · 用户管理：搜索 / 角色筛选 / 启禁用 / 重置密码 / 删除
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { users as mockUsers, type AdminUser } from '@/mock/adminData'

const list = ref<AdminUser[]>([...mockUsers])
const search = ref('')
const roleFilter = ref<'all' | string>('all')

const filtered = computed(() =>
  list.value.filter(
    (u) =>
      (roleFilter.value === 'all' || u.role === roleFilter.value) &&
      (u.name.includes(search.value.trim()) || u.email.includes(search.value.trim()))
  )
)

const roleTag: Record<string, string> = {
  超级管理员: 'tag-purple',
  知识管理员: 'tag-blue',
  普通用户: 'tag-gray',
}

function toggleStatus(u: AdminUser) {
  u.status = u.status === 'active' ? 'disabled' : 'active'
}

function resetPwd(u: AdminUser) {
  alert(`已为「${u.name}」生成临时密码：Zy@${Math.floor(1000 + Math.random() * 9000)}，请通知用户尽快修改。`)
}

function removeUser(u: AdminUser) {
  if (confirm(`确定删除用户「${u.name}」？该操作不可恢复。`)) {
    list.value = list.value.filter((x) => x.id !== u.id)
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">用户管理</h1>
        <p class="text-sm">共 {{ list.length }} 位用户 · 管理角色与账号状态</p>
      </div>
      <div class="flex gap-sm flex-wrap">
        <div class="search-box">
          <AppIcon name="search" :size="15" />
          <input v-model="search" class="search-input" placeholder="搜索用户名 / 邮箱" />
        </div>
        <select v-model="roleFilter" class="select role-select">
          <option value="all">全部角色</option>
          <option>超级管理员</option>
          <option>知识管理员</option>
          <option>普通用户</option>
        </select>
      </div>
    </header>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>提问数</th>
            <th>注册时间</th>
            <th>最近活跃</th>
            <th>状态</th>
            <th style="width: 190px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" :style="{ background: u.status === 'disabled' ? '#bbb8b1' : '#5645d4' }">{{ u.name[0] }}</div>
                <div>
                  <div class="u-name">{{ u.name }}</div>
                  <div class="text-caption">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <td><span class="tag" :class="roleTag[u.role]">{{ u.role }}</span></td>
            <td>{{ u.questions }}</td>
            <td class="muted">{{ u.createdAt }}</td>
            <td class="muted">{{ u.lastActive }}</td>
            <td>
              <span class="tag" :class="u.status === 'active' ? 'tag-green' : 'tag-red'">
                <span class="dot" :class="u.status === 'active' ? 'dot-green' : 'dot-red'"></span>
                {{ u.status === 'active' ? '正常' : '已禁用' }}
              </span>
            </td>
            <td>
              <div class="flex gap-xs">
                <button class="btn btn-ghost btn-sm" @click="toggleStatus(u)">
                  {{ u.status === 'active' ? '禁用' : '启用' }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="resetPwd(u)">重置密码</button>
                <button class="action-btn danger" title="删除" @click="removeUser(u)"><AppIcon name="trash" :size="15" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="empty-cell">没有匹配的用户</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1200px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
.search-box {
  display: flex; align-items: center; gap: 8px; width: 240px; padding: 0 12px; height: 40px;
  background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  color: var(--stone);
}
.search-input { border: none; outline: none; flex: 1; font-size: 13px; background: transparent; }
.role-select { width: 130px; height: 40px; }
.u-name { font-size: 14px; font-weight: 600; }
.action-btn {
  border: none; background: transparent; color: var(--steel);
  padding: 6px; border-radius: var(--radius-sm); display: flex;
}
.action-btn.danger:hover { color: var(--error); background: #fdecec; }
.empty-cell { text-align: center; padding: 40px 0 !important; color: var(--stone); }

@media (max-width: 860px) {
  .page { padding: 20px 16px; }
}
</style>
