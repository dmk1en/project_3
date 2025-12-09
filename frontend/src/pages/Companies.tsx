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
import { companyService, Company, CreateCompanyData } from '../services/companyService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Helper function to format URLs properly
  const formatUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };
  const [form] = Form.useForm();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const response = await companyService.getCompanies({
        page,
        limit: pageSize,
        search: searchText || undefined
      });
      setCompanies(response.data.companies || []);
      setPagination({
        current: page,
        pageSize,
        total: response.data.pagination?.totalItems || 0
      });
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
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      website: company.website,
      phone: company.phone,
      address: company.address?.street,
      city: company.address?.city,
      state: company.address?.state,
      country: company.address?.country,
      postalCode: company.address?.postalCode,
      foundedYear: company.foundedYear,
      description: company.description,
      linkedinUrl: company.linkedinUrl,
      twitterHandle: company.twitterHandle,
    });
  };

  const handleViewCompany = async (company: Company) => {
    try {
      // Load company details with contacts
      const response = await companyService.getCompany(company.id);
      setSelectedCompany(response.data);
      setIsDrawerVisible(true);
    } catch (error) {
      console.error('Failed to load company details:', error);
      setSelectedCompany(company);
      setIsDrawerVisible(true);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await companyService.deleteCompany(companyId);
      message.success('Company deleted successfully');
      loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
      message.error('Failed to delete company');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      // Filter out empty values and prepare address object
      const companyData: any = {
        name: values.name?.trim(),
      };

      // Only add optional fields if they have values
      if (values.domain?.trim()) companyData.domain = values.domain.trim();
      if (values.industry) companyData.industry = values.industry;
      if (values.size) companyData.size = values.size;
      if (values.description?.trim()) companyData.description = values.description.trim();
      if (values.phone?.trim()) companyData.phone = values.phone.trim();
      
      // Validate and add URLs
      if (values.website?.trim()) {
        const website = values.website.trim();
        companyData.website = website.startsWith('http') ? website : `https://${website}`;
      }
      
      if (values.linkedinUrl?.trim()) {
        const linkedin = values.linkedinUrl.trim();
        companyData.linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
      }
      
      if (values.twitterHandle?.trim()) {
        companyData.twitterHandle = values.twitterHandle.trim();
      }

      // Build address object if any address fields are provided
      const addressFields = {
        street: values.address?.trim(),
        city: values.city?.trim(),
        state: values.state?.trim(),
        country: values.country?.trim(),
        postalCode: values.postalCode?.trim()
      };
      
      const hasAddressFields = Object.values(addressFields).some(field => field);
      if (hasAddressFields) {
        companyData.address = addressFields;
      }

      // Add numeric fields if provided
      if (values.foundedYear && !isNaN(values.foundedYear)) {
        companyData.foundedYear = parseInt(values.foundedYear);
      }

      if (editingCompany) {
        await companyService.updateCompany(editingCompany.id, companyData);
        message.success('Company updated successfully');
      } else {
        await companyService.createCompany(companyData);
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

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchText(value);
    // Reload data when search changes
    setTimeout(() => loadCompanies(1, pagination.pageSize), 500);
  };

  const handleTableChange = (paginationProps: any) => {
    loadCompanies(paginationProps.current, paginationProps.pageSize);
  };

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

  const getCompanySizeTag = (company: Company) => {
    if (company.size) {
      const sizeColors = {
        startup: 'green',
        small: 'blue', 
        medium: 'cyan',
        large: 'orange',
        enterprise: 'red'
      };
      const sizeLabels = {
        startup: 'Startup',
        small: 'Small',
        medium: 'Medium', 
        large: 'Large',
        enterprise: 'Enterprise'
      };
      return <Tag color={sizeColors[company.size]}>{sizeLabels[company.size]}</Tag>;
    }
    
    return null;
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
          {company.domain && (
            <div style={{ marginBottom: '4px' }}>
              <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              {company.domain}
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
              <a href={formatUrl(company.website)} target="_blank" rel="noopener noreferrer">
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
        const addressParts = [];
        if (company.address?.city) addressParts.push(company.address.city);
        if (company.address?.state) addressParts.push(company.address.state);
        if (company.address?.country) addressParts.push(company.address.country);
        
        const location = addressParts.join(', ');
        return location || '-';
      },
    },
    {
      title: 'Size',
      key: 'size',
      render: (company: Company) => (
        <div>
          {getCompanySizeTag(company)}
        </div>
      ),
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
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              allowClear
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
          dataSource={companies}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} companies`
          }}
          onChange={handleTableChange}
          rowKey="id"
          loading={loading}
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
              <Form.Item name="size" label="Company Size">
                <Select placeholder="Select company size" allowClear>
                  <Option value="startup">Startup</Option>
                  <Option value="small">Small (1-50)</Option>
                  <Option value="medium">Medium (51-500)</Option>
                  <Option value="large">Large (501-5000)</Option>
                  <Option value="enterprise">Enterprise (5000+)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="foundedYear" label="Founded Year">
                <Input type="number" placeholder="Enter founded year" />
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="domain" label="Domain">
                <Input placeholder="example.com" />
              </Form.Item>
            </Col>
          </Row>

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
              <Form.Item name="postalCode" label="ZIP Code">
                <Input placeholder="Enter ZIP code" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="foundedYear" label="Founded Year">
                <Input type="number" placeholder="Enter founded year" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="linkedinUrl" label="LinkedIn URL">
                <Input placeholder="https://linkedin.com/company/example" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="twitterHandle" label="Twitter Handle">
                <Input placeholder="@companyname" />
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
                {getCompanySizeTag(selectedCompany)}
              </div>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedCompany.domain && (
                <div>
                  <strong>Domain:</strong>
                  <div>{selectedCompany.domain}</div>
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
                    <a href={formatUrl(selectedCompany.website)} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.website}
                    </a>
                  </div>
                </div>
              )}

              {selectedCompany.address && (
                <div>
                  <strong>Address:</strong>
                  <div>
                    {selectedCompany.address.street && <div>{selectedCompany.address.street}</div>}
                    <div>
                      {[selectedCompany.address.city, selectedCompany.address.state, selectedCompany.address.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    {selectedCompany.address.country && <div>{selectedCompany.address.country}</div>}
                  </div>
                </div>
              )}

              {selectedCompany.foundedYear && (
                <div>
                  <strong>Founded:</strong>
                  <div>{selectedCompany.foundedYear}</div>
                </div>
              )}

              {selectedCompany.linkedinUrl && (
                <div>
                  <strong>LinkedIn:</strong>
                  <div>
                    <a href={formatUrl(selectedCompany.linkedinUrl)} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.linkedinUrl}
                    </a>
                  </div>
                </div>
              )}

              {selectedCompany.twitterHandle && (
                <div>
                  <strong>Twitter:</strong>
                  <div>{selectedCompany.twitterHandle}</div>
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

            {/* TODO: Add contacts section when contact-company relationship is implemented */}

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