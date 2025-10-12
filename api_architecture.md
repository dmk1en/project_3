# API Architecture Design - CRM System

## Overview
API architecture cho CRM system với focus vào scalability, maintainability, và performance. Sẽ sử dụng RESTful API với một số GraphQL endpoints cho complex queries.

---

## 🏗️ Architecture Decision

### REST vs GraphQL Hybrid Approach

**REST API** cho:
- CRUD operations đơn giản
- File uploads
- Authentication endpoints
- Webhook endpoints
- External API integrations

**GraphQL** cho:
- Complex data fetching với multiple relationships
- Dashboard analytics queries
- Real-time subscriptions
- Mobile app optimization

---

## 📋 API Structure

### Base URL Structure
```
Production: https://api.crm-consulting.com/v1
Staging: https://api-staging.crm-consulting.com/v1
Development: http://localhost:3000/api/v1
```

### Authentication
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🔐 Authentication Endpoints

### POST /auth/login
```json
Request:
{
  "email": "user@company.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "sales_rep"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 3600
  }
}
```

### POST /auth/refresh
```json
Request:
{
  "refreshToken": "refresh_token"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 3600
  }
}
```

### POST /auth/logout
```json
Request: {}
Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👥 Users & Profiles

### GET /users/profile
```json
Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "sales_rep",
    "preferences": {
      "timezone": "UTC",
      "dateFormat": "DD/MM/YYYY",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /users/profile
```json
Request:
{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "timezone": "Asia/Ho_Chi_Minh",
    "notifications": {
      "email": true,
      "push": true
    }
  }
}
```

---

## 🏢 Companies API

### GET /companies
```json
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- search: string
- industry: string
- size: enum(startup|small|medium|large|enterprise)
- sort: string (name|createdAt|updatedAt)
- order: enum(asc|desc)

Response:
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "uuid",
        "name": "Tech Corp",
        "domain": "techcorp.com",
        "industry": "Technology",
        "size": "medium",
        "website": "https://techcorp.com",
        "linkedinUrl": "https://linkedin.com/company/techcorp",
        "contactsCount": 15,
        "opportunitiesCount": 3,
        "totalValue": 150000,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20
    }
  }
}
```

### POST /companies
```json
Request:
{
  "name": "New Company",
  "domain": "newcompany.com",
  "industry": "Finance",
  "size": "startup",
  "website": "https://newcompany.com",
  "description": "A fintech startup",
  "address": {
    "street": "123 Main St",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "zipCode": "700000"
  }
}
```

### GET /companies/:id
### PUT /companies/:id
### DELETE /companies/:id

---

## 👤 Contacts API

### GET /contacts
```json
Query Parameters:
- page, limit, search, sort, order (same as companies)
- status: enum(new|contacted|qualified|unqualified|nurturing|converted|lost)
- source: enum(manual|linkedin|twitter|referral|website|email_campaign)
- assignedTo: uuid
- leadScore: range (e.g., "50-100")
- company: uuid

Response:
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@techcorp.com",
        "jobTitle": "CTO",
        "company": {
          "id": "uuid",
          "name": "Tech Corp"
        },
        "leadScore": 85,
        "leadStatus": "qualified",
        "source": "linkedin",
        "assignedTo": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "lastActivity": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": { /* same as companies */ }
  }
}
```

### POST /contacts
```json
Request:
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "phone": "+84901234567",
  "jobTitle": "Marketing Director",
  "companyId": "uuid",
  "source": "linkedin",
  "linkedinUrl": "https://linkedin.com/in/janesmith",
  "notes": "Interested in our consulting services",
  "customFields": {
    "budget": "50000-100000",
    "timeline": "Q2 2024"
  }
}
```

### GET /contacts/:id
### PUT /contacts/:id
### DELETE /contacts/:id

### POST /contacts/:id/convert
```json
Request:
{
  "opportunityName": "Tech Corp - Digital Transformation",
  "value": 75000,
  "expectedCloseDate": "2024-06-30"
}
```

---

## 💼 Opportunities API

### GET /opportunities
```json
Query Parameters:
- page, limit, search, sort, order
- stage: uuid (pipeline stage)
- assignedTo: uuid
- valueRange: string (e.g., "10000-50000")
- expectedCloseDate: date range
- status: enum(open|won|lost)

Response:
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "uuid",
        "name": "Tech Corp - CRM Implementation",
        "value": 75000,
        "currency": "USD",
        "probability": 75,
        "stage": {
          "id": "uuid",
          "name": "Negotiation",
          "probabilityPercent": 75
        },
        "contact": {
          "id": "uuid",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "company": {
          "id": "uuid",
          "name": "Tech Corp"
        },
        "assignedTo": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "expectedCloseDate": "2024-06-30",
        "daysInStage": 15,
        "lastActivity": "2024-01-15T14:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": { /* same structure */ }
  }
}
```

### POST /opportunities
### GET /opportunities/:id
### PUT /opportunities/:id
### DELETE /opportunities/:id

### PUT /opportunities/:id/stage
```json
Request:
{
  "stageId": "uuid",
  "notes": "Moved to negotiation after successful demo"
}
```

---

## 📊 Pipeline & Analytics

### GET /pipeline/stages
```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lead",
      "displayOrder": 1,
      "probabilityPercent": 10,
      "color": "#FF6B6B",
      "opportunitiesCount": 25,
      "totalValue": 500000
    }
  ]
}
```

### GET /analytics/dashboard
```json
Query Parameters:
- period: enum(today|week|month|quarter|year)
- startDate: date
- endDate: date
- userId: uuid (for filtering specific user)

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalOpportunities": 150,
      "totalValue": 2500000,
      "wonDeals": 45,
      "conversionRate": 30,
      "averageDealSize": 55556
    },
    "pipelineHealth": [
      {
        "stage": "Lead",
        "count": 50,
        "value": 1000000
      }
    ],
    "recentActivities": [ /* activities list */ ],
    "topPerformers": [
      {
        "userId": "uuid",
        "name": "John Doe",
        "dealsWon": 12,
        "revenue": 650000
      }
    ]
  }
}
```

---

## 📅 Activities & Calendar

### GET /activities
```json
Query Parameters:
- page, limit, sort, order
- type: enum(call|email|meeting|note|task|demo)
- contactId: uuid
- opportunityId: uuid
- assignedTo: uuid
- dueDate: date range
- completed: boolean

Response:
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "type": "call",
        "subject": "Follow-up call with Jane Smith",
        "description": "Discuss proposal details",
        "contact": {
          "id": "uuid",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "opportunity": {
          "id": "uuid",
          "name": "Tech Corp Deal"
        },
        "assignedTo": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "dueDate": "2024-01-20T15:00:00Z",
        "completedAt": null,
        "priority": "high",
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": { /* same structure */ }
  }
}
```

### POST /activities
### GET /activities/:id
### PUT /activities/:id
### PUT /activities/:id/complete

### GET /appointments
### POST /appointments
### GET /appointments/:id
### PUT /appointments/:id
### DELETE /appointments/:id

---

## 🌐 Social Media Integration

### GET /social/profiles
```json
Query Parameters:
- contactId: uuid
- platform: enum(linkedin|twitter)

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "contactId": "uuid",
      "platform": "linkedin",
      "profileUrl": "https://linkedin.com/in/janesmith",
      "username": "janesmith",
      "followersCount": 2500,
      "engagementRate": 3.5,
      "lastUpdated": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### POST /social/discover
```json
Request:
{
  "keywords": ["fintech", "digital transformation"],
  "platforms": ["linkedin", "twitter"],
  "filters": {
    "location": "Vietnam",
    "industry": "Finance",
    "companySize": ["medium", "large"]
  },
  "limit": 50
}

Response:
{
  "success": true,
  "data": {
    "leads": [
      {
        "platform": "linkedin",
        "profileUrl": "https://linkedin.com/in/johndoe",
        "name": "John Doe",
        "jobTitle": "CFO",
        "company": "Finance Corp",
        "location": "Ho Chi Minh City",
        "score": 85,
        "matchReasons": ["mentioned 'digital transformation'", "works in finance"],
        "recentActivity": "Posted about fintech trends"
      }
    ],
    "totalFound": 25
  }
}
```

### GET /social/posts
### POST /social/posts/analyze

---

## 📊 Lead Scoring

### GET /scoring/rules
### POST /scoring/rules
### PUT /scoring/rules/:id

### POST /scoring/calculate
```json
Request:
{
  "contactId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "currentScore": 75,
    "previousScore": 60,
    "scoreChange": 15,
    "breakdown": [
      {
        "rule": "LinkedIn engagement",
        "score": 20,
        "reason": "High engagement on recent posts"
      },
      {
        "rule": "Job title relevance",
        "score": 25,
        "reason": "Decision maker role"
      }
    ],
    "recommendations": [
      "Reach out within 24 hours",
      "Mention their recent LinkedIn post about digital transformation"
    ]
  }
}
```

---

## 📧 Email & Communication

### GET /emails/templates
### POST /emails/send
```json
Request:
{
  "to": ["jane@company.com"],
  "templateId": "uuid",
  "variables": {
    "firstName": "Jane",
    "companyName": "Tech Corp"
  },
  "contactId": "uuid",
  "opportunityId": "uuid"
}
```

### GET /emails/history

---

## 📈 Reporting

### GET /reports/sales-performance
### GET /reports/lead-sources
### GET /reports/conversion-funnel
### POST /reports/custom

---

## 🔔 Notifications & Webhooks

### GET /notifications
### PUT /notifications/:id/read
### POST /webhooks/configure

---

## 📱 GraphQL Schema

```graphql
type Query {
  dashboard(period: Period!): DashboardData!
  contact(id: ID!): Contact
  opportunity(id: ID!): Opportunity
  pipeline: [PipelineStage!]!
  searchContacts(query: String!, filters: ContactFilters): [Contact!]!
}

