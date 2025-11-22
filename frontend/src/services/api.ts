import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    console.log('API Request interceptor:', {
      url: config.url,
      method: config.method,
      hasToken: !!accessToken,
      tokenStart: accessToken ? accessToken.substring(0, 20) + '...' : 'None'
    });
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('API Response interceptor success:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText
    });
    return response;
  },
  async (error) => {
    console.error('API Response interceptor error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data.success) {
            const newAccessToken = response.data.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            
            // Update the authorization header for the original request
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            processQueue(null, newAccessToken);
            
            // Retry the original request
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          
          // Clear all auth data and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Redirect to login page
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    } else if (error.response?.status === 429) {
      console.error('Rate limit exceeded:', error.response.data);
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;