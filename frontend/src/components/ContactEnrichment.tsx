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
  Divider
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

interface ContactMatch {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    linkedinUrl?: string;
    company?: {
      id: string;
      name: string;
    };
    customFields?: any;
  };
  matchScore: number;
  matchReasons: string[];
}

interface Lead {
  id: string;
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  skills?: string[];
  rawData?: any;
  location?: string;
  industry?: string;
}

interface ContactEnrichmentProps {
  contact: any | null;
  visible: boolean;
  onClose: () => void;
  onEnrichComplete?: (enrichedContact: any) => void;
}

const ContactEnrichment: React.FC<ContactEnrichmentProps> = ({
  contact,
  visible,
  onClose,
  onEnrichComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (visible && contact) {
      findMatches();
    } else {
      // Reset state when modal closes
      setMatches([]);
      setSelectedLead(null);
      setSelectedFields([]);
    }
  }, [visible, contact]);

  const findMatches = async () => {
    if (!contact) return;

    setLoading(true);
    try {
      const response = await api.get(`/contacts/${contact.id}/pdl-matches`);
      
      if (response.data.success) {
        setMatches(response.data.data.matches);
        if (response.data.data.matches.length === 0) {
          message.info('No potential PDL lead matches found for this contact');
        }
      } else {
        message.error('Failed to find matches: ' + response.data.error.message);
      }
    } catch (error: any) {
      console.error('Error finding matches:', error);
      message.error('Failed to find PDL lead matches');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableEnrichmentFields = (currentContact: any, lead: Lead) => {
    const fields = [];
    
    // Basic contact fields
    if (lead.phone && !currentContact.phone) {
      fields.push({ key: 'phone', label: 'Phone', value: lead.phone, icon: <PhoneOutlined /> });
    }
    
    if (lead.email && !currentContact.email) {
      fields.push({ key: 'email', label: 'Email', value: lead.email, icon: <MailOutlined /> });
    }
    
    if (lead.jobTitle && (!currentContact.jobTitle || currentContact.jobTitle !== lead.jobTitle)) {
      fields.push({ key: 'jobTitle', label: 'Job Title', value: lead.jobTitle, icon: <UserOutlined /> });
    }
    
    if (lead.linkedinUrl && !currentContact.linkedinUrl) {
      fields.push({ key: 'linkedinUrl', label: 'LinkedIn URL', value: lead.linkedinUrl, icon: <LinkOutlined /> });
    }
    
    // Skills
    if (lead.skills && lead.skills.length > 0 && (!currentContact.customFields?.skills || currentContact.customFields.skills.length === 0)) {
      fields.push({ 
        key: 'skills', 
        label: 'Skills', 
        value: lead.skills.slice(0, 5).join(', ') + (lead.skills.length > 5 ? ` + ${lead.skills.length - 5} more` : ''), 
        icon: <ToolOutlined /> 
      });
    }
    
    // Education
    if (lead.rawData?.education && lead.rawData.education.length > 0 && !currentContact.customFields?.education) {
      const education = lead.rawData.education[0];
      fields.push({ 
        key: 'education', 
        label: 'Education', 
        value: `${education.school?.name || 'N/A'} - ${education.degree_name || 'N/A'}`, 
        icon: <BankOutlined /> 
      });
    }
    
    // Work Experience
    if (lead.rawData?.experience && lead.rawData.experience.length > 0 && !currentContact.customFields?.experience) {
      fields.push({ 
        key: 'experience', 
        label: 'Work Experience', 
        value: `${lead.rawData.experience.length} positions`, 
        icon: <BankOutlined /> 
      });
    }
    
    // Location
    if (lead.location && !currentContact.customFields?.location) {
      fields.push({ key: 'location', label: 'Location', value: lead.location, icon: <EnvironmentOutlined /> });
    }
    
    // Industry
    if (lead.industry && !currentContact.customFields?.industry) {
      fields.push({ key: 'industry', label: 'Industry', value: lead.industry, icon: <ShopOutlined /> });
    }
    
    // Company Name
    if (lead.companyName && !currentContact.customFields?.currentCompany) {
      fields.push({ key: 'companyName', label: 'Current Company', value: lead.companyName, icon: <ShopOutlined /> });
    }
    
    // Twitter Handle (if available in rawData)
    if (Array.isArray(lead.rawData?.profiles) && lead.rawData.profiles.find((p: any) => p.network === 'twitter') && !currentContact.twitterHandle) {
      const twitterProfile = lead.rawData.profiles.find((p: any) => p.network === 'twitter');
      fields.push({ key: 'twitterHandle', label: 'Twitter Handle', value: `@${twitterProfile.username}`, icon: <TwitterOutlined /> });
    }
    
    // GitHub URL (if available in rawData)
    if (Array.isArray(lead.rawData?.profiles) && lead.rawData.profiles.find((p: any) => p.network === 'github') && !currentContact.customFields?.githubUrl) {
      const githubProfile = lead.rawData.profiles.find((p: any) => p.network === 'github');
      fields.push({ key: 'githubUrl', label: 'GitHub Profile', value: githubProfile.url, icon: <GithubOutlined /> });
    }
    
    // Social Profiles
    if (lead.rawData?.profiles && lead.rawData.profiles.length > 0 && !currentContact.customFields?.socialProfiles) {
      const profileCount = lead.rawData.profiles.length;
      fields.push({ key: 'socialProfiles', label: 'Social Profiles', value: `${profileCount} profiles`, icon: <GlobalOutlined /> });
    }
    
    // Certifications
    if (lead.rawData?.certifications && lead.rawData.certifications.length > 0 && !currentContact.customFields?.certifications) {
      fields.push({ 
        key: 'certifications', 
        label: 'Certifications', 
        value: `${lead.rawData.certifications.length} certifications`, 
        icon: <SafetyCertificateOutlined /> 
      });
    }
    
    // Languages
    if (lead.rawData?.languages && lead.rawData.languages.length > 0 && !currentContact.customFields?.languages) {
      fields.push({ 
        key: 'languages', 
        label: 'Languages', 
        value: `${lead.rawData.languages.length} languages`, 
        icon: <GlobalOutlined /> 
      });
    }
    
    // Interests
    if (lead.rawData?.interests && lead.rawData.interests.length > 0 && !currentContact.customFields?.interests) {
      fields.push({ 
        key: 'interests', 
        label: 'Interests', 
        value: `${lead.rawData.interests.length} interests`, 
        icon: <HeartOutlined /> 
      });
    }
    
    // Additional Phone Numbers
    if (lead.rawData?.phone_numbers && lead.rawData.phone_numbers.length > 1 && !currentContact.customFields?.phoneNumbers) {
      fields.push({ 
        key: 'phoneNumbers', 
        label: 'Additional Phone Numbers', 
        value: `${lead.rawData.phone_numbers.length} numbers`, 
        icon: <PhoneFilled /> 
      });
    }
    
    // Work/Personal Emails
    if (Array.isArray(lead.rawData?.emails) && lead.rawData.emails.length > 0 && !currentContact.customFields?.workEmails) {
      const workEmails = lead.rawData.emails.filter((email: any) => email.type === 'work');
      if (workEmails.length > 0) {
        fields.push({ 
          key: 'workEmails', 
          label: 'Work Emails', 
          value: `${workEmails.length} work emails`, 
          icon: <MailFilled /> 
        });
      }
    }
    
    if (Array.isArray(lead.rawData?.emails) && lead.rawData.emails.length > 1 && !currentContact.customFields?.personalEmails) {
      const personalEmails = lead.rawData.emails.filter((email: any) => email.type === 'personal');
      if (personalEmails.length > 0) {
        fields.push({ 
          key: 'personalEmails', 
          label: 'Personal Emails', 
          value: `${personalEmails.length} personal emails`, 
          icon: <MailOutlined /> 
        });
      }
    }
    
    // Company Information
    if (lead.rawData?.experience?.[0]?.company && !currentContact.customFields?.companyInfo) {
      const company = lead.rawData.experience[0].company;
      fields.push({ 
        key: 'companyInfo', 
        label: 'Company Details', 
        value: `${company.name} - ${company.industry || 'Industry info'}`, 
        icon: <InfoCircleOutlined /> 
      });
    }
    
    // Websites
    if (Array.isArray(lead.rawData?.profiles) && lead.rawData.profiles.filter((p: any) => p.network === 'website').length > 0 && !currentContact.customFields?.websites) {
      const websites = lead.rawData.profiles.filter((p: any) => p.network === 'website');
      fields.push({ 
        key: 'websites', 
        label: 'Personal Websites', 
        value: `${websites.length} websites`, 
        icon: <GlobalOutlined /> 
      });
    }
    
    return fields;
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    // Auto-select all available fields
    const availableFields = getAvailableEnrichmentFields(contact!, lead);
    setSelectedFields(availableFields.map(f => f.key));
  };

  const handleFieldSelection = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, fieldKey]);
    } else {
      setSelectedFields(selectedFields.filter(key => key !== fieldKey));
    }
  };



  const handleEnrich = async () => {
    if (!selectedLead || !contact || selectedFields.length === 0) {
      message.warning('Please select a PDL lead and at least one field to enrich');
      return;
    }

    setEnriching(true);
    try {
      const response = await api.post(`/pdl/contacts/${contact.id}/enrich`, {
        leadId: selectedLead.id,
        selectedFields
      });

      if (response.data.success) {
        const enrichmentData = response.data.data;
        let successMessage = `Contact enriched successfully! Applied ${enrichmentData.fieldsApplied} fields.`;
        
        if (enrichmentData.companyCreated) {
          successMessage += ` Company "${enrichmentData.contact.company?.name}" was automatically created and linked.`;
        }
        
        message.success(successMessage);
        onEnrichComplete?.(enrichmentData.contact);
        onClose();
      } else {
        message.error('Enrichment failed: ' + response.data.error.message);
      }
    } catch (error: any) {
      console.error('Error enriching contact:', error);
      message.error('Failed to enrich contact');
    } finally {
      setEnriching(false);
    }
  };

  const matchColumns = [
    {
      title: 'PDL Lead',
      key: 'lead',
      render: (lead: Lead) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {lead.fullName}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {lead.email}
          </div>
          {lead.companyName && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              {lead.companyName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Job Title',
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      render: (text: string) => text || '-',
    },
    {
      title: 'Location & Industry',
      key: 'locationIndustry',
      render: (lead: Lead) => (
        <div>
          {lead.location && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {lead.location}
            </div>
          )}
          {lead.industry && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              <ShopOutlined style={{ marginRight: 4 }} />
              {lead.industry}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Skills & Data',
      key: 'skillsData',
      render: (lead: Lead) => (
        <div>
          {lead.skills && lead.skills.length > 0 ? (
            <div>
              {lead.skills.slice(0, 2).map((skill: string, idx: number) => (
                <Tag key={idx} color="blue" style={{ fontSize: '11px' }}>
                  {skill}
                </Tag>
              ))}
              {lead.skills.length > 2 && (
                <Tag style={{ fontSize: '11px' }}>+{lead.skills.length - 2}</Tag>
              )}
            </div>
          ) : (
            <span style={{ color: '#999' }}>No skills</span>
          )}
          <div style={{ marginTop: 4, fontSize: '11px', color: '#999' }}>
            {lead.rawData?.education?.length > 0 && (
              <span style={{ marginRight: 8 }}>
                <BankOutlined /> Education
              </span>
            )}
            {lead.rawData?.experience?.length > 0 && (
              <span style={{ marginRight: 8 }}>
                <UserOutlined /> {lead.rawData.experience.length} jobs
              </span>
            )}
            {lead.rawData?.certifications?.length > 0 && (
              <span>
                <SafetyCertificateOutlined /> Certs
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (lead: Lead) => (
        <Button
          type={selectedLead?.id === lead.id ? 'primary' : 'default'}
          size="small"
          onClick={() => handleSelectLead(lead)}
        >
          {selectedLead?.id === lead.id ? 'Selected' : 'Select'}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Contact Enrichment"
      visible={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="enrich"
          type="primary"
          loading={enriching}
          disabled={!selectedLead || selectedFields.length === 0}
          onClick={handleEnrich}
        >
          Enrich Contact ({selectedFields.length} fields)
        </Button>,
      ]}
    >
      {contact && (
        <div>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Alert
              message="Debug Info"
              description={`Contact ID: ${contact.id}, Custom Fields: ${JSON.stringify(contact.customFields, null, 2)}`}
              type="warning"
              closable
              style={{ marginBottom: 8, fontSize: '11px' }}
            />
          )}
          
          <Alert
            message="Contact Enrichment - Enhanced Data Matching"
            description="Find PDL leads that match this contact and selectively enrich with professional data including skills, education, work experience, certifications, social profiles, languages, and more. Click on a lead below to see available enrichment options."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col span={24}>
              <Card title="Contact Information" size="small" style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Name">{contact.firstName} {contact.lastName}</Descriptions.Item>
                  <Descriptions.Item label="Job Title">
                    {contact.jobTitle || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Company">{contact.company?.name || <Tag color="orange">Can be enriched</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="Email">{contact.email || <Tag color="orange">Can be enriched</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    {contact.phone || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="LinkedIn">
                    {contact.linkedinUrl || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Twitter">
                    {contact.twitterHandle || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Location">
                    {(contact.customFields?.location) || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Industry">
                    {(contact.customFields?.industry) || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Seniority">
                    {contact.seniorityLevel || <Tag color="orange">Can be enriched</Tag>}
                  </Descriptions.Item>
                </Descriptions>
                
                {/* Skills Section */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Skills: </Text>
                  {contact.customFields?.skills && contact.customFields.skills.length > 0 ? (
                    <>
                      {contact.customFields.skills.slice(0, 10).map((skill: string, idx: number) => (
                        <Tag key={idx} color="blue">{skill}</Tag>
                      ))}
                      {contact.customFields.skills.length > 10 && (
                        <Tag>+{contact.customFields.skills.length - 10} more</Tag>
                      )}
                    </>
                  ) : (
                    <Tag color="orange" icon={<ToolOutlined />}>Can be enriched from PDL</Tag>
                  )}
                </div>
                
                {/* Education Section */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Education: </Text>
                  {contact.customFields?.education && contact.customFields.education.length > 0 ? (
                    <>
                      {contact.customFields.education.slice(0, 2).map((edu: any, idx: number) => (
                        <Tag key={idx} color="blue">
                          {edu.school?.name || 'Unknown'} - {edu.degree_name || 'Degree'}
                        </Tag>
                      ))}
                      {contact.customFields.education.length > 2 && (
                        <Tag>+{contact.customFields.education.length - 2} more</Tag>
                      )}
                    </>
                  ) : (
                    <Tag color="orange" icon={<BankOutlined />}>Can be enriched from PDL</Tag>
                  )}
                </div>
                
                {/* Work Experience Section */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Work Experience: </Text>
                  {contact.customFields?.experience && contact.customFields.experience.length > 0 ? (
                    <Tag color="green">{contact.customFields.experience.length} positions</Tag>
                  ) : (
                    <Tag color="orange" icon={<UserOutlined />}>Can be enriched from PDL</Tag>
                  )}
                </div>
                
                {/* Languages Section */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Languages: </Text>
                  {contact.customFields?.languages && contact.customFields.languages.length > 0 ? (
                    <>
                      {contact.customFields.languages.slice(0, 5).map((lang: any, idx: number) => (
                        <Tag key={idx} color="cyan">
                          {typeof lang === 'string' ? lang : lang.name}
                        </Tag>
                      ))}
                      {contact.customFields.languages.length > 5 && (
                        <Tag>+{contact.customFields.languages.length - 5} more</Tag>
                      )}
                    </>
                  ) : (
                    <Tag color="orange" icon={<GlobalOutlined />}>Can be enriched from PDL</Tag>
                  )}
                </div>
                
                {/* Social Profiles Section */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Social Profiles: </Text>
                  {contact.customFields?.socialProfiles && Object.keys(contact.customFields.socialProfiles).length > 0 ? (
                    <>
                      {Object.keys(contact.customFields.socialProfiles).slice(0, 3).map((platform: string, idx: number) => (
                        <Tag key={idx} color="purple">{platform}</Tag>
                      ))}
                      {Object.keys(contact.customFields.socialProfiles).length > 3 && (
                        <Tag>+{Object.keys(contact.customFields.socialProfiles).length - 3} more</Tag>
                      )}
                    </>
                  ) : (
                    <Tag color="orange" icon={<TeamOutlined />}>Can be enriched from PDL</Tag>
                  )}
                </div>
                
                {/* Additional Enrichable Fields */}
                <div style={{ marginTop: 8 }}>
                  <Text strong>Additional Data: </Text>
                  {!contact.customFields?.certifications && (
                    <Tag color="orange" icon={<SafetyCertificateOutlined />}>Certifications</Tag>
                  )}
                  {!contact.customFields?.interests && (
                    <Tag color="orange" icon={<HeartOutlined />}>Interests</Tag>
                  )}
                  {!contact.customFields?.personalEmails && (
                    <Tag color="orange" icon={<MailFilled />}>Personal Emails</Tag>
                  )}
                  {!contact.customFields?.websites && (
                    <Tag color="orange" icon={<LinkOutlined />}>Websites</Tag>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          <Spin spinning={loading}>
            {matches.length > 0 ? (
              <>
                <Title level={4}>Potential Matches ({matches.length})</Title>
                <Table
                  dataSource={matches}
                  columns={matchColumns}
                  rowKey={(lead) => lead.id}
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                  onRow={(lead) => ({
                    onClick: () => {
                      setSelectedLead(lead);
                      setSelectedFields([]);
                    },
                    style: {
                      cursor: 'pointer',
                      backgroundColor: selectedLead?.id === lead.id ? '#f0f0f0' : undefined,
                    },
                  })}
                />

                {selectedLead && (
                  <>
                    <Divider />
                    <Title level={4}>Enrichment Options</Title>
                    <Alert
                      message={`Selected: ${selectedLead.fullName}`}
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text strong>Select fields to enrich:</Text>
                        <Space>
                          <Button 
                            size="small"
                            onClick={() => {
                              const availableFields = getAvailableEnrichmentFields(contact, selectedLead);
                              const allFieldKeys = availableFields.map(field => field.key);
                              setSelectedFields(allFieldKeys);
                            }}
                            disabled={!selectedLead}
                          >
                            Select All
                          </Button>
                          <Button 
                            size="small"
                            onClick={() => setSelectedFields([])}
                          >
                            Clear All
                          </Button>
                        </Space>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
                        {getAvailableEnrichmentFields(contact, selectedLead).map((field) => (
                          <Card key={field.key} size="small" style={{ marginBottom: 8 }}>
                            <Checkbox
                              checked={selectedFields.includes(field.key)}
                              onChange={(e) => handleFieldSelection(field.key, e.target.checked)}
                            >
                              <Space>
                                {field.icon}
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>{field.label}</div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {field.value}
                                  </div>
                                </div>
                              </Space>
                            </Checkbox>
                          </Card>
                        ))}
                      </div>

                      {getAvailableEnrichmentFields(contact, selectedLead).length === 0 && (
                        <Alert
                          message="No fields available for enrichment"
                          description="The selected contact already has all the data available from this lead."
                          type="info"
                          showIcon
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            ) : !loading && (
              <Alert
                message="No Matches Found"
                description="No PDL leads were found that might match this contact based on name, email, skills, or other criteria."
                type="info"
                showIcon
              />
            )}
          </Spin>
        </div>
      )}
    </Modal>
  );
};

export default ContactEnrichment;