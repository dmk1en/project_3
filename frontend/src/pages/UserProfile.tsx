import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Divider,
  Tag,
  Avatar,
  message,
  Row,
  Col
} from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAppDispatch } from '../hooks';
import { updateUserProfile, getUserProfile } from '../features/auth/authSlice';

const { Title, Text } = Typography;

const UserProfile: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  React.useEffect(() => {
    // Only fetch if we don't have user data
    if (!auth.user) {
      dispatch(getUserProfile());
    }
  }, [dispatch]); // Only depend on dispatch to avoid loops

  React.useEffect(() => {
    // Update form values when user data changes
    if (auth.user) {
      form.setFieldsValue({
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
        email: auth.user.email,
      });
    }
  }, [auth.user, form]);

  const handleSave = async (values: { firstName: string; lastName: string }) => {
    try {
      await dispatch(updateUserProfile(values));
      message.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      message.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (auth.user) {
      form.setFieldsValue({
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      });
    }
    setIsEditing(false);
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'red',
      manager: 'blue',
      sales_rep: 'green',
      analyst: 'orange'
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  const getRoleDisplayName = (role: string) => {
    const displayNames = {
      admin: 'Administrator',
      manager: 'Manager',
      sales_rep: 'Sales Representative',
      analyst: 'Analyst'
    };
    return displayNames[role as keyof typeof displayNames] || role;
  };

  // Show loading spinner while fetching profile data
  if (auth.loading && !auth.user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Typography.Title level={4}>Loading Profile...</Typography.Title>
        </Card>
      </div>
    );
  }

  // Show error if profile fetch failed
  if (auth.error && !auth.user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Typography.Title level={4} type="danger">
            Failed to Load Profile
          </Typography.Title>
          <Typography.Text>{auth.error}</Typography.Text>
          <br />
          <Button 
            type="primary" 
            onClick={() => dispatch(getUserProfile())}
            style={{ marginTop: '16px' }}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // If no user data and not loading, show not found
  if (!auth.user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Typography.Title level={4}>No Profile Data</Typography.Title>
          <Typography.Text>Unable to load user profile information.</Typography.Text>
          <br />
          <Button 
            type="primary" 
            onClick={() => dispatch(getUserProfile())}
            style={{ marginTop: '16px' }}
          >
            Load Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Card>
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar 
                size={120} 
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff', marginBottom: 16 }}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {auth.user.firstName} {auth.user.lastName}
                </Title>
                <Text type="secondary">{auth.user.email}</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={getRoleColor(auth.user.role)}>
                    {getRoleDisplayName(auth.user.role)}
                  </Tag>
                </div>
              </div>
            </div>
          </Col>

          <Col span={18}>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Title level={3} style={{ margin: 0 }}>Profile Information</Title>
                {!isEditing && (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Space>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              disabled={!isEditing}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="First Name"
                    name="firstName"
                    rules={[
                      { required: true, message: 'Please enter your first name' },
                      { min: 2, message: 'First name must be at least 2 characters' }
                    ]}
                  >
                    <Input placeholder="Enter your first name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Last Name"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Please enter your last name' },
                      { min: 2, message: 'Last name must be at least 2 characters' }
                    ]}
                  >
                    <Input placeholder="Enter your last name" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Email Address" name="email">
                <Input disabled placeholder="Email address" />
              </Form.Item>

              <Form.Item label="Role">
                <Input 
                  value={getRoleDisplayName(auth.user.role)} 
                  disabled 
                />
              </Form.Item>

              {isEditing && (
                <>
                  <Divider />
                  <Form.Item>
                    <Space>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        loading={auth.loading}
                        icon={<SaveOutlined />}
                      >
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel}>
                        Cancel
                      </Button>
                    </Space>
                  </Form.Item>
                </>
              )}
            </Form>

            {!isEditing && (
              <>
                <Divider />
                <div>
                  <Title level={4}>Account Information</Title>
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Text strong>Account Status:</Text>
                    </Col>
                    <Col span={12}>
                      <Tag color={auth.user.isActive ? 'green' : 'red'}>
                        {auth.user.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                    </Col>

                    <Col span={12}>
                      <Text strong>Email Verified:</Text>
                    </Col>
                    <Col span={12}>
                      <Tag color={auth.user.emailVerified ? 'green' : 'orange'}>
                        {auth.user.emailVerified ? 'Verified' : 'Pending'}
                      </Tag>
                    </Col>

                    <Col span={12}>
                      <Text strong>Member Since:</Text>
                    </Col>
                    <Col span={12}>
                      <Text>{new Date(auth.user.createdAt).toLocaleDateString()}</Text>
                    </Col>

                    {auth.user.lastLogin && (
                      <>
                        <Col span={12}>
                          <Text strong>Last Login:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{new Date(auth.user.lastLogin).toLocaleString()}</Text>
                        </Col>
                      </>
                    )}
                  </Row>
                </div>
              </>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default UserProfile;