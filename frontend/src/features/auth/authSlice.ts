import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'analyst' | 'user' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: string[];
  isActive: boolean; // For backward compatibility
  emailVerified?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
};

// Login async thunk
export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', payload);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

// Refresh token async thunk
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const res = await api.post('/auth/refresh', { refreshToken });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

// Logout async thunk
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const accessToken = state.auth.accessToken;
      
      if (accessToken) {
        await api.post('/auth/logout');
      }
      return true;
    } catch (err: any) {
      // Even if logout API call fails, we should clear local state
      console.error('Logout API call failed:', err);
      return true;
    }
  }
);

// Get user profile async thunk
export const getUserProfile = createAsyncThunk(
  'auth/getUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      // Add cache-busting parameter to force fresh request
      const timestamp = Date.now();
      const res = await api.get(`/auth/profile?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

// Update user profile async thunk
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (payload: { firstName?: string; lastName?: string }, { rejectWithValue }) => {
    try {
      const res = await api.put('/auth/profile', payload);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearAuth(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.accessToken = action.payload.data.accessToken;
      state.refreshToken = action.payload.data.refreshToken;
      state.user = action.payload.data.user;
      state.isAuthenticated = true;
      state.error = null;
      
      // Store tokens and user in localStorage
      localStorage.setItem('accessToken', action.payload.data.accessToken);
      localStorage.setItem('refreshToken', action.payload.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(action.payload.data.user));
    });
    builder.addCase(login.rejected, (state, action: any) => {
      state.loading = false;
      state.error = action.payload || 'Login failed';
      state.isAuthenticated = false;
    });

    // Refresh token cases
    builder.addCase(refreshToken.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.loading = false;
      state.accessToken = action.payload.data.accessToken;
      state.isAuthenticated = true;
      state.error = null;
      
      localStorage.setItem('accessToken', action.payload.data.accessToken);
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.loading = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = 'Session expired. Please login again.';
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });

    // Logout cases
    builder.addCase(logout.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.loading = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });
    builder.addCase(logout.rejected, (state) => {
      // Even if logout fails, clear the local state
      state.loading = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });

    // Get user profile cases
    builder.addCase(getUserProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getUserProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.data;
      state.error = null;
      localStorage.setItem('user', JSON.stringify(action.payload.data));
    });
    builder.addCase(getUserProfile.rejected, (state, action: any) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch user profile';
    });

    // Update user profile cases
    builder.addCase(updateUserProfile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.data;
      localStorage.setItem('user', JSON.stringify(action.payload.data));
    });
    builder.addCase(updateUserProfile.rejected, (state, action: any) => {
      state.loading = false;
      state.error = action.payload || 'Failed to update profile';
    });
  },
});

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
