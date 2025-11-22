import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  suspendedUsers: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  status: string;
  permissions: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  permissions?: string[];
}

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'UserStats'],
  endpoints: (builder) => ({
    getUserStats: builder.query<UserStats, void>({
      query: () => '/admin/stats',
      providesTags: ['UserStats'],
    }),

    getUsers: builder.query<GetUsersResponse, GetUsersParams>({
      query: (params) => ({
        url: '/admin/users',
        params,
      }),
      providesTags: (result) =>
        result && result.users
          ? [
              ...result.users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    createUser: builder.mutation<User, CreateUserRequest>({
      query: (userData) => ({
        url: '/admin/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }, 'UserStats'],
    }),

    updateUser: builder.mutation<User, { id: string; userData: UpdateUserRequest }>({
      query: ({ id, userData }) => ({
        url: `/admin/users/${id}`,
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'UserStats',
      ],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'UserStats',
      ],
    }),

    toggleUserStatus: builder.mutation<{ id: string; status: string }, string>({
      query: (id) => ({
        url: `/admin/users/${id}/toggle-status`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'UserStats',
      ],
    }),

    resetPassword: builder.mutation<void, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: `/admin/users/${id}/reset-password`,
        method: 'PATCH',
        body: { newPassword },
      }),
    }),

    getRolePermissions: builder.query<{ role: string; permissions: string[] }, string>({
      query: (role) => `/admin/roles/${role}/permissions`,
    }),

    bulkAction: builder.mutation<{ updatedCount: number }, { action: string; userIds: string[] }>({
      query: ({ action, userIds }) => ({
        url: '/admin/users/bulk-action',
        method: 'POST',
        body: { action, userIds },
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }, 'UserStats'],
    }),
  }),
});

export const {
  useGetUserStatsQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useToggleUserStatusMutation,
  useResetPasswordMutation,
  useGetRolePermissionsQuery,
  useBulkActionMutation,
} = adminApi;