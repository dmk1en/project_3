# CRM Consulting API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api/v1`  
**Updated:** November 15, 2025  

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [System Health](#system-health)
   - [Companies](#companies)
   - [Contacts](#contacts)
   - [Opportunities](#opportunities)
   - [Pipeline Stages](#pipeline-stages)
   - [Social Media](#social-media)
   - [Analytics](#analytics)
   - [PDL Integration](#pdl-integration)
6. [Data Models](#data-models)
7. [Frontend Integration Guide](#frontend-integration-guide)

## Overview

The CRM Consulting API is a RESTful API built with Node.js, Express, and PostgreSQL. It provides comprehensive customer relationship management functionality including contact management, opportunity tracking, analytics, and social media integration.

### Key Features
- JWT-based authentication
- Role-based access control (Admin, Manager, Sales Rep, Analyst)
- Comprehensive CRUD operations
- Advanced analytics and reporting
- Social media profile management
- People Data Labs (PDL) integration
- Real-time activity tracking

### Tech Stack
- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Authentication:** JWT tokens
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate limiting

## Authentication

The API uses JWT (JSON Web Token) based authentication with refresh tokens for security.

### Token Types
- **Access Token:** Short-lived (1 hour), used for API requests
- **Refresh Token:** Long-lived (7 days), used to obtain new access tokens

### Headers Required
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### User Roles
- **admin:** Full system access
- **manager:** Manage team and view all data
- **sales_rep:** Manage own contacts and opportunities
- **analyst:** Read-only access to analytics

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Optional detailed information"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

- **Window:** 15 minutes
- **Limit:** 1000 requests per IP
- **Headers:** Standard rate limit headers included

## API Endpoints

## Authentication Endpoints

### POST /auth/login
User authentication

**Access:** Public  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "sales_rep",
      "isActive": true
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 3600
  }
}
```

### POST /auth/refresh
Refresh access token

**Access:** Public  
**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "expiresIn": 3600
  }
}
```

### POST /auth/logout
User logout

**Access:** Private  
**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/profile
Get current user profile

**Access:** Private  
**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "sales_rep",
    "isActive": true,
    "emailVerified": true,
    "lastLogin": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### PUT /auth/profile
Update user profile

**Access:** Private  
**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

## System Health

### GET /health
System health check

**Access:** Public

**Response:**
```json
{
  "success": true,
  "message": "CRM API is running",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## Companies

### GET /companies
Get all companies with pagination and filtering

**Access:** Private  
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in company name, domain
- `industry` (optional): Filter by industry
- `size` (optional): Filter by size (`startup`, `small`, `medium`, `large`, `enterprise`)
- `sort` (optional): Sort field (`name`, `createdAt`, `updatedAt`)
- `order` (optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "uuid",
        "name": "Acme Corp",
        "domain": "acme.com",
        "industry": "Technology",
        "size": "medium",
        "description": "Leading tech company",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001",
        "phone": "+1234567890",
        "email": "info@acme.com",
        "website": "https://acme.com",
        "linkedinUrl": "https://linkedin.com/company/acme",
        "twitterHandle": "@acme",
        "employeeCount": 150,
        "annualRevenue": 5000000,
        "foundedYear": 2010,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### GET /companies/:id
Get single company by ID

**Access:** Private  
**Parameters:**
- `id`: Company UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp",
    "domain": "acme.com",
    // ... all company fields
    "contacts": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@acme.com",
        "title": "CEO"
      }
    ],
    "opportunities": [
      {
        "id": "uuid",
        "title": "Q1 Software License",
        "value": 50000,
        "stage": "Proposal"
      }
    ]
  }
}
```

### POST /companies
Create new company

**Access:** Private (Sales Rep+)  
**Request Body:**
```json
{
  "name": "New Company",
  "domain": "newcompany.com",
  "industry": "Technology",
  "size": "startup",
  "description": "Innovative startup",
  "address": "456 Tech Ave",
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  "postalCode": "94102",
  "phone": "+1987654321",
  "email": "info@newcompany.com",
  "website": "https://newcompany.com",
  "linkedinUrl": "https://linkedin.com/company/newcompany",
  "twitterHandle": "@newcompany",
  "employeeCount": 25,
  "annualRevenue": 1000000,
  "foundedYear": 2023
}
```

### PUT /companies/:id
Update company

**Access:** Private (Sales Rep+)  
**Request Body:** Same as POST (all fields optional)

### DELETE /companies/:id
Delete company (soft delete)

**Access:** Private (Manager+)  
**Response:**
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

## Contacts

### GET /contacts
Get all contacts with pagination and filtering

**Access:** Private  
**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search in name, email
- `companyId`: Filter by company
- `leadStatus`: Filter by status (`new`, `contacted`, `qualified`, `unqualified`, `nurturing`, `converted`, `lost`)
- `source`: Filter by source (`manual`, `linkedin`, `twitter`, `referral`, `website`, `email_campaign`, `cold_outreach`, `event`, `pdl_discovery`)
- `assignedTo`: Filter by assigned user
- `sort`, `order`: Sorting

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "title": "VP of Sales",
        "department": "Sales",
        "companyId": "uuid",
        "company": {
          "id": "uuid",
          "name": "Acme Corp"
        },
        "assignedTo": "uuid",
        "assignedUser": {
          "id": "uuid",
          "firstName": "Sales",
          "lastName": "Rep"
        },
        "leadStatus": "qualified",
        "leadScore": 85,
        "source": "linkedin",
        "linkedinUrl": "https://linkedin.com/in/johndoe",
        "twitterHandle": "@johndoe",
        "notes": "High potential lead",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

### GET /contacts/:id
Get single contact by ID

**Response:** Single contact object with related data (company, opportunities, activities, social profiles)

### POST /contacts
Create new contact

**Access:** Private (Sales Rep+)  
**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1987654321",
  "title": "Marketing Director",
  "department": "Marketing",
  "companyId": "uuid",
  "assignedTo": "uuid",
  "leadStatus": "new",
  "leadScore": 70,
  "source": "website",
  "linkedinUrl": "https://linkedin.com/in/janesmith",
  "twitterHandle": "@janesmith",
  "notes": "Interested in our marketing automation solution"
}
```

### PUT /contacts/:id
Update contact

**Access:** Private (Sales Rep+)  

### DELETE /contacts/:id
Delete contact (soft delete)

**Access:** Private (Manager+)

## Opportunities

### GET /opportunities
Get all opportunities with pagination and filtering

**Access:** Private  
**Query Parameters:**
- Standard pagination and search
- `stageId`: Filter by pipeline stage
- `assignedTo`: Filter by assigned user
- `companyId`: Filter by company
- `contactId`: Filter by contact
- `minValue`, `maxValue`: Value range filter
- `expectedCloseDateFrom`, `expectedCloseDateTo`: Date range filter

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "uuid",
        "title": "Q1 Software License Deal",
        "description": "Annual software licensing agreement",
        "value": 75000,
        "probability": 60,
        "stageId": "uuid",
        "stage": {
          "id": "uuid",
          "name": "Proposal",
          "displayOrder": 3,
          "probabilityPercent": 50
        },
        "contactId": "uuid",
        "contact": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "companyId": "uuid",
        "company": {
          "id": "uuid",
          "name": "Acme Corp"
        },
        "assignedTo": "uuid",
        "assignedUser": {
          "id": "uuid",
          "firstName": "Sales",
          "lastName": "Rep"
        },
        "source": "inbound",
        "priority": "high",
        "expectedCloseDate": "2025-03-31T00:00:00Z",
        "actualCloseDate": null,
        "lostReason": null,
        "nextAction": "Send proposal",
        "nextActionDate": "2025-01-20T00:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /opportunities/:id
Get single opportunity by ID

**Response:** Single opportunity with full related data

### POST /opportunities
Create new opportunity

**Access:** Private (Sales Rep+)  
**Request Body:**
```json
{
  "title": "New Opportunity",
  "description": "Description of the opportunity",
  "value": 50000,
  "probability": 25,
  "stageId": "uuid",
  "contactId": "uuid",
  "companyId": "uuid",
  "assignedTo": "uuid",
  "source": "referral",
  "priority": "medium",
  "expectedCloseDate": "2025-06-30T00:00:00Z",
  "nextAction": "Schedule demo",
  "nextActionDate": "2025-01-25T00:00:00Z"
}
```

### PUT /opportunities/:id
Update opportunity

**Access:** Private (Sales Rep+)

### DELETE /opportunities/:id
Delete opportunity (soft delete)

**Access:** Private (Manager+)

### GET /opportunities/by-stage/:stageId
Get opportunities by pipeline stage

**Access:** Private  
**Parameters:**
- `stageId`: Pipeline stage UUID

### GET /opportunities/by-user/:userId
Get opportunities assigned to specific user

**Access:** Private  
**Parameters:**
- `userId`: User UUID

### GET /opportunities/recent
Get recently created/updated opportunities

**Access:** Private  
**Query Parameters:**
- `limit`: Number of opportunities to return (default: 10)

## Pipeline Stages

### GET /pipeline-stages
Get all pipeline stages

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lead",
      "description": "Initial contact made",
      "displayOrder": 1,
      "probabilityPercent": 10,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Qualified",
      "description": "Lead has been qualified",
      "displayOrder": 2,
      "probabilityPercent": 25,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Social Media

### GET /social/profiles
Get social media profiles

**Access:** Private  
**Query Parameters:**
- `contactId`: Filter by contact
- `platform`: Filter by platform

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "uuid",
        "contactId": "uuid",
        "contact": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "platform": "linkedin",
        "profileUrl": "https://linkedin.com/in/johndoe",
        "username": "johndoe",
        "displayName": "John Doe",
        "bio": "Sales professional with 10+ years experience",
        "followerCount": 1500,
        "connectionStatus": "connected",
        "isVerified": true,
        "lastActivityDate": "2025-01-15T00:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### POST /social/profiles
Create social media profile

**Access:** Private (Sales Rep+)  
**Request Body:**
```json
{
  "contactId": "uuid",
  "platform": "linkedin",
  "profileUrl": "https://linkedin.com/in/newuser",
  "username": "newuser",
  "displayName": "New User",
  "bio": "Professional bio",
  "followerCount": 500,
  "connectionStatus": "not_connected",
  "isVerified": false
}
```

## Analytics

### GET /analytics/dashboard
Get dashboard analytics

**Access:** Private  
**Query Parameters:**
- `period`: Time period (`today`, `week`, `month`, `quarter`, `year`)
- `startDate`, `endDate`: Custom date range (ISO 8601)
- `userId`: Filter by user

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOpportunities": 25,
      "totalValue": 1250000,
      "wonDeals": 8,
      "conversionRate": 32,
      "averageDealSize": 50000,
      "totalContacts": 150,
      "totalCompanies": 45
    },
    "pipelineHealth": [
      {
        "stage": "Lead",
        "stageId": "uuid",
        "probability": 10,
        "count": 10,
        "value": 500000
      }
    ],
    "recentActivities": [
      {
        "id": "uuid",
        "type": "meeting",
        "subject": "Demo scheduled",
        "contact": "John Doe",
        "assignedUser": "Sales Rep",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "topPerformers": [
      {
        "userId": "uuid",
        "name": "Top Sales Rep",
        "totalDeals": 12,
        "totalRevenue": 600000
      }
    ],
    "leadSources": [
      {
        "source": "linkedin",
        "count": 45
      }
    ],
    "period": {
      "type": "month",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z"
    }
  }
}
```

### GET /analytics/sales-performance
Get sales performance report

**Access:** Private (Sales Rep+)  
**Query Parameters:** Same as dashboard

**Response:**
```json
{
  "success": true,
  "data": {
    "timeSeries": [
      {
        "period": "2025-01-01T00:00:00Z",
        "opportunities": 8,
        "revenue": 400000
      }
    ],
    "conversionFunnel": [
      {
        "stage": "New Leads",
        "count": 100
      },
      {
        "stage": "Contacted",
        "count": 75
      },
      {
        "stage": "Qualified",
        "count": 50
      },
      {
        "stage": "Converted",
        "count": 15
      }
    ],
    "dealSizeDistribution": [
      {
        "range": "$1K-$5K",
        "count": 12
      }
    ]
  }
}
```

### GET /analytics/lead-sources
Get lead sources analysis

**Access:** Private (Sales Rep+)

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "source": "linkedin",
        "totalLeads": 45,
        "convertedLeads": 12,
        "conversionRate": 27
      }
    ],
    "summary": {
      "totalSources": 6,
      "bestSource": "linkedin",
      "avgConversionRate": 22
    }
  }
}
```

### GET /analytics/pipeline-forecast
Get pipeline forecasting data

**Access:** Private (Sales Rep+)  
**Query Parameters:**
- `period`: Forecast period (`month`, `quarter`, `year`)
- `userId`: Filter by user
- `stageId`: Filter by stage

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "quarter",
    "forecastPeriod": {
      "start": "2025-01-15",
      "end": "2025-03-31"
    },
    "forecast": {
      "totalOpportunities": 25,
      "totalValue": 1250000,
      "weightedValue": 625000,
      "bestCase": 900000,
      "worstCase": 300000,
      "byStage": {
        "Proposal": {
          "count": 8,
          "totalValue": 400000,
          "weightedValue": 200000,
          "probability": 50
        }
      },
      "byMonth": {
        "2025-01": {
          "count": 10,
          "totalValue": 500000,
          "weightedValue": 250000
        }
      }
    },
    "opportunities": [
      {
        "id": "uuid",
        "title": "Q1 Deal",
        "value": 50000,
        "probability": 75,
        "expectedCloseDate": "2025-03-15T00:00:00Z",
        "contact": "John Doe",
        "assignedUser": "Sales Rep",
        "stage": "Negotiation"
      }
    ]
  }
}
```

### POST /analytics/reports/custom
Generate custom report

**Access:** Private (Manager+)  
**Request Body:**
```json
{
  "reportType": "user_performance",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "filters": {},
  "groupBy": [],
  "metrics": []
}
```

**Available Report Types:**
- `activity_summary`: Activity completion rates by type
- `pipeline_analysis`: Pipeline stage analysis and opportunity distribution
- `user_performance`: Comprehensive user performance metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "reportType": "user_performance",
    "generatedAt": "2025-01-15T10:30:00Z",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    },
    "userPerformance": [
      {
        "userId": "uuid",
        "name": "Top Performer",
        "email": "top@example.com",
        "metrics": {
          "totalOpportunities": 15,
          "totalValue": 750000,
          "avgDealSize": 50000,
          "totalContacts": 45,
          "totalActivities": 120,
          "completedActivities": 100,
          "activityCompletionRate": 83,
          "wonDeals": 5,
          "winRate": 33
        }
      }
    ]
  }
}
```

## PDL Integration

### GET /pdl/queries
Get PDL search query history

**Access:** Private  

**Response:**
```json
{
  "success": true,
  "data": {
    "queries": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 0,
      "itemsPerPage": 20
    }
  }
}
```

### GET /pdl/leads
Get PDL discovered leads

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "uuid",
        "pdlProfileId": "pdl_id",
        "fullName": "John Developer",
        "jobTitle": "software engineer",
        "companyName": "Tech Corp",
        "locationCountry": "vietnam",
        "locationCity": "true",
        "industry": "technology",
        "linkedinUrl": "linkedin.com/in/johndev",
        "email": null,
        "phone": null,
        "sourceQuery": "{\"countries\":[\"vietnam\"],\"jobTitles\":[\"software engineer\"]}",
        "leadType": "staff",
        "status": "pending_review",
        "leadScore": 65,
        "rawData": { /* PDL profile data */ },
        "retrievedAt": "2025-01-15T10:30:00Z",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### POST /pdl/search
Search PDL database (requires appropriate API permissions)

**Access:** Private  
**Request Body:**
```json
{
  "query": {
    "job_title": "software engineer",
    "location_country": "vietnam"
  },
  "size": 10
}
```

**Note:** May return 403 Forbidden if PDL API permissions are insufficient.

## Data Models

### User Model
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'analyst';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Company Model
```typescript
interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  employeeCount?: number;
  annualRevenue?: number;
  foundedYear?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Contact Model
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  companyId?: string;
  assignedTo?: string;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'nurturing' | 'converted' | 'lost';
  leadScore: number;
  source: 'manual' | 'linkedin' | 'twitter' | 'referral' | 'website' | 'email_campaign' | 'cold_outreach' | 'event' | 'pdl_discovery';
  linkedinUrl?: string;
  twitterHandle?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Opportunity Model
