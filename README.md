# 智学纪要 · 管理端

> 多模态课堂知识助手的 **管理控制台**，与用户端为两个完全独立的项目。
>
> - 服务端仓库：[Raincyber777/-RAG-Database](https://github.com/Raincyber777/-RAG-Database)
> - 用户端仓库：[Raincyber777/RAG-AI-system](https://github.com/Raincyber777/RAG-AI-system)

## 快速开始

```bash
npm install
npm run type-check   # vue-tsc 类型检查（CI 部署前强制执行）
npm run dev          # 开发调试（与用户端错开端口：npm run dev -- --port 5174）
npm run build        # 类型检查 + 生产构建
```

接口默认走本仓库 Vite 代理（`/api` → `http://127.0.0.1:8080`，即服务端 `python manage.py runserver`）。可选环境变量 `VITE_USER_ORIGIN`：跨域跳转用户端时的用户端站点地址，默认当前站点。

管理员 / 超级管理员账号由服务端创建（`python manage.py seed_demo` 演示账号，或服务端管理接口新建）。

## 功能板块

| 路由 | 页面 | 说明 |
|---|---|---|
| `/admin/welcome` | 工作台 | 平台速览：用户 / 纪要 / 问答 / 待处理反馈等指标 |
| `/admin/dashboard` | 数据看板 | 平台口径指标卡 + 每日追问趋势、材料类型占比、高频知识点、热门追问词云（ECharts） |
| `/admin/accounts` | 账号管理 | 搜索 / 角色筛选 / 新建管理员 / 重置密码 / 停用恢复 |
| `/admin/notes` | 课堂纪要 | 全部纪要巡检：详情查看 / 删除违规内容 / 批量删除（课程筛选） |
| `/admin/qa` | 问答记录 | 全部问答巡检：会话目录 / 记录详情 / 批量删除 |
| `/admin/quiz` | 题库管理 | 全部题目巡检：详情 / 编辑 / 删除（课程与题型筛选） |
| `/admin/feedbacks` | 问题反馈 | 用户反馈卡片流 + 详情弹窗，流转待处理 → 已处理 |
| `/admin/announcements` | 公告管理 | 公告发布 / 编辑 / 下线，已读情况跟踪 |
| `/admin/guide` | 使用说明 | 用户端使用说明内容维护（使用技巧 / 常见问题，分用户端与管理端两套） |
| `/admin/settings` | 个人设置 | 管理员自身资料维护 |

## 目录结构

```
src/
├── assets/design.css        # 设计系统（与用户端同一套 Design Tokens）
├── api/index.ts             # REST 客户端 + 各管理域 API 封装
├── store/                   # Pinia：auth / faq / tips / 各管理域数据
├── router/index.ts          # 管理端路由表（登录守卫）
├── layouts/AdminLayout.vue  # 侧边栏布局 + 导航
├── components/              # AppIcon、CourseSelect、AppSelect 等
└── views/                   # 页面组件（与上表路由一一对应）
```

## 技术栈

Vue 3.5（`<script setup>` + TypeScript）· Vue Router 4 · Pinia · ECharts · Vite

## 部署

`git push` 触发 GitHub Actions：`vue-tsc --build` 类型检查通过后构建并自动部署到 ECS Nginx（生产站点 `:8081`）。
