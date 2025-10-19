# Microservices Architecture - CRM System

## Overview
Microservices architecture cho CRM system với focus vào scalability, maintainability, và domain separation. Mỗi service sẽ có responsibility riêng và communicate qua well-defined APIs.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (ALB)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                  API Gateway                                │
│            (Authentication, Rate Limiting,                  │
│             Routing, Request Logging)                       │
└─────┬───────┬───────┬───────┬───────┬───────┬──────────────┘
      │       │       │       │       │       │
   ┌──▼──┐ ┌─▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌─▼──────┐
   │Auth │ │CRM │ │Soc. │ │Anal.│ │Notif│ │File    │
   │Svc  │ │Core│ │Media│ │Svc  │ │Svc  │ │Storage │
   └──┬──┘ └─┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └─┬──────┘
      │      │       │       │       │       │
   ┌──▼──────▼───────▼───────▼───────▼───────▼──────┐
   │              Message Queue (SQS/SNS)           │
   └─────────────────────────────────────────────────┘
```

---

## 🔐 1. Authentication Service (auth-service)

### Responsibilities
- User authentication & authorization
- JWT token management
- Password management
- Session management
- Role-based access control (RBAC)

### APIs
```
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/register
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/verify-token
GET  /auth/user-permissions
```

### Database
```sql
-- Dedicated auth database
Tables:
- users
- user_sessions
- password_resets
- user_roles
- permissions
- role_permissions
```

### Technologies
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **Cache**: Redis (for sessions & tokens)
- **Libraries**: bcrypt, jsonwebtoken, passport.js

### Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800
REDIS_URL=redis://localhost:6379
DB_AUTH_URL=postgresql://user:pass@host:5432/auth_db
```

---

## 🏢 2. CRM Core Service (crm-core-service)

### Responsibilities
- Companies management
- Contacts & leads management
- Opportunities & pipeline
- Activities tracking
- Appointments & calendar

### APIs
```
# Companies
GET    /companies
POST   /companies
GET    /companies/:id
PUT    /companies/:id
DELETE /companies/:id

# Contacts
GET    /contacts
POST   /contacts
GET    /contacts/:id
PUT    /contacts/:id
DELETE /contacts/:id
POST   /contacts/:id/convert

# Opportunities
GET    /opportunities
POST   /opportunities
GET    /opportunities/:id
PUT    /opportunities/:id
PUT    /opportunities/:id/stage
DELETE /opportunities/:id

# Activities
GET    /activities
POST   /activities
PUT    /activities/:id/complete

# Appointments
GET    /appointments
POST   /appointments
PUT    /appointments/:id
```

### Database
```sql
-- Main CRM database
Tables:
- companies
- contacts
- opportunities
- pipeline_stages
- activities
- appointments
- opportunity_history
```

### Event Publishing
```javascript
// Events published by CRM Core
events = [
  'contact.created',
  'contact.updated', 
  'contact.converted',
  'opportunity.created',
  'opportunity.stage_changed',
  'opportunity.won',
  'opportunity.lost',
  'activity.created',
  'activity.completed',
  'appointment.scheduled',
  'appointment.completed'
]
```

### Technologies
- **Runtime**: Node.js with Express/Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: AWS SQS
- **Cache**: Redis (for frequently accessed data)

---

## 📱 3. Social Media Service (social-media-service)

### Responsibilities
- Social media profiles management
- Content monitoring & discovery
- Lead scoring from social data
- Integration với X (Twitter) API
- Integration với LinkedIn API

### APIs
```
GET  /social/profiles
POST /social/profiles
PUT  /social/profiles/:id

GET  /social/posts
POST /social/discover
POST /social/analyze-profile

GET  /social/keywords
POST /social/keywords
PUT  /social/keywords/:id

POST /social/score-lead
GET  /social/insights/:contactId
```

### Database
```sql
-- Social media database
Tables:
- social_profiles
- social_posts
- monitoring_keywords
- lead_scores_history
- social_insights
```

### External Integrations
```javascript
// Third-party APIs
integrations = {
  twitter: {
    apiVersion: 'v2',
    rateLimits: '300 requests/15min',
    endpoints: ['users', 'tweets', 'search']
  },
  linkedin: {
    apiVersion: 'v2',
    rateLimits: '100 requests/day',
    endpoints: ['people', 'companies', 'posts']
  }
}
```

### Background Jobs
```javascript
jobs = [
  'social-data-sync',      // Every 30 minutes
  'keyword-monitoring',    // Every 15 minutes  
  'lead-scoring-update',   // Every hour
  'profile-enrichment'     // Daily
]
```

### Technologies
- **Runtime**: Node.js
- **Database**: PostgreSQL + MongoDB (for social data)
- **Queue**: AWS SQS
- **Scheduler**: AWS EventBridge
- **ML**: Python service for sentiment analysis

---

## 📊 4. Analytics Service (analytics-service)

### Responsibilities
- Sales performance analytics
- Pipeline analytics
- User activity tracking
- Custom reports generation
- Dashboard data aggregation

