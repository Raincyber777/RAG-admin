# 智源问答 · 管理员端

> 智源问答（RAG 知识问答系统）的 **管理控制台**，与用户端为两个完全独立的项目。
> 用户端仓库：`传智杯RAG知识问答系统项目/RAG-AI-system`

## 快速开始

```bash
npm install
npm run dev      # 开发调试，默认 http://localhost:5173（建议与用户端错开端口：npm run dev -- --port 5174）
npm run build    # 生产构建
```

登录页输入任意账号密码即可进入演示（管理员状态存于 localStorage `zy_admin_token`）。

## 功能板块

| 路由 | 页面 | 说明 |
|---|---|---|
| `/admin/login` | 管理员登录 | 深蓝视觉 + 权限提示 |
| `/admin/dashboard` | **系统总览** | 6 项核心指标卡 · 问答请求量趋势 · 用户活跃 TOP5 · 服务健康巡检 |
| `/admin/users` | **用户管理** | 搜索 / 角色筛选 / 启禁用 / 重置密码 / 删除 |
| `/admin/spaces` | **知识空间管理** | 全局空间卡片视图，新建 / 编辑 / 删除（容量与负责人监控） |
| `/admin/documents` | **文档解析管理** | 实时解析队列进度条 · 全量文档状态监控 / 重试 / 删除 |
| `/admin/logs` | **系统日志** | INFO / WARN / ERROR 分级筛选 + 关键词搜索 |
| `/admin/feedbacks` | **反馈处理** | 用户反馈卡片流，一键流转：待处理 → 处理中 → 已解决 |
| `/admin/guide` | **使用说明** | 三大职责 · 模块导览 · 日常运维节奏 · 常见问题 FAQ |

## 目录结构

```
src/
├── assets/design.css        # 设计系统（与用户端同一套 Notion 风格 Token）
├── router/index.ts          # 管理端路由表（含管理员登录守卫）
├── layouts/AdminLayout.vue  # 深蓝侧边栏布局（与用户端浅色侧边栏区分）
├── components/AppIcon.vue   # 内置 SVG 图标库
├── mock/adminData.ts        # 管理端模拟数据（可替换为真实接口）
└── views/
    ├── AdminLoginPage.vue      # 管理员登录
    ├── AdminDashboardPage.vue  # 系统总览
    ├── UserManagePage.vue      # 用户管理
    ├── SpaceManagePage.vue     # 知识空间管理
    ├── DocumentManagePage.vue  # 文档解析管理
    ├── SystemLogPage.vue       # 系统日志
    ├── FeedbackManagePage.vue  # 反馈处理
    └── AdminGuidePage.vue      # 使用说明
```

## 技术栈

Vue 3.5（`<script setup>` + TypeScript）· Vue Router 4 · ECharts 6 · Vite 8
