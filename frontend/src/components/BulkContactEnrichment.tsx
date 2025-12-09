import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Tag,
  Checkbox,
  Space,
  Progress,
  Alert,
  Typography,
  Card,
  Row,
  Col,
  Descriptions,
  message,
  Spin,
  Divider,
  List
} from 'antd';
import {
  UserOutlined,
  LinkOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  TrophyOutlined,
  GlobalOutlined,
  TeamOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  GithubOutlined,
  TwitterOutlined,
  ContactsOutlined,
  InfoCircleOutlined,
  PhoneFilled,
  MailFilled,
  ShopOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { api } from '../services/api';

const { Text, Title } = Typography;

interface Lead {
  id: string;
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  skills?: string[];
  rawData?: any;
  industry?: string;
}

interface BulkContactEnrichmentProps {
  contacts: any[];
  visible: boolean;
  onClose: () => void;
  onEnrichComplete?: (enrichedContacts: any[]) => void;
}

const BulkContactEnrichment: React.FC<BulkContactEnrichmentProps> = ({
  contacts,
  visible,
  onClose,
  onEnrichComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [contactMatches, setContactMatches] = useState<Map<string, Lead[]>>(new Map());
  const [selectedMatches, setSelectedMatches] = useState<Map<string, string>>(new Map()); // contactId -> leadId
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: find matches, 1: select fields, 2: enrich

  useEffect(() => {
    if (visible && contacts.length > 0) {
      findAllMatches();
    } else {
      // Reset state when modal closes
      setContactMatches(new Map());
      setSelectedMatches(new Map());
      setSelectedFields([]);
      setCurrentStep(0);
    }
  }, [visible, contacts]);

  const findAllMatches = async () => {
    setLoading(true);
    const matches = new Map<string, Lead[]>();
    
    try {
      for (const contact of contacts) {
        try {
          const response = await api.get(`/contacts/${contact.id}/pdl-matches`);
          if (response.data.success && response.data.data.matches.length > 0) {
            matches.set(contact.id, response.data.data.matches);
          }
        } catch (error) {
          console.error(`Failed to find matches for contact ${contact.id}:`, error);
        }
      }
      setContactMatches(matches);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error finding matches:', error);
      message.error('Failed to find PDL matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (contactId: string, leadId: string) => {
    setSelectedMatches(prev => new Map(prev.set(contactId, leadId)));
  };

  const getAvailableFields = () => {
    const allFields = new Set<string>();
    
    selectedMatches.forEach((leadId, contactId) => {
      const contact = contacts.find(c => c.id === contactId);
      const matches = contactMatches.get(contactId) || [];
      const lead = matches.find(l => l.id === leadId);
      
      if (contact && lead) {
        // Add available enrichment fields
        if (lead.phone && !contact.phone) allFields.add('phone');
        if (lead.email && !contact.email) allFields.add('email');
        if (lead.jobTitle && !contact.jobTitle) allFields.add('jobTitle');
        if (lead.linkedinUrl && !contact.linkedinUrl) allFields.add('linkedinUrl');
        if (lead.skills && lead.skills.length > 0) allFields.add('skills');
        if (lead.location) allFields.add('location');
        if (lead.industry) allFields.add('industry');
        if (lead.rawData?.education) allFields.add('education');
        if (lead.rawData?.experience) allFields.add('experience');
        if (lead.rawData?.languages) allFields.add('languages');
        if (lead.rawData?.certifications) allFields.add('certifications');
      }
    });
    
    return Array.from(allFields);
  };

  const handleBulkEnrich = async () => {
    if (selectedMatches.size === 0 || selectedFields.length === 0) {
      message.warning('Please select matches and fields to enrich');
      return;
    }

    setEnriching(true);
    const enrichedContacts: any[] = [];
    let successCount = 0;
    let failureCount = 0;
    let companiesCreated = 0;

    try {
      for (const [contactId, leadId] of selectedMatches.entries()) {
        try {
          const response = await api.post(`/pdl/contacts/${contactId}/enrich`, {
            leadId,
            selectedFields
          });

          if (response.data.success) {
            enrichedContacts.push(response.data.data.contact);
            if (response.data.data.companyCreated) {
              companiesCreated++;
            }
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error(`Failed to enrich contact ${contactId}:`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        let successMessage = `Successfully enriched ${successCount} contact(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`;
        if (companiesCreated > 0) {
          successMessage += `. ${companiesCreated} companies were automatically created and linked.`;
        }
        message.success(successMessage);
        onEnrichComplete?.(enrichedContacts);
        onClose();
      } else {
        message.error('Failed to enrich any contacts');
      }
    } catch (error) {
      console.error('Bulk enrichment error:', error);
      message.error('Failed to perform bulk enrichment');
    } finally {
      setEnriching(false);
    }
  };

  const renderContactMatchSelection = () => (
    <div>
      <Title level={4}>Select PDL Matches for Each Contact</Title>
      <List
        dataSource={contacts}
        renderItem={(contact) => {
          const matches = contactMatches.get(contact.id) || [];
          const selectedMatch = selectedMatches.get(contact.id);
          
          return (
            <List.Item>
              <Card style={{ width: '100%' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>{contact.firstName} {contact.lastName}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({contact.email})
                  </Text>
                </div>
                
                {matches.length > 0 ? (
                  <div>
                    <Text>Select a match:</Text>
                    <div style={{ marginTop: 8 }}>
                      {matches.map((lead) => (
                        <Card 
                          key={lead.id}
                          size="small"
                          style={{ 
                            marginBottom: 8, 
                            cursor: 'pointer',
                            border: selectedMatch === lead.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                          }}
                          onClick={() => handleSelectMatch(contact.id, lead.id)}
                        >
                          <Row gutter={16}>
                            <Col span={12}>
                              <div>
                                <Text strong>{lead.fullName}</Text>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {lead.jobTitle}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {lead.companyName}
                                </div>
                              </div>
                            </Col>
                            <Col span={12}>
                              <div>
                                {lead.skills && lead.skills.length > 0 && (
                                  <div>
                                    {lead.skills.slice(0, 3).map((skill, idx) => (
                                      <Tag key={idx} size="small">{skill}</Tag>
                                    ))}
                                    {lead.skills.length > 3 && <Tag>+{lead.skills.length - 3}</Tag>}
                                  </div>
                                )}
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert message="No PDL matches found for this contact" type="info" />
                )}
              </Card>
            </List.Item>
          );
        }}
      />
    </div>
  );

  const renderFieldSelection = () => {
    const availableFields = getAvailableFields();
    
    const fieldLabels: { [key: string]: { label: string; icon: React.ReactNode } } = {
      phone: { label: 'Phone', icon: <PhoneOutlined /> },
      email: { label: 'Email', icon: <MailOutlined /> },
      jobTitle: { label: 'Job Title', icon: <UserOutlined /> },
      linkedinUrl: { label: 'LinkedIn URL', icon: <LinkOutlined /> },
      skills: { label: 'Skills', icon: <ToolOutlined /> },
      location: { label: 'Location', icon: <EnvironmentOutlined /> },
      industry: { label: 'Industry', icon: <ShopOutlined /> },
      education: { label: 'Education', icon: <BankOutlined /> },
      experience: { label: 'Work Experience', icon: <UserOutlined /> },
      languages: { label: 'Languages', icon: <GlobalOutlined /> },
      certifications: { label: 'Certifications', icon: <SafetyCertificateOutlined /> },
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4}>Select Fields to Enrich</Title>
          <Space>
            <Button size="small" onClick={() => setSelectedFields(availableFields)}>
              Select All
            </Button>
            <Button size="small" onClick={() => setSelectedFields([])}>
              Clear All
            </Button>
          </Space>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
          {availableFields.map((field) => (
            <Card key={field} size="small">
              <Checkbox
                checked={selectedFields.includes(field)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields([...selectedFields, field]);
                  } else {
                    setSelectedFields(selectedFields.filter(f => f !== field));
                  }
                }}
              >
                <Space>
                  {fieldLabels[field]?.icon}
                  {fieldLabels[field]?.label || field}
                </Space>
              </Checkbox>
            </Card>
          ))}
        </div>
        
        {availableFields.length === 0 && (
          <Alert
            message="No fields available for enrichment"
            description="Please select matches for contacts first."
            type="info"
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      title={`Bulk Contact Enrichment (${contacts.length} contacts)`}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        currentStep === 1 && (
          <Button 
            key="next" 
            type="primary"
            onClick={() => setCurrentStep(2)}
            disabled={selectedMatches.size === 0}
          >
            Next: Select Fields ({selectedMatches.size} matches selected)
          </Button>
        ),
        currentStep === 2 && (
          <Button
            key="enrich"
            type="primary"
            loading={enriching}
            disabled={selectedFields.length === 0}
            onClick={handleBulkEnrich}
          >
            Enrich {selectedMatches.size} Contact(s) ({selectedFields.length} fields)
          </Button>
        ),
      ]}
    >
      <Spin spinning={loading}>
        {currentStep === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Title level={4}>Finding PDL matches for {contacts.length} contacts...</Title>
          </div>
        )}
        
        {currentStep === 1 && renderContactMatchSelection()}
        
        {currentStep === 2 && renderFieldSelection()}
      </Spin>
    </Modal>
  );
};

export default BulkContactEnrichment;