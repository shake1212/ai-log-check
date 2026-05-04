import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useModel } from '@/utils/useModel';
import { history, useLocation } from 'umi';
import styles from './index.less';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState');
  const isMountedRef = useRef(true);
  const location = useLocation();

  // Cleanup: Set mounted flag to false when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 粒子动画效果
  useEffect(() => {
    const canvas = document.getElementById('particles') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }> = [];

    // 创建粒子
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    let animationFrameId: number;

    function animate() {
      // Check if component is still mounted before continuing animation
      if (!ctx || !canvas || !isMountedRef.current) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.fill();

        // 连接附近的粒子
        particles.slice(i + 1).forEach((p2) => {
          const dx = particle.x - p2.x;
          const dy = particle.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.2 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      // Check if component is still mounted before updating canvas
      if (!isMountedRef.current) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // Cancel animation frame on cleanup
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setInitialState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        });

        message.success('登录成功！');
        
        // Handle redirect
        const searchParams = new URLSearchParams(location.search);
        const redirect = searchParams.get('redirect');
        
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
          // Valid internal redirect
          history.replace(redirect);
        } else {
          // Default redirect
          history.replace('/dashboard');
        }
      } else {
        let errorMessage = '登录失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          if (response.status === 401) {
            errorMessage = '用户名或密码错误';
          } else if (response.status === 403) {
            errorMessage = '访问被拒绝';
          } else {
            errorMessage = `请求失败 (${response.status})`;
          }
        }
        
        // Check if component is still mounted before showing error
        if (!isMountedRef.current) return;
        message.error(errorMessage);
      }
    } catch (error) {
      // Check if component is still mounted before showing error
      if (!isMountedRef.current) return;
      console.error('Login error:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* 动态背景 */}
      <div className={styles.background}>
        <canvas id="particles" className={styles.particles} />
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gradientOrb3} />
      </div>

      {/* 登录卡片 */}
      <div className={styles.content}>
        <div className={styles.loginCard}>
          {/* 顶部装饰 */}
          <div className={styles.cardDecoration} />
          
          {/* Logo区域 */}
          <div className={styles.logoSection}>
            <div className={styles.logoWrapper}>
              <SafetyOutlined className={styles.logo} />
              <div className={styles.logoGlow} />
            </div>
            <Title level={2} className={styles.title}>
              AI 安全日志系统
            </Title>
            <Text className={styles.subtitle}>
              <ThunderboltOutlined /> 网络安全日志异常检测与预警
            </Text>
          </div>

          {/* 登录表单 */}
          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            className={styles.form}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <div className={styles.inputWrapper}>
                <UserOutlined className={styles.inputIcon} />
                <Input
                  placeholder="用户名"
                  className={styles.input}
                  size="large"
                />
              </div>
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <div className={styles.inputWrapper}>
                <LockOutlined className={styles.inputIcon} />
                <Input.Password
                  placeholder="密码"
                  className={styles.input}
                  size="large"
                />
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className={styles.loginButton}
                size="large"
                block
              >
                {loading ? '登录中...' : '立即登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 底部信息 */}
          <div className={styles.footer}>
            <div className={styles.divider}>
              <span>测试账号</span>
            </div>
            <div className={styles.accountInfo}>
              <div className={styles.accountItem}>
                <span className={styles.accountLabel}>管理员</span>
                <span className={styles.accountValue}>admin / 123456</span>
              </div>
              <div className={styles.accountItem}>
                <span className={styles.accountLabel}>操作员</span>
                <span className={styles.accountValue}>operator / 123456</span>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className={styles.copyright}>
          <Text className={styles.copyrightText}>
            © 2026 AI Security Log System. All rights reserved.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
