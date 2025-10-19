import React from 'react';
import { Form, Input, Button, Card, Alert } from 'antd';
import { useAppDispatch } from '../hooks';
import { login } from '../features/auth/authSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (auth.token) navigate('/');
  }, [auth.token, navigate]);

  const onFinish = (values: any) => {
    dispatch(login(values) as any);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <Card title="Sign in" style={{ width: 360 }}>
        {auth.error && <Alert type="error" message={auth.error} style={{ marginBottom: 12 }} />}
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please input your email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please input your password' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={auth.loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
