<script setup lang="ts">
/**
 * 课程筛选下拉（管理端通用）：与用户端课程表同构
 * - 选项 = 「全部」+ 管理端显示名课程表；用户端新增课程后自动出现在下拉中
 * - 选项上可直接重命名 / 删除课程：
 *   · 重命名仅管理端生效（别名合并）：用户端仍显示原名称，名下纪要与问答在管理端归入新名称显示
 *   · 删除需弹窗确认后果：归入该课程显示名的全部纪要与问答一并清除
 * 用法：<CourseSelect v-model="courseFilter" />
 */
import { ref, computed, nextTick } from 'vue'
import AppSelect from '@/components/AppSelect.vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  notes, qaRecords, displayCourses, originalsOf,
  removeCourseDisplay, renameCourseDisplay,
} from '@/store/admin'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const options = computed(() => [
  { label: '全部课程', value: '全部' },
  ...displayCourses.value.map((c) => ({ label: c, value: c })),
])

// ---------- 删除课程：弹窗告知后果（名下纪要 / 问答一并清除，不可恢复） ----------
const deleteTarget = ref('')
const deleteOriginals = computed(() => originalsOf(deleteTarget.value))
const deleteHasAlias = computed(() => deleteOriginals.value.some((o) => o !== deleteTarget.value))
const delNoteCount = computed(() => notes.filter((n) => deleteOriginals.value.includes(n.course)).length)
const delQaCount = computed(() => qaRecords.filter((q) => deleteOriginals.value.includes(q.course)).length)
function askDelete(name: string) {
  deleteTarget.value = name
  deleteError.value = ''
}
const deleteError = ref('')
const deleting = ref(false)
async function confirmDelete() {
  const name = deleteTarget.value
  if (!name || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await removeCourseDisplay(name)
    if (props.modelValue === name) emit('update:modelValue', '全部')
    deleteTarget.value = ''
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : '删除失败，请确认后端已启动'
  } finally {
    deleting.value = false
  }
}

// ---------- 重命名课程：仅管理端生效的别名合并 ----------
const renameTarget = ref('')
const renameValue = ref('')
const renameError = ref('')
const renameInput = ref<HTMLInputElement>()
const renameOriginals = computed(() => originalsOf(renameTarget.value))
// 新名称与现有其他课程相同 → 提示将合并显示（允许，合并是设计行为而非错误）
const renameMergeWith = computed(() => {
  const t = renameValue.value.trim()
  if (!t || t === renameTarget.value) return ''
  return displayCourses.value.includes(t) ? t : ''
})
function askRename(name: string) {
  renameTarget.value = name
  renameValue.value = name
  renameError.value = ''
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}
function closeRename() {
  renameTarget.value = ''
  renameError.value = ''
}
function confirmRename() {
  const name = renameValue.value.trim()
  if (!name) {
    renameError.value = '请输入课程名称'
    return
  }
  renameCourseDisplay(renameTarget.value, name)
  if (props.modelValue === renameTarget.value) emit('update:modelValue', name)
  closeRename()
}
</script>

<template>
  <div class="course-select">
    <AppSelect
      :model-value="modelValue"
      :options="options"
      aria-label="按课程筛选"
      deletable
      renamable
      manage-except="全部"
      @update:model-value="emit('update:modelValue', $event)"
      @delete="askDelete"
      @rename="askRename"
    />

    <!-- 删除课程确认：明确告知后果 -->
    <div v-if="deleteTarget" class="modal-mask" @click.self="deleteTarget = ''">
      <div class="modal modal-sm">
        <div class="modal-title">删除所属课程</div>
        <p class="modal-sub">
          确定删除课程「{{ deleteTarget }}」吗？该课程名下的
          <strong>{{ delNoteCount }}</strong> 份课堂纪要与 <strong>{{ delQaCount }}</strong> 条问答记录将一并删除，此操作不可恢复。
        </p>
        <p v-if="deleteHasAlias" class="modal-note">
          该显示名下合并了用户端原名称：{{ deleteOriginals.filter((o) => o !== deleteTarget).join('、') }}
          或「{{ deleteTarget }}」本身。
        </p>
        <p v-if="deleteError" class="modal-sub hint-err">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="deleteTarget = ''">取消</button>
          <button class="btn btn-danger" :disabled="deleting" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 重命名课程：仅管理端生效 -->
    <div v-if="renameTarget" class="modal-mask" @click.self="closeRename">
      <div class="modal modal-sm">
        <div class="modal-title">重命名课程（仅管理端）</div>
        <p class="modal-sub">
          改名只在管理端生效：用户端仍显示原名称「{{ renameOriginals.join('、') }}」，
          名下的纪要与问答记录在管理端会自动归入新名称显示。
        </p>
        <div class="field">
          <label class="field-label" for="course-rename-input">管理端显示名称</label>
          <input
            id="course-rename-input"
            ref="renameInput"
            v-model="renameValue"
            class="input"
            maxlength="20"
            @keydown.enter="confirmRename"
          />
          <p v-if="renameMergeWith" class="rename-note">
            <AppIcon name="link" :size="12" /> 将并入现有课程「{{ renameMergeWith }}」一起显示
          </p>
          <p v-if="renameError" class="rename-err"><AppIcon name="alert" :size="12" /> {{ renameError }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeRename">取消</button>
          <button class="btn btn-primary" @click="confirmRename">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-select { width: 220px; max-width: 100%; }
.rename-err, .rename-note {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; margin-top: 6px;
}
.rename-err { color: var(--error); }
.rename-note { color: var(--link-blue); }
.modal-note {
  font-size: 12.5px; color: var(--stone); line-height: 1.7;
  background: var(--surface-soft); border-radius: var(--radius-md); padding: 9px 12px;
}
.hint-err { color: #d92d20; }
</style>
