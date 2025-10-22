import React, { useEffect } from 'react';
import { history } from 'umi';

export default function HomePage() {
  useEffect(() => {
    // 重定向到仪表盘页面
    history.push('/dashboard');
  }, []);
  
  return <div>正在跳转到仪表盘...</div>;
} 