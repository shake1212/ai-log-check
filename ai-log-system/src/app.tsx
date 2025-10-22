// Umi 4 运行时配置
// 注意：Umi 4 的运行时配置与 Umi 3 不同，这里只保留基本配置

// 初始化状态
export async function getInitialState() {
  // 从localStorage获取用户信息
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token) {
    // 只要有 token 即认为已登录；user 可选
    try {
      const user = userStr ? JSON.parse(userStr) : undefined;
      return {
        user,
        token,
        isAuthenticated: true,
      };
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return {
        token,
        isAuthenticated: true,
      };
    }
  }

  return { isAuthenticated: false };
}

// 导出插件对象，避免插件注册错误
export default {};