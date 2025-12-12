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
        { 
          path: '/', 
          redirect: '/dashboard',
          exact: true 
        },
        { 
          path: '/test', 
          component: '@/pages/test-page',
          name: 'test',
          icon: 'DashboardOutlined',
        },
        { 
          path: '/debug', 
          component: '@/pages/debug',
          name: 'debug',
          icon: 'DashboardOutlined',
        },
        { 
          path: '/debug-route', 
          component: '@/pages/debug-route',
          name: 'debug-route',
          icon: 'DashboardOutlined',
        },
        { 
          path: '/dashboard', 
          component: '@/components/EnhancedDashboard/',
          name: 'dashboard',
          icon: 'DashboardOutlined',
        },
        {
          path: '/realtime',
          component: '@/pages/realtime/index',
          name: 'realtime',
          icon: 'ThunderboltOutlined',
        },
        { 
          path: '/alerts', 
          component: '@/pages/alerts/alerts',
          name: 'alerts',
          icon: 'AlertOutlined',
        },
        {
          path: '/whitelist',
          component: '@/pages/whitelist/index',
          name: 'whitelist',
          icon: 'CheckCircleOutlined',
        },
        // { 
        //   path: '/logs', 
        //   component: '@/pages/logs',
        //   name: 'logs',
        //   icon: 'FileTextOutlined',
        // },
        { 
          path: '/models', 
          component: '@/pages/models/index',
          name: 'models',
          icon: 'RobotOutlined',
        },
        {
          path: '/settings',
          component: '@/pages/settings/index',
          name: 'settings',
          icon: 'SettingOutlined',
        },
        {
          path: '/wmi',
          component: '@/pages/wmi/index',
          name: 'wmi',
          icon: 'DatabaseOutlined',
        },
        {
          path: '/systemInfoManagement',
          component: '@/pages/systemInfoManagement/index',
          name: 'systemInfoManagement',
          icon: 'SettingOutlined',
        },
        // {
        //   path: '/database',
        //   component: '@/pages/database/',
        //   name: 'database',
        //   icon: 'DatabaseOutlined',
        // },
        { 
          path: '/system', 
          component: '@/pages/system/index',
          name: 'system',
          icon: 'TeamOutlined',
          access: 'admin',
        },
        { 
          path: '/docs', 
          component: '@/pages/docs',
          name: 'docs',
          icon: 'BookOutlined',
        },
        {
          path: '/profile',
          component: '@/pages/profile',
          name: 'profile',
          hideInMenu: true,
        },
        {
          path: '*',
          component: '@/pages/404',
          layout: false,
        },
      ],
    },
  ],
  npmClient: 'pnpm',
  // 开发代理配置
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    },
  },
  // 主题配置
  theme: {
    '@primary-color': '#1890ff',
    '@link-color': '#1890ff',
    '@success-color': '#52c41a',
    '@warning-color': '#faad14',
    '@error-color': '#f5222d',
    '@font-size-base': '14px',
    '@heading-color': 'rgba(0, 0, 0, 0.85)',
    '@text-color': 'rgba(0, 0, 0, 0.65)',
    '@text-color-secondary': 'rgba(0, 0, 0, 0.45)',
    '@disabled-color': 'rgba(0, 0, 0, 0.25)',
    '@border-radius-base': '6px',
    '@box-shadow-base': '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  // 构建配置
  define: {
    'process.env.NODE_ENV': process.env.NODE_ENV,
  },
  chainWebpack: function (config, { webpack }) {
    config.merge({
      optimization: {
        splitChunks: {
          chunks: 'all',
          minSize: 30000,
          minChunks: 3,
          automaticNameDelimiter: '.',
          cacheGroups: {
            vendor: {
              name: 'vendors',
              test({ resource }) {
                return /[\\/]node_modules[\\/]/.test(resource);
              },
              priority: 10,
            },
          },
        },
      },
    });
  },
});