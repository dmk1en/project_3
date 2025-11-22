import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Slider,
  message,
  Collapse,
  Tooltip,
  Badge,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  SaveOutlined,
  ClearOutlined,
  FilterOutlined,
  HistoryOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { searchLeads, setSearchFilters, clearSearchFilters, fetchSearchQueries, createSearchQuery, executeSearchQuery, deleteSearchQuery } from '../../features/pdl/pdlSlice';
import { PDLSearchFilters } from '../../services/pdlService';
import { getDetailedErrorMessage } from '../../utils/errorUtils';

const { Panel } = Collapse;
const { Option } = Select;

interface LeadSearchProps {
  onSearchComplete?: (results: number) => void;
}

const LeadSearch: React.FC<LeadSearchProps> = ({ onSearchComplete }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [saveQueryVisible, setSaveQueryVisible] = useState(false);
  const [queryName, setQueryName] = useState('');
  
  const { 
    searchFilters = { limit: 20, page: 1 }, 
    loading = { leads: false, search: false, conversion: false, queries: false, enrichment: false }, 
    error = { leads: null, search: null, conversion: null, queries: null, enrichment: null },
    lastSearchResult = null,
    searchQueries = []
  } = useSelector((state: RootState) => state.pdl);

  useEffect(() => {
    // Only fetch search queries if user has access
    dispatch(fetchSearchQueries() as any).catch((error: any) => {
      console.warn('Failed to fetch search queries:', error);
      // Don't show error message for missing queries - it's not critical
    });
  }, [dispatch]);

  // Industry options
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
    'Manufacturing', 'Consulting', 'Marketing', 'Real Estate', 'Other'
  ];

  // Seniority levels
  const seniorityLevels = [
    'entry', 'junior', 'mid', 'senior', 'director', 'vp', 'c_suite'
  ];

  // Popular skills for suggestions
  const popularSkills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS',
    'Docker', 'Kubernetes', 'Machine Learning', 'Data Science', 'DevOps',
    'Product Management', 'Sales', 'Marketing', 'Customer Success'
  ];

  const handleSearch = async (values: any) => {
    const filters: PDLSearchFilters = {
      ...values,
      skills: values.skills || [],
      limit: values.limit || 20,
      page: 1
    };

    dispatch(setSearchFilters(filters) as any);
    
    try {
      const result = await dispatch(searchLeads(filters) as any).unwrap();
      message.success(`Found ${result.results_count} potential leads`);
      onSearchComplete?.(result.results_count);
    } catch (error: any) {
      console.error('LeadSearch: Search error:', error);
      const errorMessage = getDetailedErrorMessage(error, 'Search failed. Please try again.');
      message.error(errorMessage);
    }
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim()) {
      message.error('Please enter a query name');
      return;
    }

    try {
      // Get current form values instead of using searchFilters state
      const currentFormValues = form.getFieldsValue();
      console.log('LeadSearch: Current form values:', currentFormValues);
      
      // Validate that we have a job title
      if (!currentFormValues.job_title || !currentFormValues.job_title.trim()) {
        message.error('Please enter a job title before saving the query');
        return;
      }

      await dispatch(createSearchQuery({
        query_name: queryName,
        search_criteria: currentFormValues,  // Use current form values
        description: `Search for ${currentFormValues.job_title} leads`
      }) as any).unwrap();
      
      message.success('Search query saved successfully');
      setQueryName('');
      setSaveQueryVisible(false);
      
      // Refresh saved queries list
      dispatch(fetchSearchQueries() as any);
    } catch (error: any) {
      console.error('LeadSearch: Save query error:', error);
      const errorMessage = getDetailedErrorMessage(error, 'Failed to save search query');
      message.error(errorMessage);
    }
  };

  const handleLoadSavedQuery = (queryId: string) => {
    try {
      // Load the query filters into the form without executing
      const query = searchQueries.find(q => q.id === queryId);
      if (query) {
        // Transform backend queryConfig to frontend form format
        const formValues = { ...query.queryConfig };
        
        // Transform jobTitles array back to job_title string for the form
        if (formValues.jobTitles && Array.isArray(formValues.jobTitles)) {
          formValues.job_title = formValues.jobTitles.join(', ');
          delete formValues.jobTitles;
        }
        
        console.log('LeadSearch: Loading saved query form values:', formValues);
        form.setFieldsValue(formValues);
        dispatch(setSearchFilters(formValues) as any);
        message.success(`Loaded query "${query.name}" into form`);
      }
    } catch (error: any) {
      console.error('LeadSearch: Load query error:', error);
      const errorMessage = getDetailedErrorMessage(error, 'Failed to load saved query');
      message.error(errorMessage);
    }
  };

  const handleDeleteQuery = async (queryId: string, queryName: string) => {
    try {
      await dispatch(deleteSearchQuery(queryId) as any).unwrap();
      message.success(`Deleted query "${queryName}" successfully`);
    } catch (error: any) {
      console.error('LeadSearch: Delete query error:', error);
      const errorMessage = getDetailedErrorMessage(error, 'Failed to delete query');
      message.error(errorMessage);
    }
  };

  const handleClearFilters = () => {
    form.resetFields();
    dispatch(clearSearchFilters() as any);
    message.info('Search filters cleared');
  };

  return (
    <Card 
      title={
        <Space>
          <SearchOutlined />
          Lead Discovery
          {lastSearchResult && (
            <Badge 
              count={lastSearchResult.results} 
              style={{ backgroundColor: '#52c41a' }}
              title="Last search results"
            />
          )}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="View saved queries">
            <Button 
              icon={<HistoryOutlined />}
              onClick={() => setSaveQueryVisible(!saveQueryVisible)}
            >
              Saved Queries ({searchQueries.length})
            </Button>
          </Tooltip>
          <Button 
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
          >
            Clear
          </Button>
        </Space>
      }
    >
      {/* Saved Queries Section */}
      {saveQueryVisible && (
        <Card 
          size="small" 
          title="Saved Search Queries" 
          style={{ marginBottom: 16 }}
          styles={{ body: { maxHeight: 200, overflowY: 'auto' } }}
        >
          {searchQueries.length > 0 ? (
            <Row gutter={[8, 8]}>
              {searchQueries.map(query => (
                <Col key={query.id} span={12}>
                  <Card 
                    size="small"
                    hoverable
                    styles={{ body: { padding: 8 } }}
                    extra={
                      <Popconfirm
                        title="Delete Query"
                        description={`Are you sure you want to delete "${query.name}"?`}
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteQuery(query.id, query.name);
                        }}
                        okText="Delete"
                        cancelText="Cancel"
                        okType="danger"
                      >
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#ff4d4f' }}
                        />
                      </Popconfirm>
                    }
                  >
                    <div 
                      style={{ fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => handleLoadSavedQuery(query.id)}
                    >
                      <strong>{query.name}</strong>
                      <br />
                      <Tag color="blue">
                        {query.queryConfig?.jobTitles?.join(', ') || 'No job title'}
                      </Tag>
                      <Tag color={query.isActive ? 'green' : 'orange'}>
                        {query.isActive ? 'active' : 'inactive'}
                      </Tag>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {loading.queries ? 'Loading saved queries...' : 'No saved queries available'}
            </div>
          )}
        </Card>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSearch}
        initialValues={searchFilters}
      >
        <Row gutter={16}>
          {/* Basic Search Fields */}
          <Col span={12}>
            <Form.Item 
              label="Job Title" 
              name="job_title"
              help="e.g., Software Engineer, Product Manager, Sales Director"
              rules={[{ required: true, message: 'Please enter a job title' }]}
            >
              <Input 
                placeholder="Enter job title or keywords"
                prefix={<SearchOutlined />}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item 
              label="Company" 
              name="company"
              help="Company name or domain"
            >
              <Input 
                placeholder="e.g., Microsoft, Google, Startup"
                prefix={<SearchOutlined />}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item 
              label="Location" 
              name="location"
              help="City, state, or country"
            >
              <Input 
                placeholder="e.g., Vietnam, Ho Chi Minh City, Remote"
                prefix={<SearchOutlined />}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item 
              label="Industry" 
              name="industry"
            >
              <Select 
                placeholder="Select industry"
                allowClear
                showSearch
              >
                {industries.map(industry => (
                  <Option key={industry} value={industry}>
                    {industry}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Advanced Filters */}
        <Collapse 
          ghost
          items={[
            {
              key: 'advanced',
              label: (
                <Space>
                  <FilterOutlined />
                  Advanced Filters
                </Space>
              ),
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label="Seniority Level" 
                      name="seniority"
                    >
                      <Select 
                        placeholder="Select seniority"
                        allowClear
                      >
                        {seniorityLevels.map(level => (
                          <Option key={level} value={level}>
                            {level.replace('_', ' ').toUpperCase()}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item 
                      label="Results Limit" 
                      name="limit"
                    >
                      <Slider
                        min={10}
                        max={100}
                        step={10}
                        marks={{
                          10: '10',
                          20: '20',
                          50: '50',
                          100: '100'
                        }}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item 
                      label="Skills & Keywords" 
                      name="skills"
                      help="Select relevant skills or add custom ones"
                    >
                      <Select
                        mode="tags"
                        placeholder="Type or select skills"
                        style={{ width: '100%' }}
                        tokenSeparators={[',']}
                      >
                        {popularSkills.map(skill => (
                          <Option key={skill} value={skill}>
                            {skill}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          ]}
        />

        {/* Action Buttons */}
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={12}>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={loading.search}
              size="large"
              block
            >
              Search Leads
            </Button>
          </Col>
          
          <Col span={12}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                style={{ width: '70%' }}
                placeholder="Save this search..."
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                onPressEnter={handleSaveQuery}
              />
              <Button 
                style={{ width: '30%' }}
                icon={<SaveOutlined />}
                onClick={handleSaveQuery}
                disabled={!queryName.trim()}
              >
                Save
              </Button>
            </Space.Compact>
          </Col>
        </Row>

        {/* Search Results Summary */}
        {lastSearchResult && (
          <Card 
            size="small" 
            style={{ marginTop: 16, backgroundColor: '#f6ffed' }}
          >
            <Space>
              <Tag color="green">Last Search:</Tag>
              <span>{lastSearchResult.results} leads found</span>
              <Tag color="blue">
                {new Date(lastSearchResult.timestamp).toLocaleString()}
              </Tag>
            </Space>
          </Card>
        )}

        {/* Error Display */}
        {error.search && (
          <Card 
            size="small" 
            style={{ marginTop: 16, backgroundColor: '#fff2f0' }}
          >
            <Tag color="red">Error:</Tag>
            <span style={{ color: '#ff4d4f' }}>{error.search}</span>
          </Card>
        )}
      </Form>
    </Card>
  );
};

export default LeadSearch;