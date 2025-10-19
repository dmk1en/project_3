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
import { api } from '../services/api';

const { Search } = Input;
const { Option } = Select;

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: number;
  company?: {
    id: number;
    name: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
  };
  tags?: string[];
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadContacts();
    loadCompanies();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      message.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies');
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalVisible(true);
    form.setFieldsValue({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      companyId: contact.companyId,
      linkedinUrl: contact.socialProfiles?.linkedin,
      twitterUrl: contact.socialProfiles?.twitter,
    });
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDrawerVisible(true);
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      message.success('Contact deleted successfully');
      loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      message.error('Failed to delete contact');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      const contactData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        jobTitle: values.jobTitle,
        companyId: values.companyId,
        socialProfiles: {
          linkedin: values.linkedinUrl,
          twitter: values.twitterUrl,
        }
      };

      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}`, contactData);
        message.success('Contact updated successfully');
      } else {
        await api.post('/contacts', contactData);
        message.success('Contact created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadContacts();
    } catch (error) {
      console.error('Failed to save contact:', error);
      message.error('Failed to save contact');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.company?.name?.toLowerCase().includes(searchText.toLowerCase())
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
              {contact.jobTitle}
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
          {contact.socialProfiles?.linkedin && (
            <Button 
              type="link" 
              icon={<LinkedinOutlined />} 
              href={contact.socialProfiles.linkedin}
              target="_blank"
              size="small"
            />
          )}
          {contact.socialProfiles?.twitter && (
            <Button 
              type="link" 
              icon={<TwitterOutlined />} 
              href={contact.socialProfiles.twitter}
              target="_blank"
              size="small"
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (contact: Contact) => (
        <Space>
          {contact.tags?.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
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
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
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
        <Table
          columns={columns}
          dataSource={filteredContacts}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} contacts`,
          }}
        />
      </Card>

      {/* Add/Edit Contact Modal */}
      <Modal
        title={editingContact ? 'Edit Contact' : 'Add New Contact'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
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
              <Form.Item name="jobTitle" label="Job Title">
                <Input placeholder="Enter job title" />
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

          <Divider orientation="left">Social Profiles</Divider>

          <Form.Item name="linkedinUrl" label="LinkedIn Profile">
            <Input 
              placeholder="https://linkedin.com/in/username" 
              prefix={<LinkedinOutlined />}
            />
          </Form.Item>

          <Form.Item name="twitterUrl" label="Twitter Profile">
            <Input 
              placeholder="https://twitter.com/username" 
              prefix={<TwitterOutlined />}
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
                <p style={{ color: '#666' }}>{selectedContact.jobTitle}</p>
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

              {(selectedContact.socialProfiles?.linkedin || selectedContact.socialProfiles?.twitter) && (
                <div>
                  <strong>Social Profiles:</strong>
                  <div>
                    {selectedContact.socialProfiles.linkedin && (
                      <Button 
                        type="link" 
                        icon={<LinkedinOutlined />}
                        href={selectedContact.socialProfiles.linkedin}
                        target="_blank"
                      >
                        LinkedIn
                      </Button>
                    )}
                    {selectedContact.socialProfiles.twitter && (
                      <Button 
                        type="link" 
                        icon={<TwitterOutlined />}
                        href={selectedContact.socialProfiles.twitter}
                        target="_blank"
                      >
                        Twitter
                      </Button>
                    )}
                  </div>
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