```typescript
interface Opportunity {
  id: string;
  title: string;
  description?: string;
  value: number;
  probability?: number;
  stageId: string;
  contactId?: string;
  companyId?: string;
  assignedTo?: string;
  source?: string;
  priority?: 'low' | 'medium' | 'high';
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  nextAction?: string;
  nextActionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pipeline Stage Model
```typescript
interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  probabilityPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Social Profile Model
```typescript
interface SocialProfile {
  id: string;
  contactId: string;
  platform: string;
  profileUrl: string;
  username?: string;
  displayName?: string;
  bio?: string;
  followerCount?: number;
  connectionStatus?: string;
  isVerified?: boolean;
  lastActivityDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Frontend Integration Guide

### Authentication Flow

1. **Login**
   ```javascript
   const response = await fetch('/api/v1/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password })
   });
   const { data } = await response.json();
   
   // Store tokens
   localStorage.setItem('accessToken', data.accessToken);
   localStorage.setItem('refreshToken', data.refreshToken);
   ```

2. **API Requests**
   ```javascript
   const apiRequest = async (url, options = {}) => {
     const token = localStorage.getItem('accessToken');
     
     const response = await fetch(`/api/v1${url}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`,
         ...options.headers
       }
     });
     
     if (response.status === 401) {
       // Handle token refresh
       await refreshToken();
       // Retry request
     }
     
     return response.json();
   };
   ```

3. **Token Refresh**
   ```javascript
   const refreshToken = async () => {
     const refreshToken = localStorage.getItem('refreshToken');
     
     const response = await fetch('/api/v1/auth/refresh', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ refreshToken })
     });
     
     const { data } = await response.json();
     localStorage.setItem('accessToken', data.accessToken);
   };
   ```

### Example API Usage

```javascript
// Get companies with pagination
const getCompanies = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });
  
  return apiRequest(`/companies?${params}`);
};

