import { createRouter, createWebHistory } from 'vue-router'

/**
 * 管理员端路由表（与用户端完全独立的项目）
 * /admin/login        管理员登录
 * /admin              系统总览仪表盘
 * /admin/users        用户管理
 * /admin/spaces       知识空间管理
 * /admin/documents    文档解析管理
 * /admin/logs         系统日志
 * /admin/feedbacks    反馈处理
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: () => import('@/views/AdminLoginPage.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/admin/dashboard',
      children: [
        { path: 'dashboard', name: 'adminDashboard', component: () => import('@/views/AdminDashboardPage.vue'), meta: { title: '系统总览' } },
        { path: 'users', name: 'adminUsers', component: () => import('@/views/UserManagePage.vue'), meta: { title: '用户管理' } },
        { path: 'spaces', name: 'adminSpaces', component: () => import('@/views/SpaceManagePage.vue'), meta: { title: '知识空间管理' } },
        { path: 'documents', name: 'adminDocuments', component: () => import('@/views/DocumentManagePage.vue'), meta: { title: '文档解析管理' } },
        { path: 'logs', name: 'adminLogs', component: () => import('@/views/SystemLogPage.vue'), meta: { title: '系统日志' } },
        { path: 'feedbacks', name: 'adminFeedbacks', component: () => import('@/views/FeedbackManagePage.vue'), meta: { title: '反馈处理' } },
        { path: 'guide', name: 'adminGuide', component: () => import('@/views/AdminGuidePage.vue'), meta: { title: '使用说明' } },
      ],
    },
    { path: '/', redirect: '/admin' },
    { path: '/:pathMatch(.*)*', redirect: '/admin' },
  ],
})

// 管理员登录守卫
router.beforeEach((to) => {
  const token = localStorage.getItem('zy_admin_token')
  if (!token && to.name !== 'adminLogin') return { name: 'adminLogin' }
  if (token && to.name === 'adminLogin') return { name: 'adminDashboard' }
  return true
})

export default router
