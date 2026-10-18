<script setup lang="ts">
/**
 * 登录后的新公告弹窗（一次提醒）
 * 仅展示标题与内容（不展示发布人）；点「我知道了」把全部已发布公告标记为已读
 * 根类名用 notice-mask：避开布局作用域的 .mask { display:none } 规则泄漏
 */
import AppIcon from '@/components/AppIcon.vue'
import { markAllRead, pendingAnnouncement } from '@/store/announcement'
</script>

<template>
  <Transition name="notice">
    <div v-if="pendingAnnouncement" class="notice-mask">
      <div class="notice-card" role="dialog" aria-modal="true" aria-label="平台公告">
        <span class="notice-tag"><AppIcon name="horn" :size="13" /> 平台公告</span>
        <h3 class="notice-title">{{ pendingAnnouncement.title }}</h3>
        <p class="notice-time"><AppIcon name="clock" :size="13" /> {{ pendingAnnouncement.created_at }}</p>
        <p class="notice-content">{{ pendingAnnouncement.content }}</p>
        <button class="btn btn-primary btn-block" @click="markAllRead">我知道了</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notice-mask {
  position: fixed; inset: 0; z-index: 95;
  background: rgba(10, 21, 48, 0.5); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.notice-card {
  width: 480px; max-width: 100%;
  background: var(--canvas); border-radius: 20px; padding: 24px 26px 22px;
  box-shadow: var(--shadow-modal);
}
.notice-tag {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--surface-soft); color: var(--primary);
  font-size: 12px; font-weight: 700;
  padding: 4px 10px; border-radius: 999px;
}
.notice-title { font-size: 19px; font-weight: 800; color: var(--ink-deep); margin-top: 12px; letter-spacing: -0.3px; }
.notice-time { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--stone); margin-top: 6px; }
.notice-content {
  font-size: 13.5px; line-height: 1.9; color: var(--slate);
  margin-top: 12px; padding: 14px; border-radius: 12px;
  background: var(--surface-soft); white-space: pre-line;
}
.notice-card .btn-block { margin-top: 16px; width: 100%; }

.notice-enter-active, .notice-leave-active { transition: opacity 0.18s ease; }
.notice-enter-active .notice-card, .notice-leave-active .notice-card { transition: transform 0.18s ease; }
.notice-enter-from, .notice-leave-to { opacity: 0; }
.notice-enter-from .notice-card, .notice-leave-to .notice-card { transform: translateY(10px) scale(0.98); }
</style>
