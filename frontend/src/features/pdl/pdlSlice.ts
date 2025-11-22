import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pdlService, PotentialLead, SearchQuery, PDLSearchFilters, ConversionResult } from '../../services/pdlService';

// Async thunks for API calls
export const fetchLeads = createAsyncThunk(
  'pdl/fetchLeads',
  async (
    params: { page?: number; limit?: number; status?: string; search?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const result = await pdlService.getLeads(params);
      return result;
    } catch (error: any) {
      console.error('Failed to fetch leads:', error);
      return rejectWithValue(error?.response?.data?.message || error.message || 'Failed to fetch leads');
    }
  }
);

export const fetchLead = createAsyncThunk(
  'pdl/fetchLead',
  async (id: string, { rejectWithValue }) => {
    try {
      return await pdlService.getLead(id);
    } catch (error: any) {
      console.error('Failed to fetch lead:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to fetch lead';
      return rejectWithValue(errorMessage);
    }
  }
);

export const searchLeads = createAsyncThunk(
  'pdl/searchLeads',
  async (filters: PDLSearchFilters, { rejectWithValue }) => {
    try {
      return await pdlService.searchLeads(filters);
    } catch (error: any) {
      console.error('Failed to search leads:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to search leads';
      return rejectWithValue(errorMessage);
    }
  }
);

// Note: Individual lead updates/deletes not needed for PDL data retrieval
// Use bulk operations if needed

export const fetchSearchQueries = createAsyncThunk(
  'pdl/fetchSearchQueries',
  async (_, { rejectWithValue }) => {
    try {
      return await pdlService.getSearchQueries();
    } catch (error: any) {
      console.error('Failed to fetch search queries:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to fetch search queries';
      return rejectWithValue(errorMessage);
    }
  }
);

export const createSearchQuery = createAsyncThunk(
  'pdl/createSearchQuery',
  async (queryData: { query_name: string; search_criteria: PDLSearchFilters; description?: string }, { rejectWithValue }) => {
    try {
      return await pdlService.createSearchQuery(queryData);
    } catch (error: any) {
      console.error('Failed to create search query:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to create search query';
      return rejectWithValue(errorMessage);
    }
  }
);

export const executeSearchQuery = createAsyncThunk(
  'pdl/executeSearchQuery',
  async (id: string, { rejectWithValue }) => {
    try {
      return await pdlService.executeSearchQuery(id);
    } catch (error: any) {
      console.error('Failed to execute search query:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to execute search query';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteSearchQuery = createAsyncThunk(
  'pdl/deleteSearchQuery',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await pdlService.deleteSearchQuery(id);
      return { id, result };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message || 'Failed to delete search query');
    }
  }
);

export const convertToCRM = createAsyncThunk(
  'pdl/convertToCRM',
  async (leadIds: string[], { rejectWithValue }) => {
    try {
      return await pdlService.convertToCRM(leadIds);
    } catch (error: any) {
      console.error('Failed to convert to CRM:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to convert leads to CRM';
      return rejectWithValue(errorMessage);
    }
  }
);

export const bulkUpdateLeads = createAsyncThunk(
  'pdl/bulkUpdateLeads',
  async (updates: { leadIds: string[]; status?: string; leadType?: string }, { rejectWithValue }) => {
    try {
      return await pdlService.bulkUpdateLeads(updates);
    } catch (error: any) {
      console.error('Failed to bulk update leads:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to bulk update leads';
      return rejectWithValue(errorMessage);
    }
  }
);

// Get API usage statistics
export const fetchAPIUsage = createAsyncThunk(
  'pdl/fetchAPIUsage',
  async (_, { rejectWithValue }) => {
    try {
      return await pdlService.getAPIUsage();
    } catch (error: any) {
      console.error('Failed to fetch API usage:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to fetch API usage';
      return rejectWithValue(errorMessage);
    }
  }
);

// Note: Lead enrichment and analytics not implemented in backend

// Types for the state
interface PDLState {
  leads: PotentialLead[];
  selectedLeads: string[];
  currentLead: PotentialLead | null;
  searchQueries: SearchQuery[];
  searchFilters: PDLSearchFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: {
    leads: boolean;
    search: boolean;
    conversion: boolean;
    queries: boolean;
  };
  error: {
    leads: string | null;
    search: string | null;
    conversion: string | null;
    queries: string | null;
  };
  lastSearchResult: {
    query: PDLSearchFilters;
    results: number;
    timestamp: string;
  } | null;
  conversionResult: ConversionResult | null;
}

const initialState: PDLState = {
  leads: [],
  selectedLeads: [],
  currentLead: null,
  searchQueries: [],
  searchFilters: {
    limit: 20,
    page: 1,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loading: {
    leads: false,
    search: false,
    conversion: false,
    queries: false,
  },
  error: {
    leads: null,
    search: null,
    conversion: null,
    queries: null,
  },
  lastSearchResult: null,
  conversionResult: null,
};

const pdlSlice = createSlice({
  name: 'pdl',
  initialState,
  reducers: {
    // UI state management
    setSelectedLeads: (state, action: PayloadAction<string[]>) => {
      state.selectedLeads = action.payload;
    },
    toggleLeadSelection: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;
      if (state.selectedLeads.includes(leadId)) {
        state.selectedLeads = state.selectedLeads.filter(id => id !== leadId);
      } else {
        state.selectedLeads.push(leadId);
      }
    },
    selectAllLeads: (state) => {
      state.selectedLeads = state.leads.map(lead => lead.id);
    },
    clearSelection: (state) => {
      state.selectedLeads = [];
    },
    setSearchFilters: (state, action: PayloadAction<Partial<PDLSearchFilters>>) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },
    clearSearchFilters: (state) => {
      state.searchFilters = { limit: 20, page: 1 };
    },
    setCurrentLead: (state, action: PayloadAction<PotentialLead | null>) => {
      state.currentLead = action.payload;
    },
    clearErrors: (state) => {
      state.error = {
        leads: null,
        search: null,
        conversion: null,
        queries: null,
      };
    },
    clearConversionResult: (state) => {
      state.conversionResult = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch leads
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.loading.leads = true;
        state.error.leads = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading.leads = false;
        // Ensure leads is always an array
        state.leads = Array.isArray(action.payload?.data) ? action.payload.data : [];
        // Ensure pagination has proper structure
        state.pagination = action.payload?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading.leads = false;
        state.error.leads = action.error.message || 'Failed to fetch leads';
      });

    // Fetch single lead
    builder
      .addCase(fetchLead.fulfilled, (state, action) => {
        state.currentLead = action.payload.data;
      });

    // Search leads
    builder
      .addCase(searchLeads.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchLeads.fulfilled, (state, action) => {
        state.loading.search = false;
        state.lastSearchResult = {
          query: state.searchFilters,
          results: action.payload.results_count,
          timestamp: new Date().toISOString(),
        };
        // Refresh leads after search
      })
      .addCase(searchLeads.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.error.message || 'Search failed';
      });

    // Note: Individual lead updates/deletes not implemented

    // Fetch search queries
    builder
      .addCase(fetchSearchQueries.pending, (state) => {
        state.loading.queries = true;
        state.error.queries = null;
      })
      .addCase(fetchSearchQueries.fulfilled, (state, action) => {
        state.loading.queries = false;
        state.searchQueries = Array.isArray(action.payload?.data) ? action.payload.data : [];
      })
      .addCase(fetchSearchQueries.rejected, (state, action) => {
        state.loading.queries = false;
        state.error.queries = action.error.message || 'Failed to fetch queries';
      });

    // Create search query
    builder
      .addCase(createSearchQuery.fulfilled, (state, action) => {
        state.searchQueries.push(action.payload.data);
      });

    // Execute search query
    builder
      .addCase(executeSearchQuery.pending, (state) => {
        state.loading.search = true;
      })
      .addCase(executeSearchQuery.fulfilled, (state, action) => {
        state.loading.search = false;
        // Refresh leads after query execution
      });

    // Delete search query
    builder
      .addCase(deleteSearchQuery.pending, (state) => {
        state.loading.queries = true;
        state.error.queries = null;
      })
      .addCase(deleteSearchQuery.fulfilled, (state, action) => {
        state.loading.queries = false;
        // Remove the deleted query from the list
        state.searchQueries = state.searchQueries.filter(query => query.id !== action.payload.id);
      })
      .addCase(deleteSearchQuery.rejected, (state, action) => {
        state.loading.queries = false;
        state.error.queries = action.payload as string;
      });

    // Convert to CRM
    builder
      .addCase(convertToCRM.pending, (state) => {
        state.loading.conversion = true;
        state.error.conversion = null;
        state.conversionResult = null;
      })
      .addCase(convertToCRM.fulfilled, (state, action) => {
        state.loading.conversion = false;
        state.conversionResult = action.payload;
        // Update converted leads status
        if (action.payload.success) {
          state.selectedLeads.forEach(leadId => {
            const lead = state.leads.find(l => l.id === leadId);
            if (lead) {
              lead.status = 'converted';
            }
          });
          state.selectedLeads = [];
        }
      })
      .addCase(convertToCRM.rejected, (state, action) => {
        state.loading.conversion = false;
        state.error.conversion = action.error.message || 'Conversion failed';
      });

    // Bulk update leads
    builder
      .addCase(bulkUpdateLeads.fulfilled, (state, action) => {
        const { leadIds, status, leadType } = action.meta.arg;
        leadIds.forEach(leadId => {
          const lead = state.leads.find(l => l.id === leadId);
          if (lead) {
            if (status) lead.status = status as any;
            if (leadType) lead.leadType = leadType as any;
          }
        });
      });

    // API Usage
    builder
      .addCase(fetchAPIUsage.pending, (state) => {
        state.loading.queries = true;
      })
      .addCase(fetchAPIUsage.fulfilled, (state, action) => {
        state.loading.queries = false;
        // API usage data can be stored in state if needed
      })
      .addCase(fetchAPIUsage.rejected, (state, action) => {
        state.loading.queries = false;
        state.error.queries = action.error.message || 'Failed to fetch API usage';
      });

    // Note: Lead enrichment and analytics not implemented
  },
});

export const {
  setSelectedLeads,
  toggleLeadSelection,
  selectAllLeads,
  clearSelection,
  setSearchFilters,
  clearSearchFilters,
  setCurrentLead,
  clearErrors,
  clearConversionResult,
} = pdlSlice.actions;

export default pdlSlice.reducer;