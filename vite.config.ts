import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 固定端口：用户端 5173 / 管理端 5174（跨端跳转 URL 与 store 中的常量保持一致）
    port: 5174,
    // /api 与 /media 代理到 Django(8080)，前端全部同源请求（与用户端 vite 配置保持一致）
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
    allowedHosts: ['.ngrok-free.dev'],
  },
})
