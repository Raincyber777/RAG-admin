<script setup lang="ts">
/**
 * 管理端 · 知识空间管理：查看/新建/编辑/删除全局知识空间
 */
import { ref, reactive } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { spaces as mockSpaces, type AdminSpace } from '@/mock/adminData'

const list = ref<AdminSpace[]>([...mockSpaces])
const showForm = ref(false)
const editTarget = ref<AdminSpace | null>(null)
const form = reactive({ name: '', desc: '' })

const tints = ['tint-sky', 'tint-lavender', 'tint-mint', 'tint-peach', 'tint-yellow', 'tint-rose']

function openCreate() {
  editTarget.value = null
  form.name = ''
  form.desc = ''
  showForm.value = true
}
function openEdit(sp: AdminSpace) {
  editTarget.value = sp
  form.name = sp.name
  form.desc = sp.desc
  showForm.value = true
}
function save() {
  if (!form.name.trim()) return
  if (editTarget.value) {
    editTarget.value.name = form.name.trim()
    editTarget.value.desc = form.desc.trim()
  } else {
    list.value.push({
      id: 'sp' + Date.now(),
      name: form.name.trim(),
      desc: form.desc.trim() || '暂无描述',
      docs: 0,
      vectors: 0,
      members: 1,
      owner: '超级管理员',
      createdAt: new Date().toISOString().slice(0, 10),
    })
  }
  showForm.value = false
}
function removeSpace(sp: AdminSpace) {
  if (confirm(`删除知识空间「${sp.name}」将同时删除其 ${sp.docs} 篇文档的向量数据，确定？`)) {
    list.value = list.value.filter((x) => x.id !== sp.id)
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="h2">知识空间管理</h1>
        <p class="text-sm">全局知识空间的创建、编辑与容量监控</p>
      </div>
      <button class="btn btn-primary" @click="openCreate"><AppIcon name="plus" :size="15" /> 新建知识空间</button>
    </header>

    <div class="space-grid">
      <div v-for="(sp, i) in list" :key="sp.id" class="space-card card card-hover">
        <div class="space-top" :class="tints[i % tints.length]">
          <AppIcon name="folder" :size="20" />
          <div class="flex-1 ellipsis">
            <div class="space-name">{{ sp.name }}</div>
            <div class="space-owner">负责人：{{ sp.owner }}</div>
          </div>
        </div>
        <p class="space-desc">{{ sp.desc }}</p>
        <div class="space-stats">
          <div class="ss"><b>{{ sp.docs }}</b><span>文档</span></div>
          <div class="ss"><b>{{ (sp.vectors / 1000).toFixed(1) }}k</b><span>向量</span></div>
          <div class="ss"><b>{{ sp.members }}</b><span>成员</span></div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-caption">创建于 {{ sp.createdAt }}</span>
          <div class="flex gap-xs">
            <button class="btn btn-ghost btn-sm" @click="openEdit(sp)"><AppIcon name="edit" :size="13" /> 编辑</button>
            <button class="btn btn-ghost btn-sm danger" @click="removeSpace(sp)"><AppIcon name="trash" :size="13" /> 删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建 / 编辑弹窗 -->
    <div v-if="showForm" class="modal-mask" @click.self="showForm = false">
      <div class="modal">
        <div class="modal-title">{{ editTarget ? '编辑知识空间' : '新建知识空间' }}</div>
        <p class="modal-sub">知识空间用于按业务归类文档与向量数据</p>
        <div class="field">
          <label class="field-label">空间名称</label>
          <input v-model="form.name" class="input" placeholder="例如：市场物料" />
        </div>
        <div class="field">
          <label class="field-label">描述</label>
          <textarea v-model="form.desc" class="textarea" rows="3" placeholder="这个空间存放什么类型的知识？"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showForm = false">取消</button>
          <button class="btn btn-primary" @click="save">{{ editTarget ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px 40px; max-width: 1200px; width: 100%; margin: 0 auto; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }

.space-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.space-card { padding: 0; overflow: hidden; }
.space-top { display: flex; align-items: center; gap: 12px; padding: 18px 20px; }
.space-name { font-size: 16px; font-weight: 700; }
.space-owner { font-size: 11.5px; opacity: 0.75; }
.space-desc { padding: 14px 20px 0; font-size: 13px; color: var(--slate); line-height: 1.6; }
.space-stats { display: flex; gap: 26px; padding: 16px 20px; }
.ss b { display: block; font-size: 18px; letter-spacing: -0.5px; }
.ss span { font-size: 11.5px; color: var(--stone); }
.space-card > .flex { padding: 0 20px 16px; }
.danger { color: var(--error); }

@media (max-width: 860px) {
  .page { padding: 20px 16px; }
}
</style>
