import React, { useState } from 'react';
import { Card, Tabs, Badge } from 'antd';
import { SearchOutlined, EyeOutlined, UserAddOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LeadSearch from '../components/PDL/LeadSearch';
import LeadReview from '../components/PDL/LeadReview';

import CRMConversion from '../components/PDL/CRMConversion';

const PDLLeads: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);
  
  const { 
    leads = [], 
    selectedLeads: reduxSelectedLeads = [], 
    lastSearchResult = null 
  } = useSelector((state: RootState) => state.pdl || {});

  const handleSearchComplete = (resultCount: number) => {
    // Switch to review tab after search
    if (resultCount > 0) {
      setActiveTab('review');
    }
  };

  const handleConversionRequest = (leads: any[]) => {
    setSelectedLeads(leads);
    setConversionModalVisible(true);
  };

  const handleConversionComplete = () => {
    setConversionModalVisible(false);
    setSelectedLeads([]);
  };

  const getTabTitle = (key: string, title: string, count?: number) => (
    <span>
      {title}
      {count !== undefined && count > 0 && (
        <Badge count={count} style={{ marginLeft: 8 }} />
      )}
    </span>
  );

  return (
    <div style={{ padding: '0' }}>
      <Card 
        title="PDL Lead Management" 
        style={{ marginBottom: 0 }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'search',
              label: (
                <span>
                  <SearchOutlined />
                  Lead Search
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0 0 0' }}>
                  <LeadSearch onSearchComplete={handleSearchComplete} />
                </div>
              )
            },
            {
              key: 'review',
              label: (
                <span>
                  <EyeOutlined />
                  {getTabTitle('review', 'Lead Review', leads?.length)}
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0 0 0' }}>
                  <LeadReview onConvertLeads={handleConversionRequest} />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* CRM Conversion Modal */}
      <CRMConversion
        visible={conversionModalVisible}
        leadIds={selectedLeads.map(lead => typeof lead === 'string' ? lead : lead.id)}
        leads={selectedLeads.filter(lead => typeof lead === 'object')}
        onCancel={handleConversionComplete}
      />
    </div>
  );
};

export default PDLLeads;
