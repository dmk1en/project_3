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
  TeamOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  fetchLeads,
  setSelectedLeads,
  toggleLeadSelection,
  selectAllLeads,
  clearSelection,
  bulkUpdateLeads,
  setCurrentLead
} from '../../features/pdl/pdlSlice';
import { PotentialLead } from '../../services/pdlService';
import ManualLeadModal from './ManualLeadModal';
import { getErrorMessage } from '../../utils/errorUtils';

const { Option } = Select;
const { Search } = Input;

interface LeadReviewProps {
  onConvertLeads?: (leads: PotentialLead[]) => void;
}

const LeadReview: React.FC<LeadReviewProps> = ({ onConvertLeads }) => {
  const dispatch = useDispatch();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PotentialLead | null>(null);
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  const [manualLeadModalVisible, setManualLeadModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<PotentialLead | null>(null);
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

  const handleEditLead = (lead: PotentialLead) => {
    setEditingLead(lead);
    setManualLeadModalVisible(true);
  };

  const handleDeleteLead = async (lead: PotentialLead) => {
    Modal.confirm({
      title: 'Delete Lead',
      content: `Are you sure you want to delete "${lead.fullName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const { pdlService } = await import('../../services/pdlService');
          await pdlService.deleteLead(lead.id);
          message.success(`Deleted ${lead.fullName}`);
          handleRefresh();
        } catch (error: any) {
          message.error(`Failed to delete lead: ${getErrorMessage(error, 'Delete failed')}`);
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead.id));
    const manualLeads = selectedLeadObjects.filter(lead => lead.isManual || !lead.pdlProfileId);
    const convertedLeads = selectedLeadObjects.filter(lead => lead.status === 'converted');
    
    if (convertedLeads.length > 0) {
      message.error(`Cannot delete ${convertedLeads.length} leads that have been converted to CRM contacts`);
      return;
    }
    
    if (manualLeads.length === 0) {
      message.error('Only manual leads can be deleted. PDL-sourced leads cannot be deleted.');
      return;
    }
    
    if (manualLeads.length < selectedLeadObjects.length) {
      message.warning(`Only ${manualLeads.length} out of ${selectedLeadObjects.length} selected leads can be deleted (manual leads only)`);
    }

    Modal.confirm({
      title: 'Delete Leads',
      content: `Are you sure you want to delete ${manualLeads.length} lead(s)? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        let successful = 0;
        let failed = 0;
        const errors: string[] = [];

        try {
          const { pdlService } = await import('../../services/pdlService');
          
          for (const lead of manualLeads) {
            try {
              await pdlService.deleteLead(lead.id);
              successful++;
            } catch (error: any) {
              failed++;
              errors.push(`${lead.fullName}: ${error.response?.data?.error?.message || error.message}`);
            }
          }

          if (successful > 0) {
            message.success(`Successfully deleted ${successful} lead(s)`);
            handleRefresh();
            dispatch(clearSelection() as any);
          }
          
          if (failed > 0) {
            Modal.error({
              title: 'Some deletions failed',
              content: (
                <div>
                  <p>{failed} lead(s) could not be deleted:</p>
                  <ul>
                    {errors.map((error, index) => (
                      <li key={index} style={{ fontSize: '12px' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )
            });
          }
        } catch (error: any) {
          message.error(`Bulk delete failed: ${getErrorMessage(error, 'Bulk delete failed')}`);
        }
      }
    });
  };

  const handleEnrichLead = async (lead: PotentialLead) => {
    try {
      const { pdlService } = await import('../../services/pdlService');
      
      message.loading({ content: 'Enriching lead data...', key: 'enrich' });
      
      // For PDL-sourced leads, force enrichment
      const isPDLSourced = !!lead.pdl_id;
      const result = await pdlService.enrichLead(lead.id, isPDLSourced);
      
      if (result.success) {
        // Show success message with optional warning
        if (result.warning) {
          message.warning({ 
            content: `Enriched ${lead.fullName} - ${result.warning}`, 
            key: 'enrich',
            duration: 6
          });
        } else {
          message.success({ 
            content: `Successfully enriched ${lead.fullName}`, 
            key: 'enrich' 
          });
        }
        
        // Refresh the leads list to show updated data
        handleRefresh();
        
        // Show enriched data in a modal
        Modal.success({
          title: result.warning ? 'Enrichment Completed with Warnings' : 'Enrichment Successful',
          content: (
            <div>
              <p><strong>Lead:</strong> {lead.fullName}</p>
              {result.warning && (
                <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#d46b08' }}><strong>⚠️ Warning:</strong> {result.warning}</p>
                </div>
              )}
              {result.updatedFields && Object.keys(result.updatedFields).length > 0 && (
                <>
                  <p><strong>Updated fields:</strong></p>
                  <ul>
                    {Object.entries(result.updatedFields).map(([key, value]) => (
                      <li key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}</li>
                    ))}
                  </ul>
                </>
              )}
              {(!result.updatedFields || Object.keys(result.updatedFields).length === 0) && (
                <p>No new data was found during enrichment, but the process completed successfully.</p>
              )}
            </div>
          ),
          width: 500
        });
      } else {
        // Show detailed error with warning if available
        const errorMessage = result.error?.message || result.error || 'Unknown error';
        const fullMessage = result.warning 
          ? `${errorMessage} - Tip: ${result.warning}`
          : errorMessage;
          
        message.error({ 
          content: `Enrichment failed: ${fullMessage}`, 
          key: 'enrich',
          duration: 8
        });
        
        // Show detailed modal for insufficient data errors
        if (result.warning) {
          Modal.warning({
            title: 'Enrichment Failed - Insufficient Data',
            content: (
              <div>
                <p><strong>Lead:</strong> {lead.fullName}</p>
                <p><strong>Error:</strong> {errorMessage}</p>
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#d46b08' }}><strong>💡 Suggestion:</strong> {result.warning}</p>
                </div>
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                  Try adding more contact information like email, phone, company, or location for better enrichment results.
                </p>
              </div>
            ),
            width: 500
          });
        }
      }
    } catch (error: any) {
      message.error({ 
        content: `Enrichment failed: ${error.message || 'Network error'}`, 
        key: 'enrich' 
      });
    }
  };

  const handleBulkEnrichment = async () => {
    const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead.id));
    const totalLeads = selectedLeadObjects.length;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const { pdlService } = await import('../../services/pdlService');
      
      message.loading({ content: `Enriching ${totalLeads} leads...`, key: 'bulkEnrich' });

      // Enrich leads one by one to avoid overwhelming the API
      for (const lead of selectedLeadObjects) {
        try {
          const isPDLSourced = !!lead.pdl_id;
          const result = await pdlService.enrichLead(lead.id, isPDLSourced);
          
          if (result.success) {
            successful++;
            if (result.warning) {
              errors.push(`${lead.fullName}: ⚠️ ${result.warning}`);
            }
          } else {
            failed++;
            const errorMsg = result.error?.message || result.error || 'Unknown error';
            const fullError = result.warning ? `${errorMsg} (Tip: ${result.warning})` : errorMsg;
            errors.push(`${lead.fullName}: ${fullError}`);
          }
        } catch (error: any) {
          failed++;
          errors.push(`${lead.fullName}: ${error.message || 'Network error'}`);
        }

        // Add a small delay to avoid rate limiting
        if (selectedLeadObjects.indexOf(lead) < selectedLeadObjects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      message.success({ 
        content: `Bulk enrichment completed: ${successful} successful, ${failed} failed`, 
        key: 'bulkEnrich' 
      });

      // Show detailed results
      Modal.info({
        title: 'Bulk Enrichment Results',
        content: (
          <div>
            <p><strong>Total leads processed:</strong> {totalLeads}</p>
            <p><strong>Successful:</strong> {successful}</p>
            <p><strong>Failed:</strong> {failed}</p>
            {errors.length > 0 && (
              <>
                <p><strong>Errors:</strong></p>
                <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {errors.map((error, index) => (
                    <li key={index} style={{ fontSize: '12px' }}>{error}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ),
        width: 600
      });

      // Refresh the leads list to show updated data
      handleRefresh();
      
    } catch (error: any) {
      message.error({ 
        content: `Bulk enrichment failed: ${error.message || 'Unknown error'}`, 
        key: 'bulkEnrich' 
      });
    }
  };

  // Individual lead status updates not available for PDL data retrieval

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedLeads.length === 0) {
      message.warning('Please select leads first');
      return;
    }

    try {
      if (action === 'convert') {
        const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead.id));
        onConvertLeads?.(selectedLeadObjects);
      } else if (action === 'enrich') {
        await handleBulkEnrichment();
      } else if (action === 'delete') {
        await handleBulkDelete();
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

  // Lead enrichment not available for PDL data retrieval

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
              {(record.isManual || !record.pdlProfileId) && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Manual
                </Tag>
              )}
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
                  href={record.linkedinUrl.startsWith('http') ? record.linkedinUrl : `https://${record.linkedinUrl}`}
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
          disabled
          title="Status updates not available for PDL data retrieval"
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
                onClick: () => handleEnrichLead(record)
              },
              ...(record.isManual || !record.pdlProfileId ? [{
                key: 'edit',
                label: 'Edit Lead',
                icon: <EditOutlined />,
                onClick: () => handleEditLead(record)
              }] : []),
              {
                key: 'convert',
                label: 'Convert to CRM',
                icon: <CheckOutlined />,
                onClick: () => onConvertLeads?.([record])
              },
              { type: 'divider' },
              {
                key: 'delete',
                label: record.isManual || !record.pdlProfileId ? 'Delete Lead' : 'Delete Not Available',
                icon: <DeleteOutlined />,
                disabled: !(record.isManual || !record.pdlProfileId) || record.status === 'converted',
                onClick: () => record.isManual || !record.pdlProfileId ? handleDeleteLead(record) : message.info('Delete not available for PDL-sourced leads')
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
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setManualLeadModalVisible(true)}
              >
                Create Manual Lead
              </Button>
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
              onClick={() => selectedLead && onConvertLeads?.([selectedLead])}
            >
              Convert to CRM
            </Button>
            <Button
              icon={<ReloadOutlined />}
              disabled
              title="Enrich data not available for PDL data retrieval"
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
                  <a href={selectedLead.linkedinUrl.startsWith('http') ? selectedLead.linkedinUrl : `https://${selectedLead.linkedinUrl}`} target="_blank" rel="noopener noreferrer">
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
        {selectedLeads.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              <strong>Selected leads breakdown:</strong>
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>Manual leads: {leads.filter(lead => selectedLeads.includes(lead.id) && (lead.isManual || !lead.pdlProfileId)).length}</li>
              <li>PDL-sourced leads: {leads.filter(lead => selectedLeads.includes(lead.id) && lead.pdlProfileId && !lead.isManual).length}</li>
              <li>Converted leads: {leads.filter(lead => selectedLeads.includes(lead.id) && lead.status === 'converted').length}</li>
            </ul>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
              Note: Only manual leads can be deleted. Converted leads cannot be deleted.
            </p>
          </div>
        )}
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
          
          <Button
            icon={<ReloadOutlined />}
            onClick={() => handleBulkAction('enrich')}
            block
            size="large"
          >
            Enrich Selected Leads
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
            disabled={selectedLeads.length === 0}
          >
            Delete Selected Leads
          </Button>
        </Space>
      </Modal>

      {/* Manual Lead Creation/Edit Modal */}
      <ManualLeadModal
        visible={manualLeadModalVisible}
        onCancel={() => {
          setManualLeadModalVisible(false);
          setEditingLead(null);
        }}
        onSuccess={() => {
          setManualLeadModalVisible(false);
          setEditingLead(null);
          handleRefresh();
        }}
        editingLead={editingLead}
      />
    </div>
  );
};

export default LeadReview;