// Create new contact
const createContact = async (contactData) => {
  return apiRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData)
  });
};

// Update opportunity
const updateOpportunity = async (id, updateData) => {
  return apiRequest(`/opportunities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};

// Get analytics dashboard
const getDashboard = async (period = 'month') => {
  return apiRequest(`/analytics/dashboard?period=${period}`);
};
```

### Error Handling

```javascript
const handleApiError = (response) => {
  if (!response.success) {
    switch (response.error.code) {
      case 'VALIDATION_ERROR':
        // Show validation errors
        console.error('Validation:', response.error.message);
        break;
      case 'UNAUTHORIZED':
        // Redirect to login
        window.location.href = '/login';
        break;
      case 'FORBIDDEN':
        // Show permission error
        alert('Insufficient permissions');
        break;
      case 'NOT_FOUND':
        // Handle not found
        console.error('Resource not found');
        break;
      default:
        // Generic error
        console.error('API Error:', response.error.message);
    }
  }
};
```

### Real-time Updates (Future Enhancement)

The API is designed to support WebSocket connections for real-time updates:

```javascript
// WebSocket connection (when implemented)
const ws = new WebSocket(`ws://localhost:3001/ws?token=${accessToken}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch (update.type) {
    case 'opportunity_updated':
      // Update opportunity in UI
      break;
    case 'new_activity':
      // Show new activity notification
      break;
  }
};
```

### Performance Considerations

1. **Pagination**: Always use pagination for list endpoints
2. **Caching**: Cache static data like pipeline stages
3. **Debouncing**: Debounce search inputs to reduce API calls
4. **Loading States**: Show loading indicators during API calls
5. **Error Boundaries**: Implement error boundaries for graceful error handling

### Security Best Practices

1. **Token Storage**: Use secure storage for tokens
2. **HTTPS**: Always use HTTPS in production
3. **Input Validation**: Validate all user inputs on frontend
4. **XSS Prevention**: Sanitize user-generated content
5. **CSRF Protection**: The API includes CSRF protection

---

**Last Updated:** November 15, 2025  
**API Version:** 1.0.0  
**Contact:** CRM Development Team
