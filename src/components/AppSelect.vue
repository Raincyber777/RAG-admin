<script setup lang="ts">
/**
 * 通用下拉选择器（自建设计系统组件，替代生硬的原生 select）
 * - 触发器与全局 .input 同款外观；面板浮层带阴影与入场动画
 * - 支持点击外部关闭、Esc 关闭、方向键在选项间移动、选中项高亮打勾
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
const root = ref<HTMLElement>()
const panel = ref<HTMLElement>()

const current = computed(() => props.options.find((o) => o.value === props.modelValue))
const display = computed(() => current.value?.label ?? '')

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}
function openPanel() {
  if (props.disabled) return
  open.value = true
  nextTick(() => panel.value?.querySelector<HTMLElement>('.as-option')?.focus())
}
function choose(v: string) {
  emit('update:modelValue', v)
  open.value = false
}
// 选项内的管理操作：触发事件并收起面板（避免操作弹窗与面板叠加）
function renameOption(v: string) {
  emit('rename', v)
  open.value = false
}
function deleteOption(v: string) {
  emit('delete', v)
  open.value = false
}
// 选项回车 / 空格选中；焦点在内部操作按钮上时不触发（避免冒射误选）
function onOptionKey(e: KeyboardEvent, v: string) {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    choose(v)
  }
}
// 方向键在选项间移动焦点
function onPanelKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const buttons = Array.from(panel.value?.querySelectorAll<HTMLElement>('.as-option') ?? [])
  if (!buttons.length) return
  e.preventDefault()
  const idx = buttons.indexOf(document.activeElement as HTMLElement)
  const next = e.key === 'ArrowDown' ? Math.min(buttons.length - 1, idx + 1) : Math.max(0, idx - 1)
  buttons[next]?.focus()
}
// 点击组件外部关闭
function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
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
    <button
      class="as-trigger"
      :class="{ active: open, disabled }"
      type="button"
      role="combobox"
      :aria-expanded="open"
      :aria-label="ariaLabel || placeholder"
      :disabled="disabled"
      @click="toggle"
      @keydown.down.prevent="openPanel"
      @keydown.up.prevent="openPanel"
    >
      <span class="as-value" :class="{ placeholder: !current }">{{ display || placeholder }}</span>
      <AppIcon name="chevron-down" :size="14" class="as-caret" />
    </button>
    <Transition name="as-drop">
      <div v-if="open" ref="panel" class="as-panel" role="listbox" :aria-label="ariaLabel || placeholder" @keydown="onPanelKey">
        <div
          v-for="o in options"
          :key="o.value"
          class="as-option"
          :class="{ selected: o.value === modelValue }"
          role="option"
          tabindex="-1"
          :aria-selected="o.value === modelValue"
          @click="choose(o.value)"
          @keydown="onOptionKey($event, o.value)"
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
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-select { position: relative; width: 100%; }

/* 触发器：与全局 .input 同款外观 */
.as-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; height: 44px; padding: 10px 12px;
  font-family: inherit; font-size: 14px; color: var(--ink); text-align: left;
  background: var(--canvas); border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-md); cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.as-trigger:hover:not(.disabled) { border-color: var(--steel); }
.as-trigger.active { border: 2px solid var(--primary); padding: 9px 11px; }
.as-trigger:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.as-trigger.disabled { opacity: 0.55; cursor: not-allowed; }
.as-value { flex: 1; min-width: 0; }
.as-value.placeholder { color: var(--muted); }
.as-caret { flex-shrink: 0; color: var(--stone); transition: transform 0.15s ease; }
.as-trigger.active .as-caret { transform: rotate(180deg); color: var(--primary); }

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
.as-option:hover, .as-option:focus-visible { background: var(--surface-soft); outline: none; }
.as-option.selected { color: var(--primary); font-weight: 600; background: var(--tint-lavender); }
.as-option:focus-visible.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
.as-label { flex: 1; min-width: 0; }
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
