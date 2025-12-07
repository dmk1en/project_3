import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  List, 
  Avatar, 
  Button, 
  Table, 
  Tag, 
  Progress,
  Space,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  SearchOutlined, 
  CheckCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const { Title } = Typography;

interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  pendingLeads: number;
  convertedLeads: number;
}

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  time: string;
  avatar: string;
}

interface RecentLead {
  key: string;
  fullName: string;
  company: string;
  leadScore: number;
  status: string;
  source: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalCompanies: 0,
    pendingLeads: 0,
    convertedLeads: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics
      const [contactsRes, companiesRes] = await Promise.all([
        api.get('/contacts?limit=1'),
        api.get('/companies?limit=1')
      ]);

      // Get pending and converted leads counts
      const [pendingRes, convertedRes, recentLeadsRes] = await Promise.all([
        api.get('/pdl/leads?status=pending_review&limit=1'),
        api.get('/pdl/leads?status=added_to_crm&limit=1'),
        api.get('/pdl/leads?limit=5')
      ]);

      // Debug logging
      console.log('API Responses:', {
        contacts: {
          structure: contactsRes.data,
          totalItems: contactsRes.data?.data?.pagination?.totalItems
        },
        companies: {
          structure: companiesRes.data,
          totalItems: companiesRes.data?.data?.pagination?.totalItems
        },
        pending: {
          structure: pendingRes.data,
          totalItems: pendingRes.data?.data?.pagination?.totalItems
        },
        converted: {
          structure: convertedRes.data,
          totalItems: convertedRes.data?.data?.pagination?.totalItems
        }
      });

      const totalContacts = Number(contactsRes.data?.data?.pagination?.totalItems || 0);
      const totalCompanies = Number(companiesRes.data?.data?.pagination?.totalItems || 0);
      const pendingLeads = Number(pendingRes.data?.data?.pagination?.totalItems || 0);
      const convertedLeads = Number(convertedRes.data?.data?.pagination?.totalItems || 0);
      
      setStats({
        totalContacts,
        totalCompanies,
        pendingLeads,
        convertedLeads
      });

      const leadsList = recentLeadsRes.data?.data?.leads || recentLeadsRes.data?.leads || [];
      setRecentLeads(leadsList.map((lead: any, index: number) => ({
        key: lead.id || `lead-${index}`,
        fullName: lead.fullName || 'Unknown Name',
        company: lead.companyName || 'Unknown Company',
        leadScore: lead.leadScore || 0,
        status: lead.status || 'unknown',
        source: lead.isManual ? 'Manual' : 'PDL Discovery',
        createdAt: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Unknown'
      })));

      // Update recent activities with real stats
      setRecentActivities([
        {
          id: 1,
          type: 'lead',
          title: 'PDL Lead Discovery',
          description: `${pendingLeads} leads pending review`,
          time: 'Updated now',
          avatar: 'PL'
        },
        {
          id: 2,
          type: 'conversion',
          title: 'CRM Conversions',
          description: `${convertedLeads} leads converted to contacts`,
          time: 'Updated now',
          avatar: 'LC'
        },
        {
          id: 3,
          type: 'contacts',
          title: 'Total Contacts',
          description: `${totalContacts} contacts in CRM system`,
          time: 'Updated now',
          avatar: 'TC'
        }
      ]);



    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      
      // Set some default values to prevent UI issues
      setStats({
        totalContacts: 0,
        totalCompanies: 0,
        pendingLeads: 0,
        convertedLeads: 0
      });
      
      setRecentActivities([
        {
          id: 1,
          type: 'error',
          title: 'Data Loading Error',
          description: 'Unable to load dashboard statistics',
          time: 'Just now',
          avatar: 'ER'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const recentLeadsColumns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Lead Score',
      dataIndex: 'leadScore',
      key: 'leadScore',
      render: (score: number) => (
        <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>
          {score}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          'pending_review': 'orange',
          'added_to_crm': 'green',
          'rejected': 'red',
          'duplicate': 'blue'
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={source === 'Manual' ? 'blue' : 'purple'}>
          {source}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate('/lead-review')}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Dashboard</Title>
        <p>Welcome back! Here's what's happening with your CRM today.</p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Contacts"
              value={stats.totalContacts}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={stats.totalCompanies}
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Leads"
              value={stats.pendingLeads}
              prefix={<SearchOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Converted Leads"
              value={stats.convertedLeads}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Recent Activities */}
        <Col xs={24} lg={8}>
          <Card 
            title="Recent Activities" 
            extra={<Button type="link">View All</Button>}
            style={{ height: '400px' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivities}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{item.avatar}</Avatar>}
                    title={item.title}
                    description={
                      <>
                        <div>{String(item.description || '')}</div>
                        <small style={{ color: '#999' }}>{String(item.time || '')}</small>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ height: '400px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<SearchOutlined />} 
                block 
                size="large"
                onClick={() => navigate('/pdl-discovery')}
              >
                Discover New Leads
              </Button>
              <Button 
                icon={<EyeOutlined />} 
                block 
                size="large"
                onClick={() => navigate('/lead-review')}
              >
                Review Leads
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                block 
                size="large"
                onClick={() => navigate('/contacts')}
              >
                Add Manual Contact
              </Button>
              <Divider />
              <Button 
                block 
                onClick={() => navigate('/companies')}
              >
                Manage Companies
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Lead Status Overview */}
        <Col xs={24} lg={8}>
          <Card title="Lead Status Overview" style={{ height: '400px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ marginBottom: '8px' }}>Pending Review ({Number(stats.pendingLeads) || 0})</div>
                <Progress percent={Number(stats.pendingLeads) > 0 ? Math.min(Number(stats.pendingLeads), 100) : 0} strokeColor="#faad14" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Converted to CRM ({Number(stats.convertedLeads) || 0})</div>
                <Progress percent={Number(stats.convertedLeads) > 0 ? Math.min(Number(stats.convertedLeads), 100) : 0} strokeColor="#52c41a" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Manual Leads</div>
                <Progress percent={15} strokeColor="#1890ff" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Total Contacts ({Number(stats.totalContacts) || 0})</div>
                <Progress percent={Number(stats.totalContacts) > 0 ? Math.min(Number(stats.totalContacts), 100) : 0} strokeColor="#722ed1" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Companies ({Number(stats.totalCompanies) || 0})</div>
                <Progress percent={Number(stats.totalCompanies) > 0 ? Math.min(Number(stats.totalCompanies), 100) : 0} strokeColor="#13c2c2" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recent Leads Table */}
      <Card 
        title="Recent Leads" 
        style={{ marginTop: '24px' }}
        extra={<Button type="link" onClick={() => navigate('/pdl-leads')}>View All Leads</Button>}
      >
        <Table
          columns={recentLeadsColumns}
          dataSource={recentLeads}
          pagination={false}
          size="middle"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
