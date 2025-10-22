import { defineConfig } from 'umi';

export default defineConfig({
  title: 'AI网络安全日志异常检测与预警系统',
  routes: [
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '/', component: '@/pages/index' },
        { path: '/dashboard', component: '@/pages/dashboard/index' },
        { path: '/alerts', component: '@/pages/alerts/index' },
        { path: '/logs', component: '@/pages/logs/index' },
        { path: '/settings', component: '@/pages/settings/index' },
        { path: '/system', component: '@/pages/system/index' },
      ],
    },
  ],
  npmClient: 'pnpm',
}); 