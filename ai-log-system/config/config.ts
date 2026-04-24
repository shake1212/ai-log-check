import { defineConfig } from 'umi';

export default defineConfig({
  title: 'AI网络安全日志异常检测与预警系统',
  routes: [
    {
      path: '/login',
      component: '@/pages/login',
      layout: false,
    },
    {
      path: '/',
      component: '@/layouts/index',
      wrappers: ['@/wrappers/auth'],
      routes: [
        { path: '/', redirect: '/dashboard', exact: true },
        { path: '/dashboard', component: '@/components/EnhancedDashboard/', name: 'dashboard', icon: 'DashboardOutlined' },
        { path: '/alerts', component: '@/pages/alerts/alerts', name: 'alerts', icon: 'AlertOutlined' },
        { path: '/events', component: '@/pages/events/index', name: 'events', icon: 'AuditOutlined' },
        { path: '/wmi', component: '@/pages/wmi/index', name: 'system-monitor', icon: 'MonitorOutlined' },
        { path: '/log-collector', component: '@/pages/log-collector', name: 'log-collector', icon: 'LineChartOutlined' },
        { path: '/rules', component: '@/pages/rules/index', name: 'rules', icon: 'SafetyOutlined' },
        { path: '/system', component: '@/pages/system/index', name: 'system', icon: 'TeamOutlined', access: 'admin' },
        { path: '/profile', component: '@/pages/profile', name: 'profile', hideInMenu: true },
        { path: '*', component: '@/pages/404', layout: false },
      ],
    },
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true, pathRewrite: { '^/api': '/api' } },
  },
  theme: {
    '@primary-color': '#1890ff',
    '@link-color': '#1890ff',
    '@success-color': '#52c41a',
    '@warning-color': '#faad14',
    '@error-color': '#f5222d',
    '@font-size-base': '14px',
  },
  define: { 'process.env.NODE_ENV': process.env.NODE_ENV },
});
