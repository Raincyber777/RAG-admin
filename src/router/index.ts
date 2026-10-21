import { createRouter, createWebHistory } from 'vue-router'
import { acceptSso, logoutAdmin, session, USER_ORIGIN } from '@/store/auth'

/**
 * 管理员端路由表（与用户端完全独立的项目，样式与功能对齐用户端）
 * 统一登录：不单独提供登录页，管理员 / 超级管理员在用户端首页登录后
 * 由用户端携带 sso 参数跳入管理端；未登录访问管理端一律跳回用户端登录
 * /admin/welcome   工作台（登录后默认进入，可一键进入用户端）
 * /admin/dashboard 数据看板
 * /admin/accounts  账号管理（用户与管理员账号统一管理）
 * /admin/notes     课堂纪要
 * /admin/qa        问答记录
 * /admin/quiz      题库管理
 * /admin/feedbacks 问题反馈
 * /admin/samples   训练样本（生成 / 审核 / 导出 + 知识库缺口）
 * /admin/audit     内容审核（敏感内容脱敏日志）
 * /admin/announcements 公告管理（公告 / 日志 / 协议）
 * /admin/guide     使用说明
 * /admin/settings  个人设置
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/admin/welcome',
      children: [
        { path: 'welcome', name: 'welcome', component: () => import('@/views/WelcomePage.vue'), meta: { title: '工作台' } },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardPage.vue'), meta: { title: '数据看板' } },
        { path: 'accounts', name: 'accounts', component: () => import('@/views/AccountsPage.vue'), meta: { title: '账号管理' } },
        { path: 'notes', name: 'notes', component: () => import('@/views/NotesAdminPage.vue'), meta: { title: '课堂纪要' } },
        { path: 'qa', name: 'qa', component: () => import('@/views/QaAdminPage.vue'), meta: { title: '问答记录' } },
        { path: 'quiz', name: 'quiz', component: () => import('@/views/QuizAdminPage.vue'), meta: { title: '题库管理' } },
        { path: 'feedbacks', name: 'feedbacks', component: () => import('@/views/FeedbackAdminPage.vue'), meta: { title: '问题反馈' } },
        { path: 'samples', name: 'samples', component: () => import('@/views/SampleReviewPage.vue'), meta: { title: '训练样本' } },
        { path: 'audit', name: 'audit', component: () => import('@/views/AuditLogPage.vue'), meta: { title: '内容审核' } },
        { path: 'announcements', name: 'announcements', component: () => import('@/views/AnnouncementAdminPage.vue'), meta: { title: '公告管理' } },
        { path: 'guide', name: 'guide', component: () => import('@/views/GuideAdminPage.vue'), meta: { title: '使用说明' } },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsPage.vue'), meta: { title: '个人设置' } },
      ],
    },
    { path: '/', redirect: '/admin' },
    { path: '/:pathMatch(.*)*', redirect: '/admin' },
  ],
})

// 分权登录守卫：
// 1. 用户端跳转携带 ?sso=1 时建立管理端会话（演示 SSO，去除参数后重入）
// 2. 管理端不单独提供登录页：未登录一律跳回用户端首页（?login=1 自动打开登录弹窗）
//    管理员 / 超级管理员在用户端登录后由用户端跳回管理端，普通用户账号仅能使用用户端
router.beforeEach((to) => {
  if (to.query.sso === '1') {
    acceptSso({
      n: typeof to.query.n === 'string' ? to.query.n : undefined,
      e: typeof to.query.e === 'string' ? to.query.e : undefined,
      r: typeof to.query.r === 'string' ? to.query.r : undefined,
      t: typeof to.query.t === 'string' ? to.query.t : undefined,
      rt: typeof to.query.rt === 'string' ? to.query.rt : undefined,
    })
    return { path: to.path, query: {}, replace: true }
  }

  const token = localStorage.getItem('zy_admin_token')
  if (token && !session.value) logoutAdmin() // 会话缺失视为未登录

  const authed = !!token && !!session.value
  if (!authed) {
    // 统一登录入口：跳转用户端着陆页并自动打开登录弹窗
    window.location.href = `${USER_ORIGIN}/login?login=1`
    return false
  }
  return true
})

export default router
