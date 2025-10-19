import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Input, 
  Button, 
  Space, 
  Row, 
  Col, 
  Avatar, 
  Typography,
  Tabs,
  Statistic,
  Badge,
  Select,
  DatePicker,
  Table,
  Modal,
  Form,
  message,
  Divider,
  Progress
} from 'antd';
import { 
  TwitterOutlined, 
  LinkedinOutlined, 
  SearchOutlined,
  UserAddOutlined,
  HeartOutlined,
  MessageOutlined,
  RetweetOutlined,
  EyeOutlined,
  PlusOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { api } from '../services/api';

const { Search } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface SocialPost {
  id: string;
  platform: 'twitter' | 'linkedin';
  user: string;
  userDisplayName: string;
  avatar?: string;
  content: string;
  timestamp: string;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  tags: string[];
  leadScore: number;
  isLead: boolean;
  industry?: string;
  location?: string;
}

interface LeadProfile {
  id: string;
  name: string;
  handle: string;
  platform: 'twitter' | 'linkedin';
  avatar?: string;
  followerCount: number;
  industry?: string;
  location?: string;
  leadScore: number;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  lastActivity: string;
  posts: number;
}

const SocialMonitor: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [leads, setLeads] = useState<LeadProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [searchKeywords, setSearchKeywords] = useState<string[]>(['CRM', 'sales', 'lead generation']);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'twitter' | 'linkedin'>('all');
  const [isKeywordModalVisible, setIsKeywordModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSocialData();
  }, [selectedPlatform, searchKeywords]);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockPosts: SocialPost[] = [
        {
          id: '1',
          platform: 'twitter',
          user: 'john_startup',
          userDisplayName: 'John from TechCorp',
          content: 'Looking for a robust CRM solution that can scale with our startup. Any recommendations? #CRM #startup #sales',
          timestamp: '2024-10-19T10:30:00Z',
          engagement: { likes: 24, shares: 8, comments: 12, views: 1200 },
          tags: ['CRM', 'startup', 'sales'],
          leadScore: 85,
          isLead: true,
          industry: 'Technology',
          location: 'San Francisco, CA'
        },
        {
          id: '2',
          platform: 'linkedin',
          user: 'sarah_sales',
          userDisplayName: 'Sarah Johnson - VP Sales',
          content: 'Our sales team has grown 300% this year. Time to invest in better lead management tools. What do you recommend?',
          timestamp: '2024-10-19T09:15:00Z',
          engagement: { likes: 45, shares: 18, comments: 23 },
          tags: ['sales', 'lead management', 'growth'],
          leadScore: 92,
          isLead: true,
          industry: 'SaaS',
          location: 'Austin, TX'
        },
        {
          id: '3',
          platform: 'twitter',
          user: 'mike_founder',
          userDisplayName: 'Mike Chen - Founder',
          content: 'Just closed our Series A! Now we need to professionalize our sales process. Any CRM recommendations for B2B SaaS?',
          timestamp: '2024-10-19T08:45:00Z',
          engagement: { likes: 67, shares: 34, comments: 28, views: 2100 },
          tags: ['Series A', 'CRM', 'B2B', 'SaaS'],
          leadScore: 98,
          isLead: true,
          industry: 'SaaS',
          location: 'New York, NY'
        },
        {
          id: '4',
          platform: 'linkedin',
          user: 'enterprise_exec',
          userDisplayName: 'David Kim - CTO',
          content: 'Evaluating social media monitoring tools for lead generation. The ROI potential looks promising.',
          timestamp: '2024-10-19T07:20:00Z',
          engagement: { likes: 32, shares: 12, comments: 8 },
          tags: ['social media', 'lead generation', 'ROI'],
          leadScore: 78,
          isLead: true,
          industry: 'Enterprise',
          location: 'Seattle, WA'
        }
      ];

      const mockLeads: LeadProfile[] = [
        {
          id: '1',
          name: 'John from TechCorp',
          handle: '@john_startup',
          platform: 'twitter',
          followerCount: 2500,
          industry: 'Technology',
          location: 'San Francisco, CA',
          leadScore: 85,
          status: 'new',
          lastActivity: '2 hours ago',
          posts: 1
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          handle: 'sarah_sales',
          platform: 'linkedin',
          followerCount: 8900,
          industry: 'SaaS',
          location: 'Austin, TX',
          leadScore: 92,
          status: 'contacted',
          lastActivity: '3 hours ago',
          posts: 1
        },
        {
          id: '3',
          name: 'Mike Chen',
          handle: '@mike_founder',
          platform: 'twitter',
          followerCount: 15400,
          industry: 'SaaS',
          location: 'New York, NY',
          leadScore: 98,
          status: 'qualified',
          lastActivity: '4 hours ago',
          posts: 1
        }
      ];

      setPosts(mockPosts);
      setLeads(mockLeads);
    } catch (error) {
      console.error('Failed to load social data:', error);
      message.error('Failed to load social media data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLeads = async (post: SocialPost) => {
    try {
      // In a real app, this would call the API to add the lead
      message.success(`Added ${post.userDisplayName} to leads`);
      
      // Update the post to mark as lead
      setPosts(posts.map(p => p.id === post.id ? { ...p, isLead: true } : p));
    } catch (error) {
      message.error('Failed to add lead');
    }
  };

  const handleContactLead = async (leadId: string) => {
    try {
      // In a real app, this would update the lead status
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: 'contacted' } : lead
      ));
      message.success('Lead status updated to contacted');
    } catch (error) {
      message.error('Failed to update lead status');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    if (score >= 50) return '#ff7a45';
    return '#ff4d4f';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'orange';
      case 'qualified': return 'green';
      case 'converted': return 'purple';
      default: return 'default';
    }
  };

  const filteredPosts = posts.filter(post => 
    selectedPlatform === 'all' || post.platform === selectedPlatform
  );

  const postColumns = [
    {
      title: 'User',
      key: 'user',
      render: (post: SocialPost) => (
        <Space>
          <Avatar 
            icon={post.platform === 'twitter' ? <TwitterOutlined /> : <LinkedinOutlined />}
            style={{ backgroundColor: post.platform === 'twitter' ? '#1DA1F2' : '#0077B5' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{post.userDisplayName}</div>
            <Text type="secondary">@{post.user}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Content',
      key: 'content',
      render: (post: SocialPost) => (
        <div>
          <div style={{ marginBottom: '8px' }}>{post.content}</div>
          <Space>
            {post.tags.map(tag => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
          </Space>
        </div>
      ),
    },
    {
      title: 'Engagement',
      key: 'engagement',
      render: (post: SocialPost) => (
        <Space direction="vertical" size="small">
          <Space>
            <HeartOutlined /> {post.engagement.likes}
            <RetweetOutlined /> {post.engagement.shares}
            <MessageOutlined /> {post.engagement.comments}
          </Space>
          {post.engagement.views && (
            <Space>
              <EyeOutlined /> {post.engagement.views}
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Lead Score',
      key: 'score',
      render: (post: SocialPost) => (
        <div>
          <Progress 
            percent={post.leadScore} 
            size="small" 
            strokeColor={getScoreColor(post.leadScore)}
            format={() => `${post.leadScore}%`}
          />
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (post: SocialPost) => (
        <Space>
          {!post.isLead && (
            <Button 
              type="primary" 
              size="small" 
              icon={<UserAddOutlined />}
              onClick={() => handleAddToLeads(post)}
            >
              Add to Leads
            </Button>
          )}
          {post.isLead && (
            <Tag color="green">Lead Added</Tag>
          )}
        </Space>
      ),
    },
  ];

  const leadColumns = [
    {
      title: 'Profile',
      key: 'profile',
      render: (lead: LeadProfile) => (
        <Space>
          <Avatar 
            icon={lead.platform === 'twitter' ? <TwitterOutlined /> : <LinkedinOutlined />}
            style={{ backgroundColor: lead.platform === 'twitter' ? '#1DA1F2' : '#0077B5' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{lead.name}</div>
            <Text type="secondary">{lead.handle}</Text>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {lead.followerCount.toLocaleString()} followers
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      render: (lead: LeadProfile) => (
        <div>
          <div>{lead.industry}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{lead.location}</div>
          <div style={{ color: '#999', fontSize: '11px' }}>
            Last activity: {lead.lastActivity}
          </div>
        </div>
      ),
    },
    {
      title: 'Score',
      key: 'score',
      render: (lead: LeadProfile) => (
        <Progress 
          percent={lead.leadScore} 
          size="small" 
          strokeColor={getScoreColor(lead.leadScore)}
          format={() => `${lead.leadScore}%`}
        />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (lead: LeadProfile) => (
        <Tag color={getStatusColor(lead.status)}>
          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (lead: LeadProfile) => (
        <Space>
          {lead.status === 'new' && (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleContactLead(lead.id)}
            >
              Contact
            </Button>
          )}
          <Button size="small" icon={<EyeOutlined />}>
            View Profile
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Typography.Title level={2}>Social Media Monitor</Typography.Title>
        <p>Discover and track potential customers from social media conversations</p>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Posts Monitored"
              value={posts.length}
              prefix={<SearchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Leads Discovered"
              value={leads.length}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Lead Score"
              value={Math.round(leads.reduce((acc, lead) => acc + lead.leadScore, 0) / leads.length) || 0}
              suffix="%"
              prefix={<Badge />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Conversion Rate"
              value={12.5}
              suffix="%"
              prefix={<Badge />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Select
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              style={{ width: '100%' }}
              placeholder="Select Platform"
            >
              <Option value="all">All Platforms</Option>
              <Option value="twitter">Twitter</Option>
              <Option value="linkedin">LinkedIn</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Search
              placeholder="Search keywords..."
              onSearch={(value) => console.log('Search:', value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <RangePicker style={{ width: '100%' }} />
          </Col>
          <Col xs={24} md={4}>
            <Button 
              icon={<PlusOutlined />}
              onClick={() => setIsKeywordModalVisible(true)}
              block
            >
              Keywords
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Social Feed" key="feed">
            <Table
              columns={postColumns}
              dataSource={filteredPosts}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `${total} posts`,
              }}
            />
          </TabPane>

          <TabPane tab={`Leads (${leads.length})`} key="leads">
            <Table
              columns={leadColumns}
              dataSource={leads}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `${total} leads`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Keyword Management Modal */}
      <Modal
        title="Manage Keywords"
        open={isKeywordModalVisible}
        onCancel={() => setIsKeywordModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Current Keywords:</Text>
          <div style={{ marginTop: '8px' }}>
            {searchKeywords.map(keyword => (
              <Tag 
                key={keyword} 
                closable 
                onClose={() => setSearchKeywords(searchKeywords.filter(k => k !== keyword))}
                style={{ marginBottom: '8px' }}
              >
                {keyword}
              </Tag>
            ))}
          </div>
        </div>

        <Form
          form={form}
          onFinish={(values) => {
            if (values.keyword && !searchKeywords.includes(values.keyword)) {
              setSearchKeywords([...searchKeywords, values.keyword]);
              form.resetFields();
              message.success('Keyword added');
            }
          }}
        >
          <Form.Item
            name="keyword"
            rules={[{ required: true, message: 'Please enter a keyword' }]}
          >
            <Input 
              placeholder="Enter new keyword..."
              suffix={
                <Button type="primary" htmlType="submit" size="small">
                  Add
                </Button>
              }
            />
          </Form.Item>
        </Form>

        <Divider />

        <div>
          <Text strong>Suggested Keywords:</Text>
          <div style={{ marginTop: '8px' }}>
            {['sales automation', 'customer management', 'lead qualification', 'B2B sales', 'startup tools'].map(suggestion => (
              <Tag 
                key={suggestion}
                style={{ cursor: 'pointer', marginBottom: '8px' }}
                onClick={() => {
                  if (!searchKeywords.includes(suggestion)) {
                    setSearchKeywords([...searchKeywords, suggestion]);
                    message.success('Keyword added');
                  }
                }}
              >
                + {suggestion}
              </Tag>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SocialMonitor;
