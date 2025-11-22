import { api } from './api';

// Types for PDL API
export interface PDLSearchFilters {
  job_title?: string;
  company?: string;
  location?: string;
  skills?: string[];
  seniority?: string;
  industry?: string;
  limit?: number;
  page?: number;
}

export interface PotentialLead {
  id: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  locationCountry: string;
  locationCity?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  skills?: string[];
  industry: string;
  leadScore: number;
  leadType: 'staff' | 'client' | 'general';
  status: 'pending_review' | 'reviewed' | 'converted' | 'rejected' | 'added_to_crm';
  pdl_id?: string;
  pdlProfileId?: string;
  isManual?: boolean;
  source?: string;
  notes?: string;
  raw_data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuery {
  id: string;
  name: string;
  description?: string;
  queryConfig: any; // Contains the actual search criteria with jobTitles array
  leadType: string;
  runFrequency: string;
  isActive: boolean;
  results_count?: number;
  status?: 'active' | 'paused' | 'completed';
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ConversionResult {
  success: boolean;
  converted: number;
  failed: number;
  errors?: string[];
  message?: string;
}

class PDLService {
  // Get all potential leads with pagination and filtering
  async getLeads(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    try {
      const response = await api.get('/pdl/leads', { params });
      
      // Ensure the response has the expected structure
      const data = response.data;
      if (data && data.success) {
        // The API returns data.data.leads, not data.data directly
        const leadsArray = data.data?.leads || [];
        const paginationData = data.data?.pagination || {};
        
        return {
          data: Array.isArray(leadsArray) ? leadsArray : [],
          pagination: {
            page: paginationData.currentPage || 1,
            limit: paginationData.itemsPerPage || 20,
            total: paginationData.totalItems || 0,
            totalPages: paginationData.totalPages || 0
          }
        };
      }
      
      // If response doesn't have expected structure, return empty data
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      };
    } catch (error) {
      console.error('Error fetching leads:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      };
    }
  }

  // Get a single lead by ID
  async getLead(id: string) {
    const response = await api.get(`/pdl/leads/${id}`);
    return response.data;
  }

  // Note: Individual lead updates/deletes not needed for PDL data retrieval
  // Use bulk operations for lead management if needed

  // Perform a new lead search
  async searchLeads(filters: PDLSearchFilters) {
    // Validate required fields before sending to backend
    if (!filters.job_title || filters.job_title.trim() === '') {
      throw new Error('Job title is required for search');
    }

    // Transform frontend format to backend format
    const backendFilters = {
      jobTitles: [filters.job_title.trim()],
      industries: filters.industry ? [filters.industry] : [],
      countries: filters.location ? [filters.location] : ['Vietnam'],
      cities: [],
      companies: filters.company ? [filters.company] : [],
      leadType: 'general',
      size: filters.limit || 20
    };

    const response = await api.post('/pdl/search', backendFilters);
    return response.data;
  }

  // Get all saved search queries
  async getSearchQueries() {
    try {
      console.log('PDL Service: Making request to /pdl/queries');
      const response = await api.get('/pdl/queries');
      console.log('PDL Service: Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
      const data = response.data;
      
      if (data && data.success && data.data && data.data.queries) {
        console.log('PDL Service: Returning queries:', data.data.queries.length, 'items');
        return {
          data: Array.isArray(data.data.queries) ? data.data.queries : [],
          pagination: data.data.pagination
        };
      }
      
      console.log('PDL Service: No queries found or invalid response structure');
      return { data: [], pagination: null };
    } catch (error: any) {
      console.error('PDL Service: Error fetching search queries:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers
      });
      return { data: [], pagination: null };
    }
  }

  // Create a new search query
  async createSearchQuery(queryData: {
    query_name: string;
    search_criteria: PDLSearchFilters;
    description?: string;
  }) {
    console.log('PDL Service: Received queryData:', JSON.stringify(queryData, null, 2));
    
    // Transform frontend field names to backend expected names
    const queryConfig: any = { ...queryData.search_criteria };
    console.log('PDL Service: Initial queryConfig:', JSON.stringify(queryConfig, null, 2));
    
    // Transform job_title (string) to jobTitles (array) as expected by backend
    if (queryConfig.job_title && typeof queryConfig.job_title === 'string') {
      console.log('PDL Service: Found job_title, transforming to jobTitles array');
      // Split by comma or use as single item array
      queryConfig.jobTitles = queryConfig.job_title.includes(',') 
        ? queryConfig.job_title.split(',').map((title: string) => title.trim())
        : [queryConfig.job_title.trim()];
      
      console.log('PDL Service: Created jobTitles:', queryConfig.jobTitles);
      
      // Remove the original field
      delete queryConfig.job_title;
    } else {
      console.log('PDL Service: No job_title found or invalid type:', {
        hasJobTitle: !!queryConfig.job_title,
        type: typeof queryConfig.job_title,
        value: queryConfig.job_title
      });
    }
    
    const backendData = {
      name: queryData.query_name,
      queryConfig: queryConfig,
      description: queryData.description || `Search query: ${queryData.query_name}`,
      leadType: 'general',
      runFrequency: 'weekly'
    };
    
    console.log('PDL Service: Final backend data:', JSON.stringify(backendData, null, 2));
    const response = await api.post('/pdl/queries', backendData);
    return response.data;
  }

  // Note: Query updates/deletes not implemented - queries are for retrieval only

  // Execute a saved search query
  async executeSearchQuery(id: string) {
    const response = await api.post(`/pdl/queries/${id}/run`);
    return response.data;
  }

  // Delete a saved search query  
  async deleteSearchQuery(id: string) {
    const response = await api.delete(`/pdl/queries/${id}`);
    return response.data;
  }

  // Convert leads to CRM contacts
  async convertToCRM(leadIds: string[]): Promise<ConversionResult> {
    const response = await api.post('/pdl/leads/bulk', { 
      leadIds, 
      operation: 'addToCRM' 
    });
    
    // Map backend response to expected format
    const backendData = response.data;
    return {
      success: backendData.success,
      converted: backendData.data?.success || 0,
      failed: backendData.data?.failed || 0,
      errors: backendData.data?.errors?.map((err: any) => 
        typeof err === 'string' ? err : err.error || 'Unknown error'
      ) || [],
      message: backendData.message
    };
  }

  // Bulk update leads
  async bulkUpdateLeads(updates: {
    leadIds: string[];
    status?: string;
    leadType?: string;
  }) {
    const response = await api.post('/pdl/leads/bulk', {
      ...updates,
      operation: 'updateStatus'
    });
    return response.data;
  }

  // Get PDL API usage statistics
  async getAPIUsage() {
    const response = await api.get('/pdl/usage');
    return response.data;
  }

  // Enrich a lead with PDL data (including PDL-sourced leads with forceEnrich)
  async enrichLead(leadId: string, forceEnrich: boolean = false) {
    const response = await api.post(`/pdl/leads/${leadId}/enrich`, { 
      forceEnrich 
    });
    return response.data;
  }

  // Create a manual lead
  async createManualLead(leadData: {
    fullName: string;
    jobTitle?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    locationCity?: string;
    locationCountry?: string;
    industry?: string;
    leadType?: string;
    skills?: string[];
    notes?: string;
  }) {
    const response = await api.post('/pdl/leads/manual', leadData);
    return response.data;
  }

  // Update lead information
  async updateLead(leadId: string, updateData: any) {
    const response = await api.put(`/pdl/leads/${leadId}`, updateData);
    return response.data;
  }

  // Delete a lead
  async deleteLead(leadId: string) {
    const response = await api.delete(`/pdl/leads/${leadId}`);
    return response.data;
  }

  // Note: Lead export features not implemented in backend
  // Focus on core data retrieval functionality
}

export const pdlService = new PDLService();
export default pdlService;