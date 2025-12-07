import { api } from './api';

// Contact interfaces matching API documentation
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  companyId?: string;
  company?: {
    id: string;
    name: string;
    industry?: string;
    size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    website?: string;
    domain?: string;
    linkedinUrl?: string;
    description?: string;
    phone?: string;
    twitterHandle?: string;
    revenueRange?: string;
    address?: any;
  };
  assignedTo?: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  leadStatus: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'nurturing' | 'converted' | 'lost';
  leadScore: number;
  source: 'manual' | 'linkedin' | 'twitter' | 'referral' | 'website' | 'email_campaign' | 'cold_outreach' | 'event' | 'pdl_discovery';
  seniorityLevel?: 'entry' | 'mid' | 'senior' | 'director' | 'vp' | 'c_level';
  linkedinUrl?: string;
  twitterHandle?: string;
  notes?: string;
  customFields?: {
    skills?: string[];
    education?: any[];
    experience?: any[];
    languages?: string[];
    certifications?: string[];
    interests?: string[];
    location?: string;
    industry?: string;
    currentCompany?: string;
    personalEmails?: string[];
    workEmails?: string[];
    websites?: string[];
    githubUrl?: string;
    socialProfiles?: Record<string, any>;
    phoneNumbers?: any[];
    companyInfo?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  companyId?: string;
  assignedTo?: string;
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'nurturing' | 'converted' | 'lost';
  leadScore?: number;
  source?: 'manual' | 'linkedin' | 'twitter' | 'referral' | 'website' | 'email_campaign' | 'cold_outreach' | 'event' | 'pdl_discovery';
  seniorityLevel?: 'entry' | 'mid' | 'senior' | 'director' | 'vp' | 'c_level';
  linkedinUrl?: string;
  twitterHandle?: string;
  notes?: string;
  customFields?: {
    skills?: string[];
    education?: any[];
    experience?: any[];
    languages?: string[];
    certifications?: string[];
    interests?: string[];
    location?: string;
    industry?: string;
    currentCompany?: string;
    personalEmails?: string[];
    workEmails?: string[];
    websites?: string[];
    githubUrl?: string;
    socialProfiles?: Record<string, any>;
    phoneNumbers?: any[];
    companyInfo?: any;
  };
}

export interface UpdateContactData extends Partial<CreateContactData> {}

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  leadStatus?: string;
  source?: string;
  assignedTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ContactsResponse {
  success: boolean;
  data: {
    contacts: Contact[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface ContactResponse {
  success: boolean;
  data: Contact;
}

export interface ContactError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

class ContactService {
  /**
   * Get all contacts with pagination and filtering
   */
  async getContacts(filters: ContactFilters = {}): Promise<ContactsResponse> {
    try {
      const params = new URLSearchParams();
      
      // Add pagination parameters
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      // Add search and filter parameters
      if (filters.search) params.append('search', filters.search);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.leadStatus) params.append('leadStatus', filters.leadStatus);
      if (filters.source) params.append('source', filters.source);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      
      // Add sorting parameters
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.order) params.append('order', filters.order);

      const response = await api.get(`/contacts?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get single contact by ID
   */
  async getContact(id: string): Promise<ContactResponse> {
    try {
      const response = await api.get(`/contacts/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new contact
   */
  async createContact(contactData: CreateContactData): Promise<ContactResponse> {
    try {
      const response = await api.post('/contacts', contactData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update existing contact
   */
  async updateContact(id: string, contactData: UpdateContactData): Promise<ContactResponse> {
    try {
      const response = await api.put(`/contacts/${id}`, contactData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete contact (soft delete)
   */
  async deleteContact(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/contacts/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): ContactError {
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
export const contactService = new ContactService();
export default contactService;