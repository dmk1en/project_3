import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Space, 
  Modal, 
  Form, 
  Select, 
  Tag, 
  Avatar, 
  Popconfirm,
  message,
  Drawer,
  Row,
  Col,
  Divider,
  Typography,
  List
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { api } from '../services/api';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface Company {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  employees?: number;
  revenue?: number;
  description?: string;
  tags?: string[];
  contacts?: Contact[];
  createdAt: string;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
      message.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      email: company.email,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      zipCode: company.zipCode,
      employees: company.employees,
      revenue: company.revenue,
      description: company.description,
    });
  };

  const handleViewCompany = async (company: Company) => {
    try {
      // Load company details with contacts
      const response = await api.get(`/companies/${company.id}`);
      setSelectedCompany(response.data);
      setIsDrawerVisible(true);
    } catch (error) {
      console.error('Failed to load company details:', error);
      setSelectedCompany(company);
      setIsDrawerVisible(true);
    }
  };

  const handleDeleteCompany = async (companyId: number) => {
    try {
      await api.delete(`/companies/${companyId}`);
      message.success('Company deleted successfully');
      loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
      message.error('Failed to delete company');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      const companyData = {
        name: values.name,
        industry: values.industry,
        website: values.website,
        phone: values.phone,
        email: values.email,
        address: values.address,
        city: values.city,
        state: values.state,
        country: values.country,
        zipCode: values.zipCode,
        employees: values.employees,
        revenue: values.revenue,
        description: values.description,
      };

      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, companyData);
        message.success('Company updated successfully');
      } else {
        await api.post('/companies', companyData);
        message.success('Company created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadCompanies();
    } catch (error) {
      console.error('Failed to save company:', error);
      message.error('Failed to save company');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchText.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchText.toLowerCase()) ||
    company.city?.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatEmployees = (count?: number) => {
    if (!count) return '-';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getCompanySizeTag = (employees?: number) => {
    if (!employees) return null;
    if (employees < 50) return <Tag color="green">Startup</Tag>;
    if (employees < 500) return <Tag color="blue">SMB</Tag>;
    if (employees < 5000) return <Tag color="orange">Mid-Market</Tag>;
    return <Tag color="red">Enterprise</Tag>;
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (company: Company) => (
        <Space>
          <Avatar icon={<BankOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {company.name}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {company.industry}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (company: Company) => (
        <div>
          {company.email && (
            <div style={{ marginBottom: '4px' }}>
              <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              {company.email}
            </div>
          )}
          {company.phone && (
            <div style={{ marginBottom: '4px' }}>
              <PhoneOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              {company.phone}
            </div>
          )}
          {company.website && (
            <div>
              <GlobalOutlined style={{ marginRight: '8px', color: '#faad14' }} />
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (company: Company) => {
        const location = [company.city, company.state, company.country]
          .filter(Boolean)
          .join(', ');
        return location || '-';
      },
    },
    {
      title: 'Size',
      key: 'size',
      render: (company: Company) => (
        <div>
          <div>{formatEmployees(company.employees)} employees</div>
          {getCompanySizeTag(company.employees)}
        </div>
      ),
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => formatCurrency(revenue),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (company: Company) => (
        <Space>
          <Button 
            type="link" 
            icon={<UserOutlined />} 
            onClick={() => handleViewCompany(company)}
          >
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditCompany(company)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this company?"
            onConfirm={() => handleDeleteCompany(company.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title="Companies Management" 
        extra={
          <Space>
            <Search
              placeholder="Search companies..."
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddCompany}
            >
              Add Company
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredCompanies}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} companies`,
          }}
        />
      </Card>

      {/* Add/Edit Company Modal */}
      <Modal
        title={editingCompany ? 'Edit Company' : 'Add New Company'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="industry" label="Industry">
                <Select placeholder="Select industry" allowClear>
                  <Option value="Technology">Technology</Option>
                  <Option value="Healthcare">Healthcare</Option>
                  <Option value="Finance">Finance</Option>
                  <Option value="Manufacturing">Manufacturing</Option>
                  <Option value="Retail">Retail</Option>
                  <Option value="Education">Education</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="website" label="Website">
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item name="address" label="Address">
            <Input placeholder="Enter street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State/Province">
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Enter country" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="zipCode" label="ZIP Code">
                <Input placeholder="Enter ZIP code" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="employees" label="Number of Employees">
                <Input type="number" placeholder="Enter employee count" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="revenue" label="Annual Revenue">
                <Input type="number" placeholder="Enter revenue" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea 
              rows={4} 
              placeholder="Enter company description" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCompany ? 'Update' : 'Create'} Company
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Company Details Drawer */}
      <Drawer
        title="Company Details"
        placement="right"
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width={500}
      >
        {selectedCompany && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar size={80} icon={<BankOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <div style={{ marginTop: '12px' }}>
                <h3>{selectedCompany.name}</h3>
                <p style={{ color: '#666' }}>{selectedCompany.industry}</p>
                {getCompanySizeTag(selectedCompany.employees)}
              </div>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedCompany.email && (
                <div>
                  <strong>Email:</strong>
                  <div>{selectedCompany.email}</div>
                </div>
              )}

              {selectedCompany.phone && (
                <div>
                  <strong>Phone:</strong>
                  <div>{selectedCompany.phone}</div>
                </div>
              )}

              {selectedCompany.website && (
                <div>
                  <strong>Website:</strong>
                  <div>
                    <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.website}
                    </a>
                  </div>
                </div>
              )}

              {(selectedCompany.address || selectedCompany.city) && (
                <div>
                  <strong>Address:</strong>
                  <div>
                    {selectedCompany.address && <div>{selectedCompany.address}</div>}
                    <div>
                      {[selectedCompany.city, selectedCompany.state, selectedCompany.zipCode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    {selectedCompany.country && <div>{selectedCompany.country}</div>}
                  </div>
                </div>
              )}

              {selectedCompany.employees && (
                <div>
                  <strong>Employees:</strong>
                  <div>{formatEmployees(selectedCompany.employees)}</div>
                </div>
              )}

              {selectedCompany.revenue && (
                <div>
                  <strong>Annual Revenue:</strong>
                  <div>{formatCurrency(selectedCompany.revenue)}</div>
                </div>
              )}

              {selectedCompany.description && (
                <div>
                  <strong>Description:</strong>
                  <div>{selectedCompany.description}</div>
                </div>
              )}

              <div>
                <strong>Created:</strong>
                <div>{new Date(selectedCompany.createdAt).toLocaleDateString()}</div>
              </div>
            </Space>

            {selectedCompany.contacts && selectedCompany.contacts.length > 0 && (
              <>
                <Divider />
                <div>
                  <strong style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <TeamOutlined style={{ marginRight: '8px' }} />
                    Contacts ({selectedCompany.contacts.length})
                  </strong>
                  <List
                    size="small"
                    dataSource={selectedCompany.contacts}
                    renderItem={(contact) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar size="small" icon={<UserOutlined />} />}
                          title={`${contact.firstName} ${contact.lastName}`}
                          description={
                            <>
                              <div>{contact.jobTitle}</div>
                              <Text type="secondary">{contact.email}</Text>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </>
            )}

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  setIsDrawerVisible(false);
                  handleEditCompany(selectedCompany);
                }}
              >
                Edit Company
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Companies;