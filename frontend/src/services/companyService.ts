import { api } from './api';

// Company interfaces matching API documentation
export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  description?: string;
  address?: AddressData;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  foundedYear?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddressData {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CreateCompanyData {
  name: string;
  domain?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  description?: string;
  address?: AddressData;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  foundedYear?: number;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export interface CompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  size?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CompaniesResponse {
  success: boolean;
  data: {
    companies: Company[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface CompanyResponse {
  success: boolean;
  data: Company;
}

export interface CompanyError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

class CompanyService {
  /**
   * Get all companies with pagination and filtering
   */
  async getCompanies(filters: CompanyFilters = {}): Promise<CompaniesResponse> {
    try {
      const params = new URLSearchParams();
      
      // Add pagination parameters
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      // Add search and filter parameters
      if (filters.search) params.append('search', filters.search);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.size) params.append('size', filters.size);
      
      // Add sorting parameters
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.order) params.append('order', filters.order);

      const response = await api.get(`/companies?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get single company by ID
   */
  async getCompany(id: string): Promise<CompanyResponse> {
    try {
      const response = await api.get(`/companies/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new company
   */
  async createCompany(companyData: CreateCompanyData): Promise<CompanyResponse> {
    try {
      const response = await api.post('/companies', companyData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update existing company
   */
  async updateCompany(id: string, companyData: UpdateCompanyData): Promise<CompanyResponse> {
    try {
      const response = await api.put(`/companies/${id}`, companyData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/companies/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): CompanyError {
    if (error.response?.data) {
      return error.response.data;
    }
    
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        details: 'Please check your connection and try again'
      }
    };
  }
}

// Export singleton instance
export const companyService = new CompanyService();
export default companyService;