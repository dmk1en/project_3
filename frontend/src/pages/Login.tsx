import React from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../hooks';
import { login, clearError } from '../features/auth/authSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (auth.isAuthenticated && auth.accessToken) {
      navigate('/');
    }
  }, [auth.isAuthenticated, auth.accessToken, navigate]);

  React.useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const onFinish = (values: { email: string; password: string }) => {
    dispatch(login(values));
  };

  const handleFormChange = () => {
    // Clear error when user starts typing
    if (auth.error) {
      dispatch(clearError());
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: 400,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            CRM System
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        {auth.error && (
          <Alert 
            type="error" 
            message={auth.error} 
            style={{ marginBottom: 16 }}
            closable
            onClose={() => dispatch(clearError())}
          />
        )}

        <Form 
          name="login" 
          onFinish={onFinish}
          onValuesChange={handleFormChange}
          layout="vertical"
          size="large"
        >
          <Form.Item 
            name="email" 
            label="Email Address"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />}
              placeholder="Enter your email"
              disabled={auth.loading}
            />
          </Form.Item>

          <Form.Item 
            name="password" 
            label="Password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 3, message: 'Password must be at least 3 characters!' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              disabled={auth.loading}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={auth.loading}
              size="large"
            >
              {auth.loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            CRM Consulting System v1.0.0
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
