import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  message,
  Space,
  Tag
} from 'antd';
import {
  UserOutlined,
  BankOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  TwitterOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { PotentialLead, pdlService } from '../../services/pdlService';
import { getErrorMessage } from '../../utils/errorUtils';

const { Option } = Select;
const { TextArea } = Input;

interface ManualLeadModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingLead?: PotentialLead | null;
}

const ManualLeadModal: React.FC<ManualLeadModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  editingLead
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const isEditing = !!editingLead;

  useEffect(() => {
    if (visible && editingLead) {
      // Populate form with existing data
      form.setFieldsValue({
        fullName: editingLead.fullName,
        jobTitle: editingLead.jobTitle,
        companyName: editingLead.companyName,
        email: editingLead.email,
        phone: editingLead.phone,
        linkedinUrl: editingLead.linkedinUrl,
        twitterUrl: editingLead.twitterUrl,
        locationCity: editingLead.locationCity,
        locationCountry: editingLead.locationCountry,
        industry: editingLead.industry,
        leadType: editingLead.leadType,
        notes: editingLead.notes || ''
      });
      setSkills(Array.isArray(editingLead.skills) ? editingLead.skills : []);
    } else if (visible) {
      // Reset form for new lead
      form.resetFields();
      setSkills([]);
    }
  }, [visible, editingLead, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const leadData = {
        ...values,
        skills
      };

      if (isEditing && editingLead) {
        await pdlService.updateLead(editingLead.id, leadData);
        message.success('Lead updated successfully');
      } else {
        await pdlService.createManualLead(leadData);
        message.success('Manual lead created successfully');
      }
      
      onSuccess();
    } catch (error: any) {
      message.error(getErrorMessage(error, 'Operation failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleEnrichAfterCreate = async () => {
    if (!isEditing) {
      try {
        const values = await form.validateFields();
        if (values.email || values.linkedinUrl || values.phone) {
          message.info('Lead will be created and automatically enriched with PDL data');
        }
      } catch (error) {
        // Form validation failed
      }
    }
  };

  return (
    <Modal
      title={isEditing ? `Edit Lead: ${editingLead?.fullName}` : 'Create Manual Lead'}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          {isEditing ? 'Update Lead' : 'Create Lead'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          leadType: 'general'
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Full name is required' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Enter full name"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="jobTitle"
              label="Job Title"
            >
              <Input 
                placeholder="e.g., Software Engineer"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="companyName"
              label="Company"
            >
              <Input 
                prefix={<BankOutlined />}
                placeholder="Company name"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="industry"
              label="Industry"
            >
              <Select placeholder="Select industry">
                <Option value="Technology">Technology</Option>
                <Option value="Finance">Finance</Option>
                <Option value="Healthcare">Healthcare</Option>
                <Option value="Education">Education</Option>
                <Option value="Marketing">Marketing</Option>
                <Option value="Sales">Sales</Option>
                <Option value="Consulting">Consulting</Option>
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
              <Input 
                prefix={<MailOutlined />}
                placeholder="email@example.com"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input 
                prefix={<PhoneOutlined />}
                placeholder="+1-555-123-4567"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="linkedinUrl"
              label="LinkedIn URL"
            >
              <Input 
                prefix={<LinkedinOutlined />}
                placeholder="https://linkedin.com/in/username"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="twitterUrl"
              label="Twitter URL"
            >
              <Input 
                prefix={<TwitterOutlined />}
                placeholder="https://twitter.com/username"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="locationCity"
              label="City"
            >
              <Input 
                prefix={<EnvironmentOutlined />}
                placeholder="San Francisco"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="locationCountry"
              label="Country"
            >
              <Input 
                placeholder="United States"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="leadType"
              label="Lead Type"
            >
              <Select placeholder="Select lead type">
                <Option value="staff">Staff</Option>
                <Option value="client">Client</Option>
                <Option value="general">General</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Skills">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.Group compact>
                  <Input
                    style={{ width: 'calc(100% - 80px)' }}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill"
                    onPressEnter={handleAddSkill}
                  />
                  <Button type="primary" onClick={handleAddSkill}>
                    Add
                  </Button>
                </Input.Group>
                <div>
                  {skills.map(skill => (
                    <Tag
                      key={skill}
                      closable
                      onClose={() => handleRemoveSkill(skill)}
                      style={{ marginBottom: 4 }}
                    >
                      {skill}
                    </Tag>
                  ))}
                </div>
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea 
            rows={3}
            placeholder="Any additional notes about this lead..."
          />
        </Form.Item>
      </Form>

      {!isEditing && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6ffed', borderRadius: 6 }}>
          <p><strong>💡 Tip:</strong> After creating this manual lead, you can use the "Enrich Data" action to automatically fill in missing information using PDL's database!</p>
        </div>
      )}
    </Modal>
  );
};

export default ManualLeadModal;