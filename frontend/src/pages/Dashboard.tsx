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
  DollarOutlined, 
  TrophyOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const { Title } = Typography;

interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  totalOpportunities: number;
  totalRevenue: number;
}

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  time: string;
  avatar: string;
}

interface Opportunity {
  key: string;
  company: string;
  contact: string;
  value: string;
  stage: string;
  probability: number;
  tags: string[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalCompanies: 0,
    totalOpportunities: 0,
    totalRevenue: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<Opportunity[]>([]);
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

      setStats({
        totalContacts: contactsRes.data.total || 0,
        totalCompanies: companiesRes.data.total || 0,
        totalOpportunities: 47, // Mock data
        totalRevenue: 125000 // Mock data
      });

      // Mock recent activities
      setRecentActivities([
        {
          id: 1,
          type: 'contact',
          title: 'New contact added',
          description: 'John Doe from Tech Corp',
          time: '2 hours ago',
          avatar: 'JD'
        },
        {
          id: 2,
          type: 'opportunity',
          title: 'Opportunity updated',
          description: 'Enterprise deal moved to negotiation',
          time: '4 hours ago',
          avatar: 'ED'
        },
        {
          id: 3,
          type: 'social',
          title: 'Social lead discovered',
          description: 'New lead from LinkedIn campaign',
          time: '6 hours ago',
          avatar: 'SL'
        }
      ]);

      // Mock top opportunities
      setTopOpportunities([
        {
          key: '1',
          company: 'Tech Corp',
          contact: 'John Doe',
          value: '$50,000',
          stage: 'Negotiation',
          probability: 75,
          tags: ['Enterprise', 'Hot']
        },
        {
          key: '2',
          company: 'Innovation Inc',
          contact: 'Jane Smith',
          value: '$30,000',
          stage: 'Proposal',
          probability: 60,
          tags: ['Mid-market']
        },
        {
          key: '3',
          company: 'Startup XYZ',
          contact: 'Bob Johnson',
          value: '$15,000',
          stage: 'Discovery',
          probability: 40,
          tags: ['Startup', 'Warm']
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const opportunityColumns = [
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (probability: number) => (
        <Progress percent={probability} size="small" />
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space>
          {tags.map(tag => (
            <Tag key={tag} color={tag === 'Hot' ? 'red' : tag === 'Warm' ? 'orange' : 'blue'}>
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button size="small" icon={<EyeOutlined />}>
          View
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
              title="Active Opportunities"
              value={stats.totalOpportunities}
              prefix={<TrophyOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pipeline Value"
              value={stats.totalRevenue}
              precision={0}
              prefix={<DollarOutlined />}
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
                        <div>{item.description}</div>
                        <small style={{ color: '#999' }}>{item.time}</small>
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
                icon={<PlusOutlined />} 
                block 
                size="large"
                onClick={() => navigate('/contacts')}
              >
                Add New Contact
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                block 
                size="large"
                onClick={() => navigate('/companies')}
              >
                Add New Company
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                block 
                size="large"
              >
                Create Opportunity
              </Button>
              <Divider />
              <Button 
                block 
                onClick={() => navigate('/social-monitor')}
              >
                Social Media Monitor
              </Button>
              <Button 
                block
              >
                Generate Report
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Pipeline Overview */}
        <Col xs={24} lg={8}>
          <Card title="Pipeline Overview" style={{ height: '400px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ marginBottom: '8px' }}>Discovery (15 deals)</div>
                <Progress percent={30} strokeColor="#52c41a" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Qualification (12 deals)</div>
                <Progress percent={25} strokeColor="#1890ff" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Proposal (8 deals)</div>
                <Progress percent={20} strokeColor="#faad14" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Negotiation (6 deals)</div>
                <Progress percent={15} strokeColor="#ff7a45" />
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Closed Won (6 deals)</div>
                <Progress percent={10} strokeColor="#52c41a" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Top Opportunities Table */}
      <Card 
        title="Top Opportunities" 
        style={{ marginTop: '24px' }}
        extra={<Button type="link">View All Opportunities</Button>}
      >
        <Table
          columns={opportunityColumns}
          dataSource={topOpportunities}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Dashboard;