### APIs
```
GET  /analytics/dashboard
GET  /analytics/sales-performance
GET  /analytics/pipeline-health
GET  /analytics/lead-sources
GET  /analytics/conversion-funnel
POST /analytics/custom-report
GET  /analytics/export/:reportId
```

### Database
```sql
-- Analytics database (optimized for reads)
Tables:
- sales_metrics
- usage_analytics
- pipeline_snapshots
- performance_reports
- custom_reports
```

### Data Processing
```javascript
// Real-time analytics
streamProcessing = {
  source: 'kinesis-stream',
  aggregations: [
    'deals-by-stage',
    'revenue-by-period',
    'user-activity-summary'
  ],
  destinations: ['elasticsearch', 'postgresql']
}

// Batch processing
batchJobs = [
  'daily-performance-summary',
  'weekly-pipeline-snapshot',
  'monthly-sales-report'
]
```

### Technologies
- **Runtime**: Node.js + Python (for heavy analytics)
- **Database**: PostgreSQL + Elasticsearch
- **Stream Processing**: AWS Kinesis
- **Batch Processing**: AWS Batch
- **Visualization**: Chart.js data generation

---

## 🔔 5. Notification Service (notification-service)

### Responsibilities
- Email notifications
- Push notifications
- SMS notifications (future)
- Notification preferences
- Template management

### APIs
```
POST /notifications/send
GET  /notifications/templates
POST /notifications/templates
PUT  /notifications/preferences/:userId
GET  /notifications/history
POST /notifications/broadcast
```

### Database
```sql
-- Notifications database
Tables:
- notification_templates
- user_preferences
- notification_history
- email_queue
- push_subscriptions
```

### Message Types
```javascript
notificationTypes = {
  email: [
    'welcome',
    'password-reset',
    'activity-reminder',
    'deal-stage-change',
    'weekly-summary'
  ],
  push: [
    'activity-due',
    'new-lead',
    'opportunity-update'
  ],
  inApp: [
    'system-announcement',
    'feature-update',
    'usage-tip'
  ]
}
```

### Technologies
- **Runtime**: Node.js
- **Email**: AWS SES
- **Push**: Firebase Cloud Messaging
- **Templates**: Handlebars.js
- **Queue**: AWS SQS

---

## 📁 6. File Storage Service (file-service)

### Responsibilities
- File upload & management
- Image processing
- Document storage
- CDN integration
- File access control

### APIs
```
POST /files/upload
GET  /files/:id
DELETE /files/:id
POST /files/batch-upload
GET  /files/signed-url/:id
POST /files/process-image
```

### Storage Strategy
```javascript
storageConfig = {
  documents: {
    storage: 's3',
    bucket: 'crm-documents',
    encryption: true,
    versioning: true
  },
  avatars: {
    storage: 's3',
    bucket: 'crm-avatars', 
    cdn: 'cloudfront',
    processing: ['resize', 'compress']
  },
  exports: {
    storage: 's3',
    bucket: 'crm-exports',
    ttl: '7 days'
  }
}
```

### Technologies
- **Runtime**: Node.js
- **Storage**: AWS S3
- **CDN**: AWS CloudFront
- **Image Processing**: Sharp.js
- **Database**: File metadata in PostgreSQL

---

## 🌐 7. API Gateway

### Responsibilities
- Request routing
- Authentication validation
- Rate limiting
- Request/response logging
- API versioning
- CORS handling

### Features
```javascript
gatewayFeatures = {
  authentication: {
    validateJWT: true,
    extractUserContext: true,
    roleBasedRouting: true
  },
  rateLimiting: {
    perUser: '1000 req/hour',
    perIP: '100 req/hour',
    perEndpoint: 'custom limits'
  },
  monitoring: {
    requestLogging: true,
    errorTracking: true,
    performanceMetrics: true
  }
}
```

### Routing Configuration
```yaml
routes:
  - path: /auth/*
    service: auth-service
    public: true
    
  - path: /companies/*
    service: crm-core-service
    auth: required
    roles: [sales_rep, manager, admin]
    
  - path: /social/*
    service: social-media-service
    auth: required
    rateLimit: 100/hour
    
  - path: /analytics/*
    service: analytics-service
    auth: required
    roles: [manager, admin]
```

### Technologies
- **Gateway**: AWS Application Load Balancer + API Gateway
- **Alternative**: Kong, Zuul, or custom Express.js
- **Rate Limiting**: Redis
- **Monitoring**: CloudWatch

---

## 📨 Inter-Service Communication

### Event-Driven Architecture

```javascript
// Event Bus Configuration
eventBus = {
  platform: 'AWS SNS/SQS',
  topics: [
    'crm.contact.events',
    'crm.opportunity.events', 
    'crm.activity.events',
    'social.discovery.events',
    'analytics.calculation.events'
  ],
  deadLetterQueues: true,
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2
  }
}

// Event Schemas
contactCreatedEvent = {
  eventType: 'contact.created',
  version: '1.0',
  timestamp: '2024-01-15T10:30:00Z',
  source: 'crm-core-service',
  data: {
    contactId: 'uuid',
    companyId: 'uuid',
    source: 'linkedin',
    assignedTo: 'uuid'
  }
}
```

