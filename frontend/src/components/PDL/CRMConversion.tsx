import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Avatar,
  message,
  Progress,
  Alert,
  Checkbox,
  Row,
  Col,
  Divider,
  Spin,
  Result,
  List,
  Typography,
  Statistic
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  BankOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { convertToCRM, clearConversionResult } from '../../features/pdl/pdlSlice';
import { PotentialLead } from '../../services/pdlService';
import { useNavigate } from 'react-router-dom';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

interface CRMConversionProps {
  visible: boolean;
  onCancel: () => void;
  leadIds: string[];
  leads?: PotentialLead[]; // Make it optional to handle undefined case
}

const CRMConversion: React.FC<CRMConversionProps> = ({
  visible,
  onCancel,
  leadIds,
  leads = [] // Provide default empty array
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState<string[]>(leadIds);
  const [conversionSettings, setConversionSettings] = useState({
    defaultSource: 'PDL Import',
    defaultOwner: '',
    defaultTags: ['PDL Lead', 'Imported'],
    createCompanies: true,
    updateExisting: false,
    sendWelcomeEmail: false
  });

  const { loading, conversionResult, error } = useSelector((state: RootState) => state.pdl);

  // Sync selectedLeads state with leadIds prop when it changes
  useEffect(() => {
    setSelectedLeads(leadIds);
  }, [leadIds]);

  // Get leads to convert - ensure leads is an array
  const leadsToConvert = Array.isArray(leads) 
    ? leads.filter(lead => selectedLeads.includes(lead.id))
    : [];

  const handleNext = () => {
    if (currentStep === 0) {
      if (selectedLeads.length === 0) {
        message.error('Please select at least one lead to convert');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleConvert = async () => {
    if (selectedLeads.length === 0) {
      message.error('No leads selected for conversion');
      return;
    }

    try {
      const result = await dispatch(convertToCRM(selectedLeads) as any).unwrap();
      
      console.log('CRM Conversion result:', result);
      
      if (result.success) {
        let successMessage = `Successfully converted ${result.converted} leads to CRM contacts`;
        if (result.companiesCreated && result.companiesCreated > 0) {
          successMessage += `. ${result.companiesCreated} companies were automatically created.`;
        }
        console.log('Success message:', successMessage);
        message.success(successMessage);
        setCurrentStep(3); // Move to success step
      } else {
        message.error('Conversion failed');
      }
    } catch (error) {
      console.error('Conversion process failed:', error);
      message.error('Conversion process failed');
    }
  };

  const handleClose = () => {
    dispatch(clearConversionResult() as any);
    setCurrentStep(0);
    setSelectedLeads(leadIds);
    onCancel();
  };

  const renderLeadSelection = () => (
    <div>
      <Alert
        message="Select Leads for Conversion"
        description={`Review and select the leads you want to convert to CRM contacts. ${leadIds.length} leads were pre-selected.`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        dataSource={leadsToConvert}
        rowKey="id"
        pagination={false}
        size="small"
        rowSelection={{
          selectedRowKeys: selectedLeads,
          onChange: (keys) => setSelectedLeads(keys as string[]),
          getCheckboxProps: (record) => ({
            name: record.fullName,
          }),
        }}
        scroll={{ y: 300 }}
        columns={[
          {
            title: 'Lead',
            key: 'lead',
            render: (record: PotentialLead) => (
              <Space>
                <Avatar 
                  src={record.linkedinUrl ? `https://unavatar.io/linkedin/${record.linkedinUrl.split('/').pop()}` : undefined}
                  icon={<UserOutlined />}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{record.fullName}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.jobTitle} at {record.companyName}
                  </div>
                </div>
              </Space>
            ),
          },
          {
            title: 'Contact Info',
            key: 'contact',
            render: (record: PotentialLead) => (
              <Space direction="vertical" size="small">
                {record.email && (
                  <Space size="small">
                    <MailOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontSize: '12px' }}>{record.email}</span>
                  </Space>
                )}
                {record.phone && (
                  <Space size="small">
                    <PhoneOutlined style={{ color: '#52c41a' }} />
                    <span style={{ fontSize: '12px' }}>{record.phone}</span>
                  </Space>
                )}
              </Space>
            ),
          },
          {
            title: 'Score',
            dataIndex: 'leadScore',
            key: 'score',
            render: (score: number) => (
              <Progress
                type="circle"
                size={40}
                percent={score}
                format={percent => `${percent}`}
                strokeColor={score >= 70 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f'}
              />
            ),
          },
          {
            title: 'Status',
            key: 'status',
            render: (record: PotentialLead) => (
              <Space direction="vertical" size="small">
                <Tag color={record.status === 'pending_review' ? 'orange' : 'blue'}>
                  {record.status}
                </Tag>
                <Tag color="purple">{record.leadType}</Tag>
              </Space>
            ),
          },
        ]}
      />

      <div style={{ marginTop: 16 }}>
        <Space>
          <Button 
            onClick={() => setSelectedLeads(leadsToConvert.map(l => l.id))}
            type="link"
          >
            Select All ({leadsToConvert.length})
          </Button>
          <Button 
            onClick={() => setSelectedLeads([])}
            type="link"
          >
            Clear Selection
          </Button>
        </Space>
      </div>
    </div>
  );

  const renderConversionSettings = () => (
    <Form
      form={form}
      layout="vertical"
      initialValues={conversionSettings}
      onValuesChange={(_, values) => setConversionSettings(values)}
    >
      <Alert
        message="Conversion Settings"
        description="Configure how the leads will be imported into your CRM system."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Default Lead Source"
            name="defaultSource"
            help="This will be set as the source for all imported contacts"
          >
            <Input placeholder="e.g., PDL Import, LinkedIn Outreach" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label="Default Owner"
            name="defaultOwner"
            help="Assign all leads to a specific user"
          >
            <Select placeholder="Select user" allowClear>
              <Option value="admin">Admin User</Option>
              <Option value="sales_manager">Sales Manager</Option>
              <Option value="lead_gen">Lead Generation Team</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="Default Tags"
        name="defaultTags"
        help="Tags to automatically apply to imported contacts"
      >
        <Select
          mode="tags"
          placeholder="Add tags..."
          tokenSeparators={[',']}
        >
          <Option value="PDL Lead">PDL Lead</Option>
          <Option value="Imported">Imported</Option>
          <Option value="Cold Lead">Cold Lead</Option>
          <Option value="High Priority">High Priority</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="Additional Notes"
        name="notes"
      >
        <TextArea
          rows={3}
          placeholder="Add any notes that will be attached to all imported contacts..."
        />
      </Form.Item>

      <Divider orientation="left">Import Options</Divider>

      <Space direction="vertical">
        <Checkbox
          checked={conversionSettings.createCompanies}
          onChange={(e) => setConversionSettings({
            ...conversionSettings,
            createCompanies: e.target.checked
          })}
        >
          <Space>
            <BankOutlined />
            <span>Create company records for new companies</span>
          </Space>
        </Checkbox>

        <Checkbox
          checked={conversionSettings.updateExisting}
          onChange={(e) => setConversionSettings({
            ...conversionSettings,
            updateExisting: e.target.checked
          })}
        >
          <Space>
            <UserAddOutlined />
            <span>Update existing contacts if found (match by email)</span>
          </Space>
        </Checkbox>

        <Checkbox
          checked={conversionSettings.sendWelcomeEmail}
          onChange={(e) => setConversionSettings({
            ...conversionSettings,
            sendWelcomeEmail: e.target.checked
          })}
        >
          <Space>
            <MailOutlined />
            <span>Send welcome email to imported contacts</span>
          </Space>
        </Checkbox>
      </Space>
    </Form>
  );

  const renderConversionProgress = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Spin 
        indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        spinning={loading.conversion}
      >
        <Space direction="vertical" size="large">
          <div>
            <TeamOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          </div>
          
          <div>
            <Title level={3}>Converting Leads to CRM</Title>
            <Text type="secondary">
              Converting {selectedLeads.length} leads to CRM contacts...
            </Text>
          </div>

          <Progress 
            percent={loading.conversion ? 50 : 100}
            status={loading.conversion ? "active" : "success"}
            size={[400, 8]}
            style={{ maxWidth: 400 }}
          />

          <div>
            <Text>
              Please wait while we process your leads and create CRM records.
            </Text>
          </div>
        </Space>
      </Spin>
    </div>
  );

  const renderConversionResults = () => {
    if (!conversionResult) return null;

    const isSuccess = conversionResult.success && conversionResult.converted > 0;

    return (
      <div style={{ textAlign: 'center' }}>
        <Result
          status={isSuccess ? "success" : "error"}
          title={isSuccess ? "Conversion Successful!" : "Conversion Failed"}
          subTitle={
            isSuccess 
              ? `Successfully converted ${conversionResult.converted} out of ${selectedLeads.length} leads to CRM contacts.${(conversionResult.companiesCreated && conversionResult.companiesCreated > 0) ? ` ${conversionResult.companiesCreated} companies were automatically created.` : ''}`
              : `Failed to convert leads. ${conversionResult.failed || 0} errors occurred.`
          }
          icon={isSuccess ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        >
          {isSuccess && (
            <Space direction="vertical" size="large">
              <Card size="small" style={{ maxWidth: 500, margin: '0 auto' }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Converted"
                      value={conversionResult.converted}
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Failed"
                      value={conversionResult.failed}
                      valueStyle={{ color: '#cf1322' }}
                      prefix={<ExclamationCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Companies Created"
                      value={conversionResult.companiesCreated || 0}
                      valueStyle={{ color: '#1890ff' }}
                      prefix={<BankOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Success Rate"
                      value={Math.round((conversionResult.converted / selectedLeads.length) * 100)}
                      suffix="%"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                </Row>
              </Card>

              <div>
                <Text strong>Next Steps:</Text>
                <List
                  size="small"
                  style={{ textAlign: 'left', maxWidth: 400, margin: '16px auto 0' }}
                  dataSource={[
                    'Review imported contacts in the CRM system',
                    'Assign leads to appropriate team members',
                    'Set up follow-up tasks and sequences',
                    'Update lead scoring if needed'
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      {item}
                    </List.Item>
                  )}
                />
              </div>

              <Space style={{ marginTop: 24 }}>
                <Button 
                  type="primary" 
                  icon={<TeamOutlined />}
                  onClick={() => {
                    navigate('/contacts', { 
                      state: { 
                        filter: { source: 'pdl_discovery' }
                      }
                    });
                    handleClose();
                  }}
                >
                  View Contacts
                </Button>
                <Button onClick={handleClose}>
                  Close
                </Button>
              </Space>
            </Space>
          )}

          {conversionResult.errors && conversionResult.errors.length > 0 && (
            <Card 
              title="Error Details" 
              size="small"
              style={{ maxWidth: 500, margin: '16px auto', textAlign: 'left' }}
            >
              <List
                size="small"
                dataSource={conversionResult.errors}
                renderItem={(error) => (
                  <List.Item>
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                    {error}
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Result>
      </div>
    );
  };

  const steps = [
    {
      title: 'Select Leads',
      content: renderLeadSelection(),
      description: 'Choose which leads to convert'
    },
    {
      title: 'Configure Settings',
      content: renderConversionSettings(),
      description: 'Set conversion preferences'
    },
    {
      title: 'Convert',
      content: renderConversionProgress(),
      description: 'Processing leads'
    },
    {
      title: 'Complete',
      content: renderConversionResults(),
      description: 'Conversion results'
    }
  ];

  return (
    <Modal
      title={`Convert Leads to CRM (${selectedLeads.length} selected)`}
      open={visible}
      onCancel={handleClose}
      width={800}
      style={{ top: 20 }}
      footer={
        <div style={{ textAlign: 'right' }}>
          {currentStep > 0 && currentStep < 3 && (
            <Button onClick={handleBack} style={{ marginRight: 8 }}>
              Back
            </Button>
          )}
          
          {currentStep < 2 && (
            <Button type="primary" onClick={handleNext}>
              {currentStep === 1 ? 'Start Conversion' : 'Next'}
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button 
              type="primary" 
              onClick={handleConvert}
              loading={loading.conversion}
              disabled={selectedLeads.length === 0}
            >
              Convert {selectedLeads.length} Leads
            </Button>
          )}
          
          {currentStep === 3 && (
            <Button type="primary" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      }
    >
      <div style={{ marginBottom: 24 }}>
        <Steps current={currentStep} size="small">
          {steps.map((step, index) => (
            <Step 
              key={index} 
              title={step.title} 
              description={step.description}
            />
          ))}
        </Steps>
      </div>

      <div style={{ minHeight: 400 }}>
        {steps[currentStep].content}
      </div>

      {error.conversion && (
        <Alert
          message="Conversion Error"
          description={error.conversion}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default CRMConversion;