type Mutation {
  createContact(input: CreateContactInput!): Contact!
  updateOpportunityStage(id: ID!, stageId: ID!): Opportunity!
  createActivity(input: CreateActivityInput!): Activity!
}

type Subscription {
  opportunityUpdated(pipelineId: ID!): Opportunity!
  newLead: Contact!
  activityDue: Activity!
}
```

---

## 🚀 API Performance & Best Practices

### Rate Limiting
```
- Authenticated users: 1000 requests/hour
- Social media endpoints: 100 requests/hour
- Public endpoints: 100 requests/hour
```

### Caching Strategy
```
- GET endpoints: Cache for 5-15 minutes
- Dashboard data: Cache for 1 minute
- User profile: Cache for 30 minutes
- Static data (pipeline stages): Cache for 1 hour
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Response Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 429: Rate Limited
- 500: Internal Server Error

---

## 🔧 Implementation Notes

1. **Pagination**: Consistent cursor-based pagination cho large datasets
2. **Filtering**: Support complex filtering với query builders
3. **Sorting**: Multi-column sorting support
4. **Validation**: Comprehensive input validation với joi/yup
5. **Documentation**: Auto-generated API docs với Swagger/OpenAPI
6. **Testing**: Comprehensive API testing với Jest + Supertest
7. **Monitoring**: API metrics với Prometheus/DataDog
8. **Security**: Input sanitization, SQL injection prevention, XSS protection

Đây là foundation cho API architecture. Có thể extend và customize based trên specific requirements trong development process.