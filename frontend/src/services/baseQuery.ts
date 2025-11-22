import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Get token from localStorage or Redux state
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

// Enhanced base query with automatic token refresh and response unwrapping
export const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Unwrap the response data if it has the success wrapper
  if (result?.data && typeof result.data === 'object' && 'success' in result.data && 'data' in result.data) {
    result.data = (result.data as any).data;
  }
  
  if (result?.error?.status === 401) {
    // Try to get a new token
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );
      
      if (refreshResult?.data) {
        const refreshData = refreshResult.data as any;
        const accessToken = refreshData.success ? refreshData.data.accessToken : refreshData.accessToken;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry the original query with new token
        result = await baseQuery(args, api, extraOptions);
        
        // Unwrap the retried response data too
        if (result?.data && typeof result.data === 'object' && 'success' in result.data && 'data' in result.data) {
          result.data = (result.data as any).data;
        }
      } else {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    } else {
      // No refresh token, redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
  }
  
  return result;
};