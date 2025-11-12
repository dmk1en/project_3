import React from 'react';
import { Layout, Menu } from 'antd';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import SocialMonitor from './pages/SocialMonitor';
import PDLLeads from './pages/PDLLeads';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const { Header, Content } = Layout;

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
  // {
  //   key: '4',
  //   label: <Link to="/social">Social</Link>,
  // },
  {
    key: '5',
    label: <Link to="/pdl-leads">PDL Leads</Link>,
  },
];

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <div className="logo" />
        <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]} items={menuItems} />
      </Header>
      <Content style={{ padding: '24px' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<PrivateRoute>{<Dashboard />}</PrivateRoute>}
          />
          <Route path="/contacts" element={<PrivateRoute>{<Contacts />}</PrivateRoute>} />
          <Route path="/companies" element={<PrivateRoute>{<Companies />}</PrivateRoute>} />
          <Route path="/social" element={<PrivateRoute>{<SocialMonitor />}</PrivateRoute>} />
          <Route path="/pdl-leads" element={<PrivateRoute>{<PDLLeads />}</PrivateRoute>} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
