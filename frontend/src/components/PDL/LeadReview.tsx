import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Avatar,
  Tooltip,
  Rate,
  Modal,
  Select,
  message,
  Checkbox,
  Row,
  Col,
  Statistic,
  Progress,
  Dropdown,
  Drawer,
  Descriptions,
  Badge,
  Input
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  TwitterOutlined,
  StarOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  FilterOutlined,
  ReloadOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  fetchLeads,
  updateLead,
  deleteLead,
  setSelectedLeads,
  toggleLeadSelection,
  selectAllLeads,
  clearSelection,
  bulkUpdateLeads,
  enrichLead,
  setCurrentLead
} from '../../features/pdl/pdlSlice';
import { PotentialLead } from '../../services/pdlService';

const { Option } = Select;
const { Search } = Input;

interface LeadReviewProps {
  onConvertLeads?: (leadIds: string[]) => void;
}

const LeadReview: React.FC<LeadReviewProps> = ({ onConvertLeads }) => {
  const dispatch = useDispatch();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PotentialLead | null>(null);
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    lead_type: 'all',
    search: ''
  });

  const {
    leads = [], // Provide default empty array for leads
    selectedLeads = [], // Provide default empty array for selectedLeads
    loading = { leads: false, search: false, conversion: false, queries: false, enrichment: false }, // Provide default loading states
    pagination = { page: 1, limit: 20, total: 0, totalPages: 0 }, // Provide default pagination
    currentLead
  } = useSelector((state: RootState) => state.pdl);

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.search && { search: filters.search })
    };
    dispatch(fetchLeads(params) as any);
  };

  const handleLeadClick = (lead: PotentialLead) => {
    setSelectedLead(lead);
    setDetailsVisible(true);
    dispatch(setCurrentLead(lead) as any);
  };

  const handleUpdateStatus = async (leadId: string, status: string) => {
    try {
      await dispatch(updateLead({ id: leadId, data: { status: status as any } }) as any).unwrap();
      message.success('Lead status updated');
    } catch (error) {
      message.error('Failed to update lead status');
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedLeads.length === 0) {
      message.warning('Please select leads first');
      return;
    }

    try {
      if (action === 'convert') {
        onConvertLeads?.(selectedLeads);
      } else if (action === 'delete') {
        Modal.confirm({
          title: 'Delete Selected Leads',
          content: `Are you sure you want to delete ${selectedLeads.length} leads?`,
          okType: 'danger',
          onOk: async () => {
            for (const leadId of selectedLeads) {
              await dispatch(deleteLead(leadId) as any).unwrap();
            }
            message.success(`Deleted ${selectedLeads.length} leads`);
            dispatch(clearSelection() as any);
          }
        });
        return;
      } else {
        const updates: any = { leadIds: selectedLeads };
        if (action === 'status') updates.status = value;
        if (action === 'type') updates.leadType = value;
        
        await dispatch(bulkUpdateLeads(updates) as any).unwrap();
        message.success(`Updated ${selectedLeads.length} leads`);
      }
      
      setBulkActionVisible(false);
      dispatch(clearSelection() as any);
    } catch (error) {
      message.error('Bulk action failed');
    }
  };

  const handleEnrichLead = async (leadId: string) => {
    try {
      await dispatch(enrichLead(leadId) as any).unwrap();
      message.success('Lead data enriched successfully');
    } catch (error) {
      message.error('Failed to enrich lead data');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    if (score >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'orange',
      reviewed: 'blue',
      converted: 'green',
      rejected: 'red'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Lead',
      key: 'lead',
      width: 250,
      render: (record: PotentialLead) => (
        <Space>
          <Checkbox
            checked={selectedLeads.includes(record.id)}
            onChange={() => dispatch(toggleLeadSelection(record.id) as any)}
          />
          <Avatar 
            src={record.linkedinUrl && typeof record.linkedinUrl === 'string' ? `https://unavatar.io/linkedin/${record.linkedinUrl.split('/').pop()}` : undefined}
            icon={<UserOutlined />}
            size="large"
          />
          <div>
            <div style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleLeadClick(record)}>
              {record.fullName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.jobTitle}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.companyName}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'leadScore',
      key: 'score',
      width: 120,
      sorter: true,
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            size={50}
            percent={score}
            format={percent => `${percent}`}
            strokeColor={getScoreColor(score)}
          />
          <div style={{ fontSize: '11px', marginTop: 4 }}>
            <Rate 
              disabled 
              allowHalf 
              value={score / 20} 
              style={{ fontSize: 10 }} 
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contact',
      width: 180,
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
          <Space size="small">
            {record.linkedinUrl && (
              <Tooltip title="LinkedIn Profile">
                <Button
                  type="link"
                  icon={<LinkedinOutlined />}
                  size="small"
                  href={record.linkedinUrl}
                  target="_blank"
                />
              </Tooltip>
            )}
            {record.twitterUrl && (
              <Tooltip title="Twitter Profile">
                <Button
                  type="link"
                  icon={<TwitterOutlined />}
                  size="small"
                  href={record.twitterUrl}
                  target="_blank"
                />
              </Tooltip>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Skills & Type',
      key: 'skills',
      width: 200,
      render: (record: PotentialLead) => (
        <Space direction="vertical" size="small">
          <div>
            <Tag color="purple">{record.leadType}</Tag>
            <Tag color="cyan">{record.industry}</Tag>
          </div>
          <div>
            {Array.isArray(record.skills) && record.skills.length > 0 && record.skills.slice(0, 3).map((skill, index) => (
              <Tag key={`${skill}-${index}`}>{skill}</Tag>
            ))}
            {Array.isArray(record.skills) && record.skills.length > 3 && (
              <Tag>+{record.skills.length - 3} more</Tag>
            )}
            {(!record.skills || !Array.isArray(record.skills) || record.skills.length === 0) && (
              <Tag color="default">No skills listed</Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location: string) => (
        <div style={{ fontSize: '12px' }}>
          {location}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Reviewed', value: 'reviewed' },
        { text: 'Converted', value: 'converted' },
        { text: 'Rejected', value: 'rejected' },
      ],
      render: (status: string, record: PotentialLead) => (
        <Select
          value={status}
          size="small"
          style={{ width: '100%' }}
          onChange={(value) => handleUpdateStatus(record.id, value)}
        >
          <Option value="pending">
            <Badge status="processing" text="Pending" />
          </Option>
          <Option value="reviewed">
            <Badge status="default" text="Reviewed" />
          </Option>
          <Option value="converted">
            <Badge status="success" text="Converted" />
          </Option>
          <Option value="rejected">
            <Badge status="error" text="Rejected" />
          </Option>
        </Select>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record: PotentialLead) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => handleLeadClick(record)
              },
              {
                key: 'enrich',
                label: 'Enrich Data',
                icon: <ReloadOutlined />,
                onClick: () => handleEnrichLead(record.id)
              },
              {
                key: 'convert',
                label: 'Convert to CRM',
                icon: <CheckOutlined />,
                onClick: () => onConvertLeads?.([record.id])
              },
              { type: 'divider' },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: 'Delete Lead',
                    content: 'Are you sure you want to delete this lead?',
                    okType: 'danger',
                    onOk: () => dispatch(deleteLead(record.id) as any)
                  });
                }
              }
            ]
          }}
        >
          <Button icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {/* Header with Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Leads" 
              value={pagination.total} 
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Selected" 
              value={selectedLeads.length} 
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Avg Score" 
              value={leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length) : 0}
              suffix="/ 100"
              prefix={<StarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Conversion Rate" 
              value={pagination.total > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / pagination.total) * 100) : 0}
              suffix="%"
              prefix={<ExportOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Search
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onSearch={handleRefresh}
                style={{ width: 200 }}
              />
              <Select
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                style={{ width: 120 }}
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="reviewed">Reviewed</Option>
                <Option value="converted">Converted</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
            </Space>
          </Col>
          
          <Col span={8} style={{ textAlign: 'center' }}>
            <Space>
              <Button
                type={selectedLeads.length > 0 ? "primary" : "default"}
                onClick={() => dispatch(selectAllLeads() as any)}
                disabled={leads.length === 0}
              >
                Select All ({leads.length})
              </Button>
              <Button
                onClick={() => dispatch(clearSelection() as any)}
                disabled={selectedLeads.length === 0}
              >
                Clear Selection
              </Button>
            </Space>
          </Col>
          
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading.leads}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => setBulkActionVisible(true)}
                disabled={selectedLeads.length === 0}
              >
                Bulk Actions ({selectedLeads.length})
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Leads Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(leads) ? leads : []}
          rowKey="id"
          loading={loading.leads}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} leads`,
          }}
          onChange={(pag, filters, sorter) => {
            const params = {
              page: pag.current || 1,
              limit: pag.pageSize || 20,
            };
            dispatch(fetchLeads(params) as any);
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Lead Details Drawer */}
      <Drawer
        title={selectedLead?.fullName}
        width={600}
        open={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => selectedLead && onConvertLeads?.([selectedLead.id])}
            >
              Convert to CRM
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => selectedLead && handleEnrichLead(selectedLead.id)}
              loading={loading.enrichment}
            >
              Enrich Data
            </Button>
          </Space>
        }
      >
        {selectedLead && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Lead Score */}
            <Card size="small" title="Lead Quality Score">
              <Row align="middle">
                <Col span={8}>
                  <Progress
                    type="circle"
                    percent={selectedLead.leadScore}
                    format={percent => `${percent}`}
                    strokeColor={getScoreColor(selectedLead.leadScore)}
                  />
                </Col>
                <Col span={16}>
                  <Rate 
                    disabled 
                    allowHalf 
                    value={selectedLead.leadScore / 20}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Tag color={getScoreColor(selectedLead.leadScore)}>
                      {selectedLead.leadScore >= 80 ? 'Excellent' :
                       selectedLead.leadScore >= 60 ? 'Good' :
                       selectedLead.leadScore >= 40 ? 'Fair' : 'Poor'}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Basic Info */}
            <Descriptions title="Contact Information" bordered column={1}>
              <Descriptions.Item label="Full Name">{selectedLead.fullName}</Descriptions.Item>
              <Descriptions.Item label="Job Title">{selectedLead.jobTitle}</Descriptions.Item>
              <Descriptions.Item label="Company">{selectedLead.companyName}</Descriptions.Item>
              <Descriptions.Item label="Location">{selectedLead.locationCountry}</Descriptions.Item>
              <Descriptions.Item label="Industry">{selectedLead.industry}</Descriptions.Item>
              <Descriptions.Item label="Lead Type">
                <Tag color="purple">{selectedLead.leadType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={getStatusColor(selectedLead.status) as any} 
                  text={selectedLead.status} 
                />
              </Descriptions.Item>
            </Descriptions>

            {/* Contact Details */}
            <Descriptions title="Contact Details" bordered column={1}>
              <Descriptions.Item label="Email">
                {selectedLead.email ? (
                  <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>
                ) : 'Not available'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedLead.phone ? (
                  <a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a>
                ) : 'Not available'}
              </Descriptions.Item>
              <Descriptions.Item label="LinkedIn">
                {selectedLead.linkedinUrl ? (
                  <a href={selectedLead.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <LinkedinOutlined /> View Profile
                  </a>
                ) : 'Not available'}
              </Descriptions.Item>
              <Descriptions.Item label="Twitter">
                {selectedLead.twitterUrl ? (
                  <a href={selectedLead.twitterUrl} target="_blank" rel="noopener noreferrer">
                    <TwitterOutlined /> View Profile
                  </a>
                ) : 'Not available'}
              </Descriptions.Item>
            </Descriptions>

            {/* Skills */}
            <Card size="small" title="Skills & Expertise">
              <Space wrap>
                {Array.isArray(selectedLead.skills) && selectedLead.skills.map(skill => (
                  <Tag key={skill} color="blue">{skill}</Tag>
                ))}
                {(!selectedLead.skills || !Array.isArray(selectedLead.skills) || selectedLead.skills.length === 0) && (
                  <Tag color="default">No skills listed</Tag>
                )}
              </Space>
            </Card>

            {/* Timestamps */}
            <Descriptions title="Tracking Info" bordered column={1}>
              <Descriptions.Item label="Discovered">
                {new Date(selectedLead.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {new Date(selectedLead.updatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="PDL ID">{selectedLead.pdl_id}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      {/* Bulk Actions Modal */}
      <Modal
        title={`Bulk Actions (${selectedLeads.length} leads selected)`}
        open={bulkActionVisible}
        onCancel={() => setBulkActionVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleBulkAction('convert')}
            block
            size="large"
          >
            Convert to CRM Contacts
          </Button>
          
          <Space.Compact style={{ width: '100%' }}>
            <Select
              placeholder="Update Status"
              style={{ flex: 1 }}
              onChange={(value) => handleBulkAction('status', value)}
            >
              <Option value="pending">Pending</Option>
              <Option value="reviewed">Reviewed</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </Space.Compact>

          <Space.Compact style={{ width: '100%' }}>
            <Select
              placeholder="Update Lead Type"
              style={{ flex: 1 }}
              onChange={(value) => handleBulkAction('type', value)}
            >
              <Option value="staff">Staff</Option>
              <Option value="client">Client</Option>
              <Option value="general">General</Option>
            </Select>
          </Space.Compact>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleBulkAction('delete')}
            block
          >
            Delete Selected Leads
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default LeadReview;