### Synchronous Communication
```javascript
// Direct HTTP calls for immediate data
syncCalls = {
  'auth-service': [
    'verify-token',
    'get-user-permissions'
  ],
  'crm-core-service': [
    'get-contact-details',
    'validate-opportunity'
  ]
}
```

---

## 🗄️ Database Strategy

### Database Per Service
```
auth-service:        PostgreSQL (users, sessions)
crm-core-service:    PostgreSQL (main CRM data)
social-media-service: PostgreSQL + MongoDB (structured + social data)
analytics-service:   PostgreSQL + Elasticsearch (metrics + search)
notification-service: PostgreSQL (templates, preferences)
file-service:        PostgreSQL (file metadata)
```

### Shared Database Considerations
```javascript
sharedData = {
  userProfiles: {
    strategy: 'replicate',
    source: 'auth-service',
    consumers: ['crm-core', 'analytics', 'notifications']
  },
  
  lookupTables: {
    strategy: 'shared-database',
    tables: ['countries', 'industries', 'currencies'],
    access: 'read-only'
  }
}
```

---

## 🚀 Deployment Strategy

### Containerization
```dockerfile
# Example service Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Service Mesh (Optional)
```yaml
# Istio service mesh for advanced traffic management
serviceMesh:
  provider: istio
  features:
    - traffic-splitting
    - circuit-breaking
    - mutual-tls
    - observability
```

### Container Orchestration
```yaml
# AWS ECS Task Definition
taskDefinition:
  family: crm-core-service
  cpu: 512
  memory: 1024
  containers:
    - name: crm-core
      image: crm-core:latest
      portMappings:
        - containerPort: 3000
      environment:
        - name: NODE_ENV
          value: production
```

---

## 📊 Monitoring & Observability

### Service Health Checks
```javascript
healthChecks = {
  endpoints: {
    liveness: '/health/live',
    readiness: '/health/ready',
    startup: '/health/startup'
  },
  checks: [
    'database-connection',
    'external-api-availability',
    'queue-connection',
    'disk-space'
  ]
}
```

### Distributed Tracing
```javascript
tracing = {
  tool: 'AWS X-Ray',
  alternatives: ['Jaeger', 'Zipkin'],
  features: [
    'request-tracing',
    'performance-analysis',
    'error-tracking',
    'dependency-mapping'
  ]
}
```

### Metrics Collection
```javascript
metrics = {
  application: [
    'request-rate',
    'error-rate', 
    'response-time',
    'business-metrics'
  ],
  infrastructure: [
    'cpu-usage',
    'memory-usage',
    'disk-io',
    'network-io'
  ]
}
```

---

## 🔧 Configuration Management

### Environment-Specific Configs
```javascript
configStrategy = {
  development: {
    source: 'local-files',
    secretsManagement: 'environment-variables'
  },
  production: {
    source: 'AWS-Systems-Manager',
    secretsManagement: 'AWS-Secrets-Manager'
  }
}
```

---

## 📈 Scaling Strategy

### Auto Scaling
```yaml
autoScaling:
  metrics:
    - cpu-utilization: 70%
    - memory-utilization: 80%
    - custom-queue-depth: 100
  
  scaling:
    minInstances: 2
    maxInstances: 20
    scaleOutCooldown: 300s
    scaleInCooldown: 600s
```

### Service-Specific Scaling
```javascript
scalingProfiles = {
  'crm-core-service': {
    pattern: 'predictable-business-hours',
    scaling: 'time-based + metric-based'
  },
  'social-media-service': {
    pattern: 'batch-processing-spikes',
    scaling: 'queue-depth-based'
  },
  'analytics-service': {
    pattern: 'periodic-heavy-computation',
    scaling: 'scheduled + on-demand'
  }
}
```

---

## 🔒 Security Considerations

### Service-to-Service Security
```javascript
security = {
  authentication: 'mutual-TLS',
  authorization: 'service-roles',
  networkSecurity: 'VPC-isolation',
  secretsManagement: 'AWS-Secrets-Manager',
  dataEncryption: {
    inTransit: 'TLS-1.3',
    atRest: 'AES-256'
  }
}
```

---

## 🎯 Implementation Roadmap

### Phase 1: Core Services (4-6 weeks)
1. **Auth Service**: Basic authentication & JWT
2. **CRM Core Service**: Companies, contacts, opportunities
3. **API Gateway**: Basic routing và authentication

### Phase 2: Extended Features (4-6 weeks)
4. **Social Media Service**: LinkedIn/X integration
5. **Notification Service**: Email notifications
6. **File Service**: Basic file upload

### Phase 3: Analytics & Optimization (3-4 weeks)
7. **Analytics Service**: Dashboard và reports
8. **Advanced monitoring**: Distributed tracing
9. **Performance optimization**: Caching, CDN

Đây là comprehensive microservices architecture có thể scale và maintain dễ dàng. Mỗi service có clear boundaries và responsibilities, giúp team development hiệu quả hơn.