<script setup lang="ts">
/**
 * 品牌动态 Logo（深空紫版，全站替换静态紫方块）：
 * - 深夜蓝圆角方砖 + 淡紫水晶四角星（主星）+ 左下小晶星，与品牌动态星标同款造型
 * - 主星缓呼吸缩放 + 白紫渐变流动；小星错峰闪烁；整体柔光呼吸
 * - 渐变 id 按实例加 uid，避免同页多实例 id 冲突
 * 用法：<LogoMark :size="26" />
 */
defineProps<{ size?: number }>()
const uid = Math.random().toString(36).slice(2, 8)
</script>

<template>
  <svg :width="size || 26" :height="size || 26" viewBox="0 0 32 32" fill="none" class="logo-mark" aria-hidden="true">
    <defs>
      <!-- 深空方砖：左上微亮 → 右下深黑蓝 -->
      <linearGradient :id="`lm-tile-${uid}`" x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1e2249" />
        <stop offset="1" stop-color="#0a0c1e" />
      </linearGradient>
      <!-- 主星填充：淡紫水晶 ↔ 亮紫缓慢流动 -->
      <linearGradient :id="`lm-star-${uid}`" x1="9" y1="6" x2="25" y2="25" gradientUnits="userSpaceOnUse">
        <stop stop-color="#d9d3fd">
          <animate attributeName="stop-color" values="#d9d3fd;#c0b4f9;#9d8cf1;#c0b4f9;#d9d3fd" dur="6s" repeatCount="indefinite" />
        </stop>
        <stop offset="1" stop-color="#9d8cf1">
          <animate attributeName="stop-color" values="#9d8cf1;#d9d3fd;#c0b4f9;#d9d3fd;#9d8cf1" dur="6s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
    </defs>

    <!-- 深空方砖（带一点顶缘高光描边） -->
    <rect x="1" y="1" width="30" height="30" rx="9" :fill="`url(#lm-tile-${uid})`" />
    <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" stroke="#8f84f0" stroke-opacity="0.22" />

    <!-- 主星：缓呼吸缩放 -->
    <path
      class="lm-star"
      d="M17 4C18.2 10.9 21.6 14.3 28.5 15.5C21.6 16.7 18.2 20.1 17 27C15.8 20.1 12.4 16.7 5.5 15.5C12.4 14.3 15.8 10.9 17 4Z"
      :fill="`url(#lm-star-${uid})`"
    />
    <!-- 左下小晶星：错峰闪烁 + 微旋（外层 g 定位，避免 CSS transform 覆盖 SVG translate） -->
    <g transform="translate(9.5 22.5)">
      <path
        class="lm-mini"
        d="M0 -2.6C0.25 -1 1 -0.25 2.6 0C1 0.25 0.25 1 0 2.6C-0.25 1 -1 0.25 -2.6 0C-1 -0.25 -0.25 -1 0 -2.6Z"
        fill="#cfc7fb"
      >
        <animate attributeName="opacity" values="0;0;0.95;0;0" keyTimes="0;0.38;0.47;0.58;1" dur="4.6s" repeatCount="indefinite" />
      </path>
    </g>
  </svg>
</template>

<style scoped>
/* 主星呼吸缩放（fill-box 让缩放围绕星形自身中心） */
.lm-star {
  transform-box: fill-box;
  transform-origin: center;
  animation: lm-pulse 4.2s ease-in-out infinite;
}
/* 小星微旋，与闪烁错峰 */
.lm-mini {
  transform-box: fill-box;
  transform-origin: center;
  animation: lm-twirl 4.6s ease-in-out infinite;
}
/* 整体柔光呼吸：紫晕缓慢收放 */
.logo-mark {
  animation: lm-glow 6s ease-in-out infinite;
  overflow: visible;
}
@keyframes lm-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.09); }
}
@keyframes lm-twirl {
  0%, 100% { transform: rotate(0deg) scale(1); }
  45% { transform: rotate(28deg) scale(1.18); }
  55% { transform: rotate(34deg) scale(1.12); }
}
@keyframes lm-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(150, 134, 240, 0.28)); }
  50% { filter: drop-shadow(0 0 7px rgba(178, 164, 250, 0.55)); }
}
</style>
