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
  AutoComplete,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkedinOutlined,
  TwitterOutlined,
  GithubOutlined,
  BankOutlined,
  TrophyOutlined,
  BookOutlined,
  GlobalOutlined,
  CalendarOutlined,
  StarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { contactService, Contact as ServiceContact, CreateContactData } from '../services/contactService';
import { companyService, Company } from '../services/companyService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getErrorMessage } from '../utils/errorUtils';
import ContactEnrichment from '../components/ContactEnrichment';
import BulkContactEnrichment from '../components/BulkContactEnrichment';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

// Use the Contact interface from the service
type Contact = ServiceContact;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const Contacts: React.FC = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper function to format URLs properly
  const formatUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    leadStatus: undefined as string | undefined,
    source: undefined as string | undefined,
    assignedTo: undefined as string | undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [enrichmentVisible, setEnrichmentVisible] = useState(false);
  const [enrichmentContact, setEnrichmentContact] = useState<Contact | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [bulkEnrichmentVisible, setBulkEnrichmentVisible] = useState(false);
  const [bulkEnrichmentContacts, setBulkEnrichmentContacts] = useState<Contact[]>([]);
  const [form] = Form.useForm();
  const [initialFormValues, setInitialFormValues] = useState<any>({});

  useEffect(() => {
    loadContacts(1, 10);
    loadCompanies();
    loadUsers();
  }, []);

  useEffect(() => {
    loadContacts(1, pagination.pageSize, searchText);
  }, [filters]);

  const loadContacts = async (page: number = 1, limit: number = 10, search?: string) => {
    try {
      setLoading(true);
      const filterParams = { page, limit };
      if (search) (filterParams as any).search = search;
      if (filters.leadStatus) (filterParams as any).leadStatus = filters.leadStatus;
      if (filters.source) (filterParams as any).source = filters.source;
      if (filters.assignedTo) (filterParams as any).assignedTo = filters.assignedTo;
      
      const response = await contactService.getContacts(filterParams);
      
      if (response.success) {
        setContacts(response.data.contacts);
        setPagination({
          current: response.data.pagination.currentPage,
          pageSize: response.data.pagination.itemsPerPage,
          total: response.data.pagination.totalItems,
        });
      }
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
      message.error(getErrorMessage(error, 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await companyService.getCompanies({ limit: 100 });
      
      if (response.success) {
        setCompanies(response.data.companies);
      }
    } catch (error: any) {
      console.error('Failed to load companies:', error);
      message.error(getErrorMessage(error, 'Failed to load companies'));
    }
  };

  const loadUsers = async () => {
    try {
      // For now, just add the current user to the list
      // In a full implementation, you'd have a users API endpoint
      if (auth.user) {
        setUsers([{
          id: auth.user.id,
          firstName: auth.user.firstName,
          lastName: auth.user.lastName,
          email: auth.user.email,
          role: auth.user.role
        }]);
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setInitialFormValues({
      source: 'manual',
      leadStatus: 'new',
      leadScore: 0,
    });
    setIsModalVisible(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    const formValues = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      department: contact.department,
      companyId: contact.companyId,
      linkedinUrl: contact.linkedinUrl,
      twitterHandle: contact.twitterHandle,
      source: contact.source,
      leadStatus: contact.leadStatus,
      leadScore: contact.leadScore,
      seniorityLevel: contact.seniorityLevel,
      notes: contact.notes,
      // Custom fields
      skills: contact.customFields?.skills || [],
      education: contact.customFields?.education || [],
      experience: contact.customFields?.experience || [],
      languages: contact.customFields?.languages || [],
      certifications: contact.customFields?.certifications || [],
      interests: contact.customFields?.interests || [],
      location: contact.customFields?.location || '',
      industry: contact.customFields?.industry || '',
      currentCompany: contact.customFields?.currentCompany || '',
      personalEmails: contact.customFields?.personalEmails || [],
      workEmails: contact.customFields?.workEmails || [],
      websites: contact.customFields?.websites || [],
      githubUrl: contact.customFields?.githubUrl || '',
    };
    setInitialFormValues(formValues);
    setIsModalVisible(true);
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDrawerVisible(true);
  };

  const handleEnrichContact = (contact: Contact) => {
    setEnrichmentContact(contact);
    setEnrichmentVisible(true);
  };

  const handleEnrichmentComplete = (enrichedContact: Contact) => {
    message.success(`Contact ${enrichedContact.firstName} ${enrichedContact.lastName} enriched successfully`);
    loadContacts(pagination.current, pagination.pageSize, searchText);
    setEnrichmentVisible(false);
    setEnrichmentContact(null);
  };

  const handleBulkEnrich = () => {
    const selectedContacts = contacts.filter(contact => selectedRowKeys.includes(contact.id));
    if (selectedContacts.length === 0) {
      message.warning('Please select contacts to enrich');
      return;
    }
    setBulkEnrichmentContacts(selectedContacts);
    setBulkEnrichmentVisible(true);
  };

  const handleBulkEnrichmentComplete = (enrichedContacts: Contact[]) => {
    message.success(`${enrichedContacts.length} contact(s) enriched successfully`);
    loadContacts(pagination.current, pagination.pageSize, searchText);
    setBulkEnrichmentVisible(false);
    setBulkEnrichmentContacts([]);
    setSelectedRowKeys([]);
  };

  const handleSelectAll = () => {
    const allContactIds = contacts.map(contact => contact.id);
    setSelectedRowKeys(allContactIds);
  };

  const handleClearSelection = () => {
    setSelectedRowKeys([]);
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await contactService.deleteContact(contactId);
      message.success('Contact deleted successfully');
      loadContacts(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      console.error('Failed to delete contact:', error);
      message.error(getErrorMessage(error, 'Failed to delete contact'));
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      const contactData: CreateContactData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        title: values.title,
        department: values.department,
        companyId: values.companyId,
        linkedinUrl: values.linkedinUrl,
        twitterHandle: values.twitterHandle,
        source: values.source || 'manual',
        leadStatus: values.leadStatus || 'new',
        leadScore: values.leadScore || 0,
        seniorityLevel: values.seniorityLevel,
        notes: values.notes,
        customFields: {
          skills: values.skills || [],
          education: values.education || [],
          experience: values.experience || [],
          languages: values.languages || [],
          certifications: values.certifications || [],
          interests: values.interests || [],
          location: values.location || '',
          industry: values.industry || '',
          currentCompany: values.currentCompany || '',
          personalEmails: values.personalEmails || [],
          workEmails: values.workEmails || [],
          websites: values.websites || [],
          githubUrl: values.githubUrl || '',
        },
      };

      // Clean up the data - remove empty strings and undefined values
      const cleanedData: any = { ...contactData };
      Object.keys(cleanedData).forEach(key => {
        const value = cleanedData[key];
        if (value === '' || value === undefined || value === null) {
          delete cleanedData[key];
        }
      });

      // For updates, only send non-empty fields
      const finalData = editingContact ? cleanedData : contactData;

      console.log('Sending contact data:', finalData);

      if (editingContact) {
        await contactService.updateContact(editingContact.id, finalData);
        message.success('Contact updated successfully');
      } else {
        await contactService.createContact(finalData);
        message.success('Contact created successfully');
      }

      setIsModalVisible(false);
      setInitialFormValues({});
      form.resetFields();
      loadContacts(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      console.error('Failed to save contact:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.status === 400) {
        if (error.response?.data?.errors) {
          // Express-validator format
          const validationErrors = error.response.data.errors.map((err: any) => `${err.path}: ${err.msg}`).join(', ');
          message.error(`Validation errors: ${validationErrors}`);
        } else if (error.response?.data?.error?.details) {
          // Sequelize validation format
          const validationErrors = error.response.data.error.details.map((err: any) => `${err.field}: ${err.message}`).join(', ');
          message.error(`Validation errors: ${validationErrors}`);
        } else {
          message.error(getErrorMessage(error, 'Validation failed'));
        }
      } else {
        message.error(getErrorMessage(error, 'Failed to save contact'));
      }
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.company?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.title?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (contact: Contact) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {contact.firstName} {contact.lastName}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {contact.title}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (contact: Contact) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            {contact.email}
          </div>
          {contact.phone && (
            <div>
              <PhoneOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              {contact.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Company',
      dataIndex: ['company', 'name'],
      key: 'company',
      render: (companyName: string) => companyName || '-',
    },
    {
      title: 'Social',
      key: 'social',
      render: (contact: Contact) => (
        <Space>
          {contact.linkedinUrl && (
            <Button 
              type="link" 
              icon={<LinkedinOutlined />} 
              href={formatUrl(contact.linkedinUrl)}
              target="_blank"
              size="small"
            />
          )}
          {contact.twitterHandle && (
            <Button 
              type="link" 
              icon={<TwitterOutlined />} 
              href={`https://twitter.com/${contact.twitterHandle.replace('@', '')}`}
              target="_blank"
              size="small"
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Status & Score',
      key: 'status',
      render: (contact: Contact) => (
        <Space direction="vertical" size="small">
          <Tag color={contact.leadStatus === 'converted' ? 'green' : contact.leadStatus === 'qualified' ? 'blue' : 'default'}>
            {contact.leadStatus?.toUpperCase()}
          </Tag>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Score: {contact.leadScore}/100
          </div>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (contact: Contact) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleViewContact(contact)}
          >
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditContact(contact)}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            onClick={() => handleEnrichContact(contact)}
            style={{ color: '#722ed1' }}
          >
            Enrich
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this contact?"
            onConfirm={() => handleDeleteContact(contact.id)}
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
        title="Contacts Management" 
        extra={
          <Space>
            <Search
              placeholder="Search contacts..."
              onSearch={(value) => {
                setSearchText(value);
                loadContacts(1, pagination.pageSize, value);
              }}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddContact}
            >
              Add Contact
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="Filter by Lead Status"
                allowClear
                value={filters.leadStatus || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, leadStatus: value }))}
                style={{ width: '100%' }}
              >
                <Option value="new">New</Option>
                <Option value="contacted">Contacted</Option>
                <Option value="qualified">Qualified</Option>
                <Option value="proposal">Proposal</Option>
                <Option value="negotiation">Negotiation</Option>
                <Option value="closed">Closed</Option>
                <Option value="lost">Lost</Option>
              </Select>
            </Col>
            <Col span={6}>
              <AutoComplete
                placeholder="Filter by Source"
                allowClear
                value={filters.source || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
                style={{ width: '100%' }}
                options={[
                  { value: 'website' },
                  { value: 'social_media' },
                  { value: 'email_campaign' },
                  { value: 'referral' },
                  { value: 'cold_call' },
                  { value: 'trade_show' },
                  { value: 'partner' },
                  { value: 'manual' },
                  { value: 'linkedin' },
                  { value: 'twitter' },
                  { value: 'pdl_discovery' },
                  { value: 'cold_outreach' },
                  { value: 'event' },
                  { value: 'other' }
                ]}
                filterOption={(inputValue, option) =>
                  option!.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                }
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Assigned User"
                allowClear
                value={filters.assignedTo || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value }))}
                style={{ width: '100%' }}
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Button 
                onClick={() => setFilters({ leadStatus: undefined, source: undefined, assignedTo: undefined })}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </div>

        {/* Bulk Actions */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Space>
              <Button 
                onClick={handleSelectAll}
                disabled={contacts.length === 0}
              >
                Select All
              </Button>
              <Button 
                onClick={handleClearSelection}
                disabled={selectedRowKeys.length === 0}
              >
                Clear Selection
              </Button>
              <Button 
                type="primary"
                onClick={handleBulkEnrich}
                disabled={selectedRowKeys.length === 0}
                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              >
                Enrich Selected ({selectedRowKeys.length})
              </Button>
            </Space>
          </div>
          {selectedRowKeys.length > 0 && (
            <div>
              <Text type="secondary">
                {selectedRowKeys.length} of {contacts.length} contacts selected
              </Text>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredContacts}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys: React.Key[]) => {
              setSelectedRowKeys(selectedKeys as string[]);
            },
            onSelectAll: (selected, selectedRows, changeRows) => {
              if (selected) {
                const allKeys = contacts.map(contact => contact.id);
                setSelectedRowKeys(allKeys);
              } else {
                setSelectedRowKeys([]);
              }
            },
            getCheckboxProps: (record: Contact) => ({
              name: record.firstName + ' ' + record.lastName,
            }),
          }}
          pagination={{
            ...pagination,
            showTotal: (total) => `Total ${total} contacts`,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              loadContacts(page, pageSize, searchText);
            },
            onShowSizeChange: (current, size) => {
              loadContacts(1, size, searchText);
            },
          }}
        />
      </Card>

      {/* Add/Edit Contact Modal */}
      <Modal
        title={editingContact ? 'Edit Contact' : 'Add New Contact'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setInitialFormValues({});
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
          initialValues={initialFormValues}
          key={editingContact?.id || 'new'}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label="Job Title">
                <Input placeholder="Enter job title" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="seniorityLevel" label="Seniority Level">
                <Select placeholder="Select seniority level" allowClear>
                  <Option value="entry">Entry</Option>
                  <Option value="mid">Mid</Option>
                  <Option value="senior">Senior</Option>
                  <Option value="director">Director</Option>
                  <Option value="vp">VP</Option>
                  <Option value="c_level">C-Level</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location">
                <Input placeholder="Enter location" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Input placeholder="Enter department" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignedTo" label="Assigned To">
                <Select placeholder="Select user" allowClear>
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="companyId" label="Company">
            <Select placeholder="Select company" allowClear>
              {companies.map(company => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="industry" label="Industry">
                <Input placeholder="Enter industry" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currentCompany" label="Current Company (Text)">
                <Input placeholder="Enter current company name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="source" label="Source">
                <Select placeholder="Select source">
                  <Option value="manual">Manual</Option>
                  <Option value="linkedin">LinkedIn</Option>
                  <Option value="twitter">Twitter</Option>
                  <Option value="referral">Referral</Option>
                  <Option value="website">Website</Option>
                  <Option value="email_campaign">Email Campaign</Option>
                  <Option value="cold_outreach">Cold Outreach</Option>
                  <Option value="event">Event</Option>
                  <Option value="pdl_discovery">PDL Discovery</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="leadStatus" label="Lead Status">
                <Select placeholder="Select status">
                  <Option value="new">New</Option>
                  <Option value="contacted">Contacted</Option>
                  <Option value="qualified">Qualified</Option>
                  <Option value="unqualified">Unqualified</Option>
                  <Option value="nurturing">Nurturing</Option>
                  <Option value="converted">Converted</Option>
                  <Option value="lost">Lost</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="leadScore" label="Lead Score (0-100)">
            <Input type="number" min="0" max="100" placeholder="Enter lead score" />
          </Form.Item>

          <Divider orientation="left">Social Profiles</Divider>

          <Form.Item name="linkedinUrl" label="LinkedIn Profile">
            <Input 
              placeholder="https://linkedin.com/in/username" 
              prefix={<LinkedinOutlined />}
            />
          </Form.Item>

          <Form.Item name="twitterHandle" label="Twitter Handle">
            <Input 
              placeholder="@username or username" 
              prefix={<TwitterOutlined />}
            />
          </Form.Item>

          <Form.Item name="githubUrl" label="GitHub Profile">
            <Input 
              placeholder="https://github.com/username" 
              prefix={<GithubOutlined />}
            />
          </Form.Item>

          <Divider orientation="left">Professional Data (Enriched from PDL)</Divider>

          <Form.Item name="skills" label="Skills">
            <Select
              mode="tags"
              placeholder="Enter skills (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="languages" label="Languages">
            <Select
              mode="tags"
              placeholder="Enter languages (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="certifications" label="Certifications">
            <Select
              mode="tags"
              placeholder="Enter certifications (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="interests" label="Interests">
            <Select
              mode="tags"
              placeholder="Enter interests (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Divider orientation="left">Contact Information (Enriched)</Divider>

          <Form.Item name="personalEmails" label="Personal Emails">
            <Select
              mode="tags"
              placeholder="Enter personal emails (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="workEmails" label="Work Emails">
            <Select
              mode="tags"
              placeholder="Enter work emails (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="websites" label="Personal Websites">
            <Select
              mode="tags"
              placeholder="Enter websites (press enter to add)"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea 
              rows={3}
              placeholder="Additional notes about this contact..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingContact ? 'Update' : 'Create'} Contact
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Contact Details Drawer */}
      <Drawer
        title="Contact Details"
        placement="right"
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width={400}
      >
        {selectedContact && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginTop: '12px' }}>
                <h3>{selectedContact.firstName} {selectedContact.lastName}</h3>
                <p style={{ color: '#666' }}>{selectedContact.title}</p>
              </div>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>Email:</strong>
                <div>{selectedContact.email}</div>
              </div>

              {selectedContact.phone && (
                <div>
                  <strong>Phone:</strong>
                  <div>{selectedContact.phone}</div>
                </div>
              )}

              {selectedContact.company && (
                <div>
                  <strong><BankOutlined /> Company:</strong>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{selectedContact.company.name}</div>
                    {selectedContact.company.industry && (
                      <div style={{ fontSize: '12px', color: '#666' }}>Industry: {selectedContact.company.industry}</div>
                    )}
                    {selectedContact.company.size && (
                      <div style={{ fontSize: '12px', color: '#666' }}>Size: {selectedContact.company.size}</div>
                    )}
                    {selectedContact.company.website && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Website: <a href={formatUrl(selectedContact.company.website)} target="_blank" rel="noopener noreferrer">
                          {selectedContact.company.website}
                        </a>
                      </div>
                    )}
                    {selectedContact.company.domain && (
                      <div style={{ fontSize: '12px', color: '#666' }}>Domain: {selectedContact.company.domain}</div>
                    )}
                    {selectedContact.company.linkedinUrl && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        LinkedIn: <a href={formatUrl(selectedContact.company.linkedinUrl)} target="_blank" rel="noopener noreferrer">
                          Company Page
                        </a>
                      </div>
                    )}
                    {selectedContact.company.description && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {selectedContact.company.description.length > 100 
                          ? `${selectedContact.company.description.substring(0, 100)}...`
                          : selectedContact.company.description
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.experience && selectedContact.customFields.experience.length > 0 && (
                <div>
                  <strong><TrophyOutlined /> Professional Experience:</strong>
                  <div>
                    {selectedContact.customFields.experience.slice(0, 3).map((exp: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {typeof exp.title === 'object' && exp.title ? exp.title.name || 'Position' : exp.title || 'Position'}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {exp.company?.name || 'Company'}
                          {exp.start_date && (
                            <span> • {new Date(exp.start_date).getFullYear()} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}</span>
                          )}
                        </div>
                        {exp.summary && (
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>{exp.summary.substring(0, 100)}...</div>
                        )}
                      </div>
                    ))}
                    {selectedContact.customFields.experience.length > 3 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>+{selectedContact.customFields.experience.length - 3} more positions</div>
                    )}
                  </div>
                </div>
              )}

              {(selectedContact.customFields as any)?.seniorityLevel && (
                <div>
                  <strong><StarOutlined /> Seniority Level:</strong>
                  <div>
                    <Tag color={(selectedContact.customFields as any).seniorityLevel === 'senior' ? 'gold' : (selectedContact.customFields as any).seniorityLevel === 'mid' ? 'blue' : 'green'}>
                      {String((selectedContact.customFields as any).seniorityLevel || '').toUpperCase()}
                    </Tag>
                  </div>
                </div>
              )}

              {(selectedContact.linkedinUrl || selectedContact.twitterHandle) && (
                <div>
                  <strong>Social Profiles:</strong>
                  <div>
                    {selectedContact.linkedinUrl && (
                      <Button 
                        type="link" 
                        icon={<LinkedinOutlined />}
                        href={formatUrl(selectedContact.linkedinUrl)}
                        target="_blank"
                      >
                        LinkedIn
                      </Button>
                    )}
                    {selectedContact.twitterHandle && (
                      <Button 
                        type="link" 
                        icon={<TwitterOutlined />}
                        href={`https://twitter.com/${selectedContact.twitterHandle.replace('@', '')}`}
                        target="_blank"
                      >
                        Twitter
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <strong>Status:</strong>
                <div>
                  <Tag color={selectedContact.leadStatus === 'converted' ? 'green' : selectedContact.leadStatus === 'qualified' ? 'blue' : 'default'}>
                    {selectedContact.leadStatus?.toUpperCase()}
                  </Tag>
                </div>
              </div>

              <div>
                <strong>Lead Score:</strong>
                <div>{selectedContact.leadScore}/100</div>
              </div>

              <div>
                <strong>Source:</strong>
                <div>{selectedContact.source}</div>
              </div>

              {selectedContact.customFields && Object.keys(selectedContact.customFields).length > 0 && (
                <div>
                  <strong><CheckCircleOutlined /> Enrichment Status:</strong>
                  <div>
                    <Tag color="green" icon={<UserOutlined />}>
                      PDL Enriched
                    </Tag>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {Object.keys(selectedContact.customFields).length} enriched fields
                    </div>
                  </div>
                </div>
              )}

              {(selectedContact.customFields as any)?.dataSource && (
                <div>
                  <strong>Data Source:</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>{(selectedContact.customFields as any).dataSource}</div>
                </div>
              )}

              {selectedContact.customFields?.skills && selectedContact.customFields.skills.length > 0 && (
                <div>
                  <strong>Skills:</strong>
                  <div>
                    {selectedContact.customFields.skills.slice(0, 10).map((skill: any, idx: number) => (
                      <Tag key={idx} color="blue">
                        {typeof skill === 'object' && skill ? (skill.name || skill.skill || 'Skill') : String(skill || '')}
                      </Tag>
                    ))}
                    {selectedContact.customFields.skills.length > 10 && (
                      <Tag>+{selectedContact.customFields.skills.length - 10} more</Tag>
                    )}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.education && selectedContact.customFields.education.length > 0 && (
                <div>
                  <strong><BookOutlined /> Education:</strong>
                  <div>
                    {selectedContact.customFields.education.slice(0, 2).map((edu: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f8f0', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold' }}>{edu.school?.name || 'School'}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {typeof edu.degree_name === 'object' && edu.degree_name ? edu.degree_name.name || 'Degree' : edu.degree_name || 'Degree'}
                          {edu.majors && Array.isArray(edu.majors) && edu.majors.length > 0 && (
                            <span> • {edu.majors.join(', ')}</span>
                          )}
                        </div>
                        {edu.start_date && edu.end_date && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(edu.start_date).getFullYear()} - {new Date(edu.end_date).getFullYear()}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedContact.customFields.education.length > 2 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>+{selectedContact.customFields.education.length - 2} more institutions</div>
                    )}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.languages && selectedContact.customFields.languages.length > 0 && (
                <div>
                  <strong>Languages:</strong>
                  <div>
                    {selectedContact.customFields.languages.map((lang: any, idx: number) => (
                      <Tag key={idx} color="cyan">
                        {typeof lang === 'object' && lang ? (lang.name || lang.language || 'Language') : String(lang || '')}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.location && (
                <div>
                  <strong><GlobalOutlined /> Location:</strong>
                  <div>{selectedContact.customFields.location}</div>
                </div>
              )}

              {selectedContact.customFields?.industry && (
                <div>
                  <strong>Industry:</strong>
                  <div>{selectedContact.customFields.industry}</div>
                </div>
              )}

              {selectedContact.customFields?.certifications && selectedContact.customFields.certifications.length > 0 && (
                <div>
                  <strong>Certifications:</strong>
                  <div>
                    {selectedContact.customFields.certifications.map((cert: any, idx: number) => (
                      <Tag key={idx} color="gold">
                        {typeof cert === 'object' && cert ? (cert.name || cert.certification || 'Certification') : String(cert || '')}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.githubUrl && (
                <div>
                  <strong>GitHub:</strong>
                  <div>
                    <Button 
                      type="link" 
                      icon={<GithubOutlined />}
                      href={formatUrl(selectedContact.customFields.githubUrl)}
                      target="_blank"
                    >
                      GitHub Profile
                    </Button>
                  </div>
                </div>
              )}

              {(selectedContact.customFields as any)?.workEmail && (selectedContact.customFields as any).workEmail !== selectedContact.email && (
                <div>
                  <strong>Work Email:</strong>
                  <div>{(selectedContact.customFields as any).workEmail}</div>
                </div>
              )}

              {(selectedContact.customFields as any)?.mobilePhone && (
                <div>
                  <strong>Mobile Phone:</strong>
                  <div>{(selectedContact.customFields as any).mobilePhone}</div>
                </div>
              )}

              {(selectedContact.customFields as any)?.jobChangeDate && (
                <div>
                  <strong><CalendarOutlined /> Recent Job Change:</strong>
                  <div>{new Date((selectedContact.customFields as any).jobChangeDate).toLocaleDateString()}</div>
                </div>
              )}

              {selectedContact.customFields?.personalEmails && selectedContact.customFields.personalEmails.length > 0 && (
                <div>
                  <strong>Personal Emails:</strong>
                  <div>
                    {selectedContact.customFields.personalEmails.slice(0, 2).map((email: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#666' }}>
                        {typeof email === 'object' && email ? (email.email || email.address || 'Email') : String(email || '')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContact.customFields?.interests && selectedContact.customFields.interests.length > 0 && (
                <div>
                  <strong>Interests:</strong>
                  <div>
                    {selectedContact.customFields.interests.slice(0, 8).map((interest: string, idx: number) => (
                      <Tag key={idx} color="purple" style={{ marginBottom: '4px' }}>{interest}</Tag>
                    ))}
                    {selectedContact.customFields.interests.length > 8 && (
                      <Tag>+{selectedContact.customFields.interests.length - 8} more</Tag>
                    )}
                  </div>
                </div>
              )}

              {(selectedContact.customFields as any)?.summary && (
                <div>
                  <strong>Professional Summary:</strong>
                  <div style={{ fontSize: '12px', lineHeight: '1.4', backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
                    {(selectedContact.customFields as any).summary.length > 200 
                      ? (selectedContact.customFields as any).summary.substring(0, 200) + '...' 
                      : (selectedContact.customFields as any).summary
                    }
                  </div>
                </div>
              )}

              {selectedContact.notes && (
                <div>
                  <strong>Notes:</strong>
                  <div>{selectedContact.notes}</div>
                </div>
              )}

              <div>
                <strong>Created:</strong>
                <div>{new Date(selectedContact.createdAt).toLocaleDateString()}</div>
              </div>
            </Space>

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  setIsDrawerVisible(false);
                  handleEditContact(selectedContact);
                }}
              >
                Edit Contact
              </Button>
              <Button 
                onClick={() => {
                  setIsDrawerVisible(false);
                  handleEnrichContact(selectedContact);
                }}
                style={{ color: '#722ed1', borderColor: '#722ed1' }}
              >
                Enrich with PDL Data
              </Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* Contact Enrichment Modal */}
      <ContactEnrichment
        visible={enrichmentVisible}
        contact={enrichmentContact}
        onClose={() => {
          setEnrichmentVisible(false);
          setEnrichmentContact(null);
        }}
        onEnrichComplete={handleEnrichmentComplete}
      />

      {/* Bulk Contact Enrichment Modal */}
      <BulkContactEnrichment
        visible={bulkEnrichmentVisible}
        contacts={bulkEnrichmentContacts}
        onClose={() => {
          setBulkEnrichmentVisible(false);
          setBulkEnrichmentContacts([]);
        }}
        onEnrichComplete={handleBulkEnrichmentComplete}
      />
    </div>
  );
};

export default Contacts;
