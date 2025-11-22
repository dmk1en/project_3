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
  Divider
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
  TwitterOutlined
} from '@ant-design/icons';
import { contactService, Contact as ServiceContact, CreateContactData } from '../services/contactService';
import { companyService, Company } from '../services/companyService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getErrorMessage } from '../utils/errorUtils';

const { Search } = Input;
const { Option } = Select;

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
      notes: contact.notes,
    };
    setInitialFormValues(formValues);
    setIsModalVisible(true);
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDrawerVisible(true);
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
        notes: values.notes,
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
              href={contact.linkedinUrl}
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
              <Select
                placeholder="Filter by Source"
                allowClear
                value={filters.source || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
                style={{ width: '100%' }}
              >
                <Option value="website">Website</Option>
                <Option value="social_media">Social Media</Option>
                <Option value="email_campaign">Email Campaign</Option>
                <Option value="referral">Referral</Option>
                <Option value="cold_call">Cold Call</Option>
                <Option value="trade_show">Trade Show</Option>
                <Option value="partner">Partner</Option>
                <Option value="other">Other</Option>
              </Select>
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

        <Table
          columns={columns}
          dataSource={filteredContacts}
          rowKey="id"
          loading={loading}
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
                  <strong>Company:</strong>
                  <div>{selectedContact.company.name}</div>
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
                        href={selectedContact.linkedinUrl}
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
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Contacts;
