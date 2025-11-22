import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Space, 
  Tag, 
  Divider,
  Row,
  Col,
  Alert,
  Spin
} from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { getUserProfile, updateUserProfile, clearError } from '../features/auth/authSlice';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    // Fetch the latest profile data when component mounts
    dispatch(getUserProfile() as any);
  }, [dispatch]);

  useEffect(() => {
    // Clear any errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Update form when user data changes
    if (auth.user) {
      form.setFieldsValue({
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
        email: auth.user.email,
      });
    }
  }, [auth.user, form]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (auth.user) {
      form.setFieldsValue({
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
        email: auth.user.email,
      });
    }
    dispatch(clearError());
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setUpdateLoading(true);
      
      const updateData: { firstName?: string; lastName?: string } = {};
      if (values.firstName !== auth.user?.firstName) {
        updateData.firstName = values.firstName;
      }
      if (values.lastName !== auth.user?.lastName) {
        updateData.lastName = values.lastName;
      }

      if (Object.keys(updateData).length > 0) {
        await dispatch(updateUserProfile(updateData) as any);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'red',
      manager: 'orange',
      sales_rep: 'blue',
      analyst: 'green'
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrator',
      manager: 'Manager',
      sales_rep: 'Sales Representative',
      analyst: 'Analyst'
    };
    return labels[role as keyof typeof labels] || role;
  };

  if (auth.loading && !auth.user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Row gutter={24}>
          <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
            <Avatar 
              size={120} 
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: '#1890ff',
                marginBottom: '16px'
              }}
            />
            <div>
              <Title level={4} style={{ margin: '8px 0' }}>
                {auth.user?.firstName} {auth.user?.lastName}
              </Title>
              <Tag color={getRoleColor(auth.user?.role || '')}>
                {getRoleLabel(auth.user?.role || '')}
              </Tag>
              {auth.user?.isActive && (
                <Tag color="green" style={{ marginLeft: '8px' }}>
                  Active
                </Tag>
              )}
            </div>
          </Col>

          <Col xs={24} sm={16}>
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Title level={3} style={{ margin: 0 }}>Profile Information</Title>
                {!isEditing && (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    Edit Profile
                  </Button>
                )}
              </Space>
            </div>

            {auth.error && (
              <Alert 
                type="error" 
                message={auth.error} 
                style={{ marginBottom: '16px' }}
                closable
                onClose={() => dispatch(clearError())}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              disabled={!isEditing}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="First Name"
                    name="firstName"
                    rules={[
                      { required: true, message: 'First name is required' },
                      { max: 100, message: 'First name must be less than 100 characters' }
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Last Name"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Last name is required' },
                      { max: 100, message: 'Last name must be less than 100 characters' }
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Email Address"
                name="email"
              >
                <Input disabled />
              </Form.Item>

              {isEditing && (
                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      loading={updateLoading}
                    >
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>

            <Divider />
            
            <div>
              <Title level={4}>Account Details</Title>
              <Space direction="vertical" size="small">
                <Text><strong>User ID:</strong> {auth.user?.id}</Text>
                <Text><strong>Email Verified:</strong> {auth.user?.emailVerified ? 'Yes' : 'No'}</Text>
                <Text><strong>Account Created:</strong> {auth.user?.createdAt ? new Date(auth.user.createdAt).toLocaleDateString() : 'N/A'}</Text>
                <Text><strong>Last Login:</strong> {auth.user?.lastLogin ? new Date(auth.user.lastLogin).toLocaleString() : 'N/A'}</Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Profile;