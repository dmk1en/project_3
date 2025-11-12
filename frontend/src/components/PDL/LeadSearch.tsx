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
  Badge
} from 'antd';
import {
  SearchOutlined,
  SaveOutlined,
  ClearOutlined,
  FilterOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { searchLeads, setSearchFilters, clearSearchFilters, fetchSearchQueries, createSearchQuery, executeSearchQuery } from '../../features/pdl/pdlSlice';
import { PDLSearchFilters } from '../../services/pdlService';

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
    dispatch(fetchSearchQueries() as any);
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
    } catch (error) {
      message.error('Search failed. Please try again.');
    }
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim()) {
      message.error('Please enter a query name');
      return;
    }

    try {
      await dispatch(createSearchQuery({
        query_name: queryName,
        search_criteria: searchFilters
      }) as any).unwrap();
      
      message.success('Search query saved successfully');
      setQueryName('');
      setSaveQueryVisible(false);
    } catch (error) {
      message.error('Failed to save search query');
    }
  };

  const handleExecuteSavedQuery = async (queryId: string) => {
    try {
      const result = await dispatch(executeSearchQuery(queryId) as any).unwrap();
      message.success(`Executed saved query: ${result.results_count} leads found`);
      onSearchComplete?.(result.results_count);
      
      // Load the query filters into the form
      const query = searchQueries.find(q => q.id === queryId);
      if (query) {
        form.setFieldsValue(query.search_criteria);
        dispatch(setSearchFilters(query.search_criteria) as any);
      }
    } catch (error) {
      message.error('Failed to execute saved query');
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
          bodyStyle={{ maxHeight: 200, overflowY: 'auto' }}
        >
          <Row gutter={[8, 8]}>
            {searchQueries.map(query => (
              <Col key={query.id} span={12}>
                <Card 
                  size="small"
                  hoverable
                  onClick={() => handleExecuteSavedQuery(query.id)}
                  bodyStyle={{ padding: 8 }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <strong>{query.query_name}</strong>
                    <br />
                    <Tag color="blue">
                      {query.results_count} results
                    </Tag>
                    <Tag color={query.status === 'active' ? 'green' : 'orange'}>
                      {query.status}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
            {searchQueries.length === 0 && (
              <Col span={24}>
                <div style={{ textAlign: 'center', color: '#999' }}>
                  No saved queries yet
                </div>
              </Col>
            )}
          </Row>
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