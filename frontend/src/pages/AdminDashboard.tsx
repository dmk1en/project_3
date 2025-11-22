import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Spin
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  TeamOutlined,
  CrownOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import {
  useGetUserStatsQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useToggleUserStatusMutation,
  useGetRolePermissionsQuery,
  User,
  CreateUserRequest,
  UpdateUserRequest
} from '../services/adminApi';
import { getErrorMessage } from '../utils/errorUtils';

const { Title } = Typography;
const { Option } = Select;

const AdminDashboard: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    role: '',
    status: ''
  });
  const [form] = Form.useForm();

  // API queries and mutations
  const { data: stats, isLoading: statsLoading } = useGetUserStatsQuery();
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    refetch: refetchUsers 
  } = useGetUsersQuery(searchParams);
  
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();

  const handleRoleChange = async (selectedRole: string) => {
    try {
      // Fetch default permissions for the selected role
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/admin/roles/${selectedRole}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const permissions = result.success ? result.data.permissions : result.permissions;
        
        // Update the form with default permissions
        form.setFieldsValue({
          permissions: permissions
        });
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Administrator', color: 'red' },
    { value: 'manager', label: 'Manager', color: 'blue' },
    { value: 'user', label: 'User', color: 'green' },
    { value: 'viewer', label: 'Viewer', color: 'orange' },
    { value: 'sales_rep', label: 'Sales Representative', color: 'purple' },
    { value: 'analyst', label: 'Analyst', color: 'cyan' }
  ];

  const permissionOptions = [
    'read_leads',
    'update_leads', 
    'delete_leads',
    'pdl_search',
    'manage_contacts',
    'manage_companies',
    'admin'
  ];

  const users = usersData?.users || [];
  const total = usersData?.total || 0;

  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();
      message.success('User deleted successfully');
    } catch (error: any) {
      message.error(getErrorMessage(error, 'Failed to delete user'));
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      await toggleUserStatus(userId).unwrap();
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      message.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    } catch (error: any) {
      message.error(getErrorMessage(error, 'Failed to update user status'));
    }
  };

  const handleSubmit = async (values: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (editingUser) {
        await updateUser({ 
          id: editingUser.id, 
          userData: values as UpdateUserRequest 
        }).unwrap();
        message.success('User updated successfully');
      } else {
        await createUser(values as CreateUserRequest).unwrap();
        message.success('User created successfully');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(getErrorMessage(error, editingUser ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: User) => (
        <Space>
          <UserOutlined />
          {`${record.firstName} ${record.lastName}`}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleConfig = roleOptions.find(r => r.value === role);
        return (
          <Tag color={roleConfig?.color} icon={role === 'admin' ? <CrownOutlined /> : <UserOutlined />}>
            {roleConfig?.label || role}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          active: 'green',
          inactive: 'orange',
          suspended: 'red'
        };
        return <Tag color={colors[status as keyof typeof colors]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          />
          <Button
            type="text"
            size="small"
            icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
            onClick={() => handleToggleStatus(record.id, record.status)}
            style={{ color: record.status === 'active' ? '#ff4d4f' : '#52c41a' }}
          />
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{ color: '#ff4d4f' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <TeamOutlined /> Admin Dashboard
        </Title>
        <p>Manage user accounts, roles, and permissions</p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Spin spinning={statsLoading}>
              <Statistic
                title="Total Users"
                value={stats?.totalUsers || 0}
                prefix={<UserOutlined />}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Spin spinning={statsLoading}>
              <Statistic
                title="Active Users"
                value={stats?.activeUsers || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Spin spinning={statsLoading}>
              <Statistic
                title="Administrators"
                value={stats?.adminUsers || 0}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Spin spinning={statsLoading}>
              <Statistic
                title="Suspended"
                value={stats?.suspendedUsers || 0}
                prefix={<LockOutlined />}
                valueStyle={{ color: '#d46b08' }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card
        title="User Management"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchUsers()}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </Space>
        }
      >
        {/* Search and Filters */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Input.Search
                placeholder="Search users..."
                value={searchParams.search}
                onChange={(e) => setSearchParams(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                onSearch={() => {}}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Filter by role"
                value={searchParams.role || undefined}
                onChange={(value) => setSearchParams(prev => ({ ...prev, role: value || '', page: 1 }))}
                allowClear
                style={{ width: '100%' }}
              >
                {roleOptions.map(role => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Filter by status"
                value={searchParams.status || undefined}
                onChange={(value) => setSearchParams(prev => ({ ...prev, status: value || '', page: 1 }))}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
                <Option value="suspended">Suspended</Option>
              </Select>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={usersLoading}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            onChange: (page, pageSize) => {
              setSearchParams(prev => ({ ...prev, page, pageSize: pageSize || 10 }));
            },
          }}
        />
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Create New User'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingUser ? 'Update' : 'Create'}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'First name is required' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Last name is required' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Role is required' }]}
              >
                <Select 
                  placeholder="Select role"
                  onChange={handleRoleChange}
                >
                  {roleOptions.map(role => (
                    <Option key={role.value} value={role.value}>
                      {role.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: 'Status is required' }]}
              >
                <Select placeholder="Select status">
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="suspended">Suspended</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Permissions"
            name="permissions"
            help="Select the permissions for this user"
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
              style={{ width: '100%' }}
            >
              {permissionOptions.map(permission => (
                <Option key={permission} value={permission}>
                  {permission.replace('_', ' ').toUpperCase()}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Password is required' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;