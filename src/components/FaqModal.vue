<script setup lang="ts">
/**
 * 常见问题详情弹窗：点击 FAQ 列表项后弹出，完整展示问题与解答
 * × / 遮罩点击 / Esc 均可关闭（根类名 faq-view-mask：避开布局作用域的 .mask 规则）
 */
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ faq: { q: string; a: string } | null }>()
const emit = defineEmits<{ close: [] }>()

function onEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.faq) emit('close')
}
onMounted(() => {
  window.addEventListener('keydown', onEscKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEscKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div v-if="faq" class="faq-view-mask" @click.self="emit('close')">
    <div class="faq-view-card" role="dialog" aria-modal="true" aria-label="常见问题详情">
      <button class="faq-view-x" aria-label="关闭详情" @click="emit('close')"><AppIcon name="x" :size="15" /></button>
      <div class="faq-view-tag"><AppIcon name="info" :size="13" /> 常见问题</div>
      <h3 class="faq-view-q">{{ faq.q }}</h3>
      <p class="faq-view-a">{{ faq.a }}</p>
      <div class="faq-view-foot">
        <button class="btn btn-secondary btn-sm" @click="emit('close')">我知道了</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-view-mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(10, 21, 48, 0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; padding: 20px; overflow-y: auto;
}
.faq-view-card {
  width: 560px; max-width: 100%; margin: auto; position: relative;
  background: var(--canvas); border-radius: 20px; padding: 28px 30px 24px;
  box-shadow: var(--shadow-modal);
}
.faq-view-x {
  position: absolute; top: 14px; right: 14px;
  border: none; background: var(--surface); color: var(--steel);
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.faq-view-x:hover { background: var(--hairline-soft); color: var(--ink); }
.faq-view-tag {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--tint-lavender); color: var(--brand-purple-800);
  font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: var(--radius-full);
  margin-bottom: 14px;
}
.faq-view-q { font-size: 17.5px; font-weight: 700; color: var(--ink-deep); line-height: 1.5; margin-bottom: 12px; }
.faq-view-a { font-size: 14px; color: var(--slate); line-height: 1.85; }
.faq-view-foot { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-sm { padding: 8px 18px; font-size: 13.5px; }
</style>
