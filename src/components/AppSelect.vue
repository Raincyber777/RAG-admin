<script setup lang="ts">
/**
 * 通用下拉选择器（可输入过滤的下拉框，自建设计系统组件）
 * - 触发器即输入框：点击展开后可直接输入关键字，选项按包含关系实时过滤（无匹配时给空态提示）
 * - 支持点击外部关闭、Esc 关闭、↑/↓ 移动高亮、Enter 选中高亮项
 * - 选中项高亮打勾；选项右侧可挂重命名 / 删除按钮（配合 rename / delete 事件）
 * 用法：<AppSelect v-model="v" :options="[{ label, value }]" />
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

export interface SelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
    deletable?: boolean // 选项右侧显示“×”删除按钮（配合 delete 事件）
    renamable?: boolean // 选项右侧显示重命名按钮（配合 rename 事件）
    manageExcept?: string // 值等于它的选项（如「全部」）不显示管理按钮
  }>(),
  { placeholder: '请选择', disabled: false, ariaLabel: '', deletable: false, renamable: false, manageExcept: '' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'delete', v: string): void
  (e: 'rename', v: string): void
}>()

const open = ref(false)
const query = ref('')
const dirty = ref(false) // 展开后是否已输入过：未输入时输入框先展示当前选中值（全选态）
const activeIdx = ref(0) // 键盘 ↑/↓ 高亮的选项下标
const root = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const input = ref<HTMLInputElement>()

const current = computed(() => props.options.find((o) => o.value === props.modelValue))
const display = computed(() => current.value?.label ?? '')

// 输入过滤：关键字与选项文本包含匹配（不区分大小写）
const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
})

// 移动高亮并保证高亮项滚进可视区
function setActive(i: number) {
  const n = filteredOptions.value.length
  activeIdx.value = n ? Math.min(Math.max(0, i), n - 1) : 0
  nextTick(() => panel.value?.querySelector('.as-option.hl')?.scrollIntoView({ block: 'nearest' }))
}
function openPanel() {
  if (props.disabled) return
  open.value = true
  dirty.value = false
  query.value = ''
  setActive(filteredOptions.value.findIndex((o) => o.value === props.modelValue))
  nextTick(() => input.value?.select()) // 全选当前值，直接输入即可覆盖
}
function close() {
  open.value = false
  query.value = ''
  dirty.value = false
}
function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  dirty.value = true
  open.value = true
  setActive(0)
}
function choose(v: string) {
  emit('update:modelValue', v)
  close()
}
// 键盘：↑/↓ 移动高亮，Enter 选中高亮项，Esc 关闭并移开焦点
function onTriggerKey(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      e.preventDefault()
      openPanel()
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setActive(activeIdx.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setActive(activeIdx.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const o = filteredOptions.value[activeIdx.value]
    if (o) choose(o.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
    input.value?.blur()
  }
}
// 选项内的管理操作：触发事件并收起面板（避免操作弹窗与面板叠加）
function renameOption(v: string) {
  emit('rename', v)
  close()
}
function deleteOption(v: string) {
  emit('delete', v)
  close()
}
// 点击组件外部关闭
function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close()
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    close()
    input.value?.blur()
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKey)
})
</script>

<template>
  <div ref="root" class="app-select">
    <div class="as-shell">
      <!-- 已聚焦时点击不再触发 focus，需靠 click 重新展开 -->
      <input
        ref="input"
        class="as-trigger"
        :class="{ active: open, disabled }"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-label="ariaLabel || placeholder"
        :disabled="disabled"
        :value="open && dirty ? query : display"
        :placeholder="open ? '输入关键字筛选…' : placeholder"
        @focus="openPanel"
        @click="open || openPanel()"
        @input="onInput"
        @keydown="onTriggerKey"
      />
      <AppIcon name="chevron-down" :size="14" class="as-caret" />
    </div>
    <Transition name="as-drop">
      <div v-if="open" ref="panel" class="as-panel" role="listbox" :aria-label="ariaLabel || placeholder">
        <div
          v-for="(o, i) in filteredOptions"
          :id="`as-opt-${i}`"
          :key="o.value"
          class="as-option"
          :class="{ selected: o.value === modelValue, hl: i === activeIdx }"
          role="option"
          tabindex="-1"
          :aria-selected="o.value === modelValue"
          @mousedown.prevent
          @mouseenter="setActive(i)"
          @click="choose(o.value)"
        >
          <span class="ellipsis as-label">{{ o.label }}</span>
          <AppIcon v-if="o.value === modelValue" name="check" :size="14" />
          <button
            v-if="renamable && o.value !== manageExcept"
            class="as-act rename"
            type="button"
            :title="'重命名 ' + o.label"
            :aria-label="'重命名 ' + o.label"
            @click.stop="renameOption(o.value)"
          ><AppIcon name="edit" :size="12" /></button>
          <button
            v-if="deletable && o.value !== manageExcept"
            class="as-act danger"
            type="button"
            :title="'删除 ' + o.label"
            :aria-label="'删除 ' + o.label"
            @click.stop="deleteOption(o.value)"
          ><AppIcon name="x" :size="12" /></button>
        </div>
        <div v-if="!filteredOptions.length" class="as-empty">无匹配选项</div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-select { position: relative; width: 100%; }

/* 触发器：与全局 .input 同款外观；展开后即为可输入的过滤框 */
.as-shell { position: relative; }
.as-trigger {
  width: 100%; height: 44px; padding: 10px 34px 10px 12px;
  font-family: inherit; font-size: 14px; color: var(--ink);
  background: var(--canvas); border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-md); cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  text-overflow: ellipsis;
}
.as-trigger::placeholder { color: var(--muted); }
.as-trigger:hover:not(.disabled) { border-color: var(--steel); }
.as-trigger.active { border: 2px solid var(--primary); padding: 9px 33px 9px 11px; }
.as-trigger:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.as-trigger.disabled { opacity: 0.55; cursor: not-allowed; }
.as-caret {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  flex-shrink: 0; color: var(--stone); pointer-events: none;
  transition: transform 0.15s ease;
}
.as-shell.active .as-caret { transform: translateY(-50%) rotate(180deg); color: var(--primary); }

/* 浮层面板 */
.as-panel {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50;
  max-height: 264px; overflow-y: auto; padding: 5px;
  background: var(--canvas); border: 1px solid var(--hairline);
  border-radius: var(--radius-md); box-shadow: var(--shadow-modal);
}
.as-option {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 9px 10px;
  font-family: inherit; font-size: 13.5px; color: var(--ink); text-align: left;
  background: transparent; border: none; border-radius: var(--radius-sm);
  cursor: pointer; user-select: none; transition: background 0.12s ease;
}
.as-option:hover, .as-option.hl { background: var(--surface-soft); outline: none; }
.as-option.selected { color: var(--primary); font-weight: 600; background: var(--tint-lavender); }
.as-label { flex: 1; min-width: 0; }
/* 空态：输入的关键字没有匹配选项 */
.as-empty {
  padding: 14px 10px; text-align: center;
  font-size: 12.5px; color: var(--stone);
}
/* 选项内管理按钮：重命名 / 删除 */
.as-act {
  width: 22px; height: 22px; flex-shrink: 0; border: none; cursor: pointer;
  background: transparent; color: var(--stone); border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s ease;
}
.as-act.rename:hover { background: var(--tint-lavender); color: var(--primary); }
.as-act.danger:hover { background: #fdecec; color: var(--error); }

/* 入场动画 */
.as-drop-enter-active, .as-drop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.as-drop-enter-from, .as-drop-leave-to { opacity: 0; transform: translateY(-5px); }
</style>
