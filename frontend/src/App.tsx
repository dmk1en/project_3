import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Button, Typography } from 'antd';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import UserProfile from './pages/UserProfile';
import PDLLeads from './pages/PDLLeads';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import { useAppDispatch } from './hooks';
import { logout } from './features/auth/authSlice';
import { RootState } from './store';
import './App.css';

const { Header, Content } = Layout;
const { Text } = Typography;

function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => {
        navigate('/profile');
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => {
        // TODO: Navigate to settings page when created
        console.log('Settings clicked');
      }
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout
    }
  ];

  const menuItems = [
    {
      key: '1',
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '2',
      label: <Link to="/contacts">Contacts</Link>,
    },
    {
      key: '3',
      label: <Link to="/companies">Companies</Link>,
    },
    {
      key: '4',
      label: <Link to="/pdl-leads">PDL Leads</Link>,
    },
    // Only show admin menu for users with admin permission
    ...((auth.user?.role === 'admin' && (auth.user?.permissions?.includes('admin') || auth.user?.role === 'admin')) ? [{
      key: '5',
      label: <Link to="/admin">Admin Dashboard</Link>,
    }] : []),
  ];

  // Get current selected menu key based on pathname
  const getCurrentMenuKey = () => {
    const pathname = location.pathname;
    switch (pathname) {
      case '/':
        return ['1'];
      case '/contacts':
        return ['2'];
      case '/companies':
        return ['3'];
      case '/pdl-leads':
        return ['4'];
      case '/admin':
        return ['5'];
      default:
        return [];
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {auth.isAuthenticated && (
        <Header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div 
              style={{ 
                color: 'white', 
                fontSize: '20px', 
                fontWeight: 'bold',
                marginRight: '24px'
              }}
            >
              CRM System
            </div>
            <Menu 
              theme="dark" 
              mode="horizontal" 
              selectedKeys={getCurrentMenuKey()} 
              items={menuItems}
              style={{ 
                flex: 1, 
                minWidth: 0,
                borderBottom: 'none'
              }}
            />
          </div>

          <Space>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              Welcome back
            </Text>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button 
                type="text" 
                style={{ 
                  color: 'white',
                  height: 'auto',
                  padding: '4px 8px'
                }}
              >
                <Space>
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <span>
                    {auth.user?.firstName} {auth.user?.lastName}
                  </span>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
      )}
      
      <Content style={{ padding: auth.isAuthenticated ? '24px' : '0' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route 
            path="/contacts" 
            element={<PrivateRoute><Contacts /></PrivateRoute>} 
          />
          <Route 
            path="/companies" 
            element={<PrivateRoute><Companies /></PrivateRoute>} 
          />

          <Route 
            path="/profile" 
            element={<PrivateRoute><UserProfile /></PrivateRoute>} 
          />
          <Route 
            path="/pdl-leads" 
            element={<PrivateRoute><PDLLeads /></PrivateRoute>} 
          />
          <Route 
            path="/admin" 
            element={<AdminRoute><AdminDashboard /></AdminRoute>} 
          />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
