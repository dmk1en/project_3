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
  status: 'pending_review' | 'reviewed' | 'converted' | 'rejected';
  pdl_id: string;
  raw_data: any;
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuery {
  id: string;
  query_name: string;
  search_criteria: PDLSearchFilters;
  results_count: number;
  status: 'active' | 'paused' | 'completed';
  last_run: string;
  createdAt: string;
  updatedAt: string;
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

  // Update lead status or information
  async updateLead(id: string, data: Partial<PotentialLead>) {
    const response = await api.put(`/pdl/leads/${id}`, data);
    return response.data;
  }

  // Delete a lead
  async deleteLead(id: string) {
    const response = await api.delete(`/pdl/leads/${id}`);
    return response.data;
  }

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
      const response = await api.get('/pdl/queries');
      const data = response.data;
      
      if (data && data.success) {
        return {
          data: Array.isArray(data.data) ? data.data : []
        };
      }
      
      return { data: [] };
    } catch (error) {
      console.error('Error fetching search queries:', error);
      return { data: [] };
    }
  }

  // Create a new search query
  async createSearchQuery(queryData: {
    query_name: string;
    search_criteria: PDLSearchFilters;
  }) {
    const response = await api.post('/pdl/queries', queryData);
    return response.data;
  }

  // Update a search query
  async updateSearchQuery(id: string, queryData: Partial<SearchQuery>) {
    const response = await api.put(`/pdl/queries/${id}`, queryData);
    return response.data;
  }

  // Delete a search query
  async deleteSearchQuery(id: string) {
    const response = await api.delete(`/pdl/queries/${id}`);
    return response.data;
  }

  // Execute a saved search query
  async executeSearchQuery(id: string) {
    const response = await api.post(`/pdl/queries/${id}/execute`);
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

  // Enrich lead data
  async enrichLead(id: string) {
    const response = await api.post(`/pdl/leads/${id}/enrich`);
    return response.data;
  }

  // Export leads to CSV
  async exportLeads(params?: {
    status?: string;
    lead_type?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const response = await api.get('/pdl/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
}

export const pdlService = new PDLService();
export default pdlService;