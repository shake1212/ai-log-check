import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useModel } from '@/utils/useModel';
import { history } from 'umi';
import styles from './index.less';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState');

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      console.log('尝试登录:', values);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      console.log('响应状态:', response.status);
      console.log('响应头:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('登录成功:', data);
        
        // 保存用户信息和token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // 更新全局状态
        setInitialState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        });

        message.success('登录成功！');
        // 先更新路由，使用 replace 避免历史栈残留
        history.replace('/dashboard');
        // 兜底：若某些情况下未跳转，微任务后再次尝试
        setTimeout(() => {
          if (location.pathname === '/login') {
            history.replace('/dashboard');
          }
        }, 0);
      } else {
        let errorMessage = '登录失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // 如果无法解析JSON，使用状态码信息
          if (response.status === 401) {
            errorMessage = '用户名或密码错误';
          } else if (response.status === 403) {
            errorMessage = '访问被拒绝';
          } else {
            errorMessage = `请求失败 (${response.status})`;
          }
        }
        console.error('登录失败:', response.status, errorMessage);
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.overlay} />
      </div>
      
      <div className={styles.content}>
        <Card className={styles.loginCard} bordered={false}>
          <div className={styles.header}>
            <SafetyOutlined className={styles.logo} />
            <Title level={2} className={styles.title}>
              AI安全日志系统
            </Title>
            <Text type="secondary" className={styles.subtitle}>
              网络安全日志异常检测与预警系统
            </Text>
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
            className={styles.form}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符!' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6个字符!' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className={styles.loginButton}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            <Space direction="vertical" size="small">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                默认账号: admin / 123456
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                操作员: operator / 123456
              </Text>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
