# Security & Authentication Design - CRM System

## Overview
Comprehensive security design cho CRM system với focus vào data protection, access control, và compliance với finance industry standards. Security-first approach với multiple layers of protection.

---

## 🔐 Authentication Architecture

### Authentication Flow Overview
```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Client    │    │ API Gateway │    │ Auth Service │
│ (Web/Mobile)│    │             │    │              │
└──────┬──────┘    └──────┬──────┘    └───────┬──────┘
       │                  │                   │
       │ 1. Login Request │                   │
       ├─────────────────▶│ 2. Forward        │
       │                  ├──────────────────▶│
       │                  │                   │ 3. Validate
       │                  │ 4. JWT + Refresh  │    Credentials
       │                  │◀──────────────────┤
       │ 5. Return Tokens │                   │
       │◀─────────────────┤                   │
       │                  │                   │
       │ 6. API Request   │                   │
       │   + JWT Token    │                   │
       ├─────────────────▶│ 7. Validate JWT   │
       │                  ├──────────────────▶│
       │                  │ 8. User Context   │
       │                  │◀──────────────────┤
       │                  │ 9. Forward to     │
       │                  │    Service        │
       │ 10. Response     │                   │
       │◀─────────────────┤                   │
```

---

## 🎫 JWT Token Strategy

### Access Token Structure
```javascript
// JWT Payload
accessToken = {
  // Standard claims
  iss: 'crm-auth-service',           // Issuer
  sub: 'user-uuid',                  // Subject (User ID)
  aud: 'crm-api',                    // Audience
  exp: 1704067200,                   // Expiration (1 hour)
  iat: 1704063600,                   // Issued at
  jti: 'unique-token-id',            // JWT ID
  
  // Custom claims
  role: 'sales_rep',                 // User role
  permissions: [                     // Granular permissions
    'contacts:read',
    'contacts:write',
    'opportunities:read',
    'companies:read'
  ],
  teamId: 'team-uuid',              // Team assignment
  organizationId: 'org-uuid',       // Organization scope
  sessionId: 'session-uuid',        // Session tracking
  
  // Security features
  scope: 'api:full',                // Token scope
  tokenType: 'access'               // Token type
}
```

### Refresh Token Strategy
```javascript
refreshToken = {
  // Longer expiration (7 days)
  exp: 1704668400,
  sub: 'user-uuid',
  tokenType: 'refresh',
  sessionId: 'session-uuid',
  
  // Security features
  jti: 'refresh-token-id',          // Unique ID for revocation
  parentTokenId: 'access-token-jti', // Link to access token
  
  // Rotation strategy
  rotationCount: 1,                 // Track token rotations
  maxRotations: 5                   // Limit rotations
}
```

### Token Storage Strategy
```javascript
tokenStorage = {
  accessToken: {
    storage: 'memory', // Never in localStorage
    fallback: 'httpOnly-cookie',
    expiry: '1 hour'
  },
  
  refreshToken: {
    storage: 'httpOnly-cookie',
    sameSite: 'strict',
    secure: true,
    expiry: '7 days'
  },
  
  // Token blacklist for logout/revocation
  tokenBlacklist: {
    storage: 'redis',
    expiry: 'token-expiry-time'
  }
}
```

---

## 👥 Role-Based Access Control (RBAC)

### User Roles Hierarchy
```javascript
userRoles = {
  admin: {
    level: 4,
    description: 'Full system access',
    inherits: ['manager', 'sales_rep', 'analyst'],
    permissions: ['*'] // All permissions
  },
  
  manager: {
    level: 3,
    description: 'Team management and advanced features',
    inherits: ['sales_rep', 'analyst'],
    permissions: [
      'users:read', 'users:write',
      'analytics:advanced',
      'reports:export',
      'pipeline:configure',
      'team:manage'
    ]
  },
  
  sales_rep: {
    level: 2,
    description: 'Sales activities and customer management',
    permissions: [
      'contacts:read', 'contacts:write',
      'companies:read', 'companies:write',
      'opportunities:read', 'opportunities:write',
      'activities:read', 'activities:write',
      'appointments:read', 'appointments:write',
      'social:discovery',
      'analytics:basic'
    ]
  },
  
  analyst: {
    level: 1,
    description: 'Read-only access with analytics focus',
    permissions: [
      'contacts:read',
      'companies:read',
      'opportunities:read',
      'activities:read',
      'analytics:read',
      'reports:read'
    ]
  }
}
```

### Permission System
```javascript
// Granular permissions
permissions = {
  // Resource-based permissions
  'contacts:read': 'Read contact information',
  'contacts:write': 'Create/update contacts',
  'contacts:delete': 'Delete contacts',
  'contacts:export': 'Export contact data',
  
  'opportunities:read': 'Read opportunities',
  'opportunities:write': 'Create/update opportunities',
  'opportunities:assign': 'Assign opportunities to others',
  
  // Feature-based permissions
  'social:discovery': 'Use social media discovery',
  'analytics:advanced': 'Access advanced analytics',
  'reports:export': 'Export reports',
  
  // Administrative permissions
  'users:manage': 'Manage user accounts',
  'system:configure': 'Configure system settings',
  'billing:access': 'Access billing information'
}

// Data scope permissions
dataScope = {
  own: 'Access only own data',
  team: 'Access team data',
  organization: 'Access organization data',
  global: 'Access all data'
}
```

### Dynamic Permission Evaluation
```javascript
// Permission middleware
async function checkPermission(requiredPermission, resource = null) {
  const user = getCurrentUser()
  const userPermissions = await getUserPermissions(user.id)
  
  // Check basic permission
  if (!userPermissions.includes(requiredPermission)) {
    throw new ForbiddenError('Insufficient permissions')
  }
  
  // Check data scope if resource provided
  if (resource) {
    const hasAccess = await checkDataScope(user, resource)
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this resource')
    }
  }
  
  return true
}
```

---

## 🔒 Multi-Factor Authentication (MFA)

### MFA Methods
```javascript
mfaMethods = {
  totp: {
    name: 'Time-based OTP (Google Authenticator)',
    enabled: true,
    setup: 'QR code + backup codes',
    validity: '30 seconds'
  },
  
  sms: {
    name: 'SMS verification',
    enabled: true,
    provider: 'AWS SNS',
    validity: '5 minutes'
  },
  
  email: {
    name: 'Email verification',
    enabled: true,
    validity: '10 minutes'
  },
  
  backup_codes: {
    name: 'Backup recovery codes',
    count: 10,
    singleUse: true
  }
}
```

### MFA Flow
```javascript
// MFA challenge flow
mfaFlow = {
  1: {
    step: 'primary_authentication',
    action: 'validate_username_password',
    success: 'generate_mfa_challenge'
  },
  
  2: {
    step: 'mfa_challenge',
    action: 'send_verification_code',
    methods: ['totp', 'sms', 'email'],
    timeout: '5 minutes'
  },
  
  3: {
    step: 'mfa_verification',
    action: 'validate_verification_code',
    success: 'issue_access_token',
    failure: 'increment_failed_attempts'
  }
}
```

---

## 🛡️ API Security

### Request Validation
```javascript
// Input validation middleware
requestValidation = {
  sanitization: {
    library: 'express-validator',
    rules: [
      'trim_whitespace',
      'escape_html',
      'normalize_email',
      'remove_sql_keywords'
    ]
  },
  
  validation: {
    schema_validation: 'joi',
    rate_limiting: 'express-rate-limit',
    size_limits: {
      json: '10mb',
      file_upload: '50mb',
      url_length: '2048'
    }
  }
}
```

### Rate Limiting Strategy
```javascript
rateLimits = {
  // Global rate limits
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10, // Login attempts
    skipSuccessfulRequests: true
  },
  
  // Social media discovery (expensive operations)
  social_discovery: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    keyGenerator: (req) => req.user.id
  },
  
  // File uploads
  file_upload: {
    windowMs: 60 * 60 * 1000,
    max: 50,
    keyGenerator: (req) => req.user.id
  }
}
```

### CORS Configuration
```javascript
corsConfig = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://app.crm-consulting.com',
      'https://staging.crm-consulting.com'
    ]
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  maxAge: 86400 // 24 hours
}
```

---

## 🔐 Data Encryption

### Encryption at Rest
```javascript
encryptionAtRest = {
  database: {
    provider: 'AWS RDS',
    encryption: 'AES-256',
    keyManagement: 'AWS KMS',
    
    // Field-level encryption for sensitive data
    sensitiveFields: {
      'contacts.ssn': 'AES-256-GCM',
      'contacts.passport': 'AES-256-GCM',
      'payment_info.*': 'AES-256-GCM'
    }
  },
  
  fileStorage: {
    provider: 'AWS S3',
    encryption: 'AES-256',
    keyManagement: 'AWS KMS',
    clientSideEncryption: true
  },
  
  backups: {
    encryption: 'AES-256',
    keyRotation: 'annual'
  }
}
```

### Encryption in Transit
```javascript
encryptionInTransit = {
  external: {
    protocol: 'TLS 1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ],
    certificateAuthority: 'LetsEncrypt'
  },
  
  internal: {
    serviceToService: 'mTLS',
    databaseConnection: 'SSL/TLS',
    messageQueue: 'TLS'
  }
}
```

---

## 🔍 Audit Logging

### Audit Events
```javascript
auditEvents = {
  authentication: [
    'login_attempt',
    'login_success',
    'login_failure',
    'logout',
    'password_change',
    'mfa_setup',
    'mfa_disable'
  ],
  
  dataAccess: [
    'record_view',
    'record_create',
    'record_update',
    'record_delete',
    'bulk_export',
    'search_performed'
  ],
  
  administrative: [
    'user_created',
    'user_disabled',
    'role_changed',
    'permission_granted',
    'system_configuration_changed'
  ],
  
  security: [
    'suspicious_activity',
    'rate_limit_exceeded',
    'unauthorized_access_attempt',
    'data_breach_detected'
  ]
}
```

### Audit Log Structure
```javascript
auditLogEntry = {
  id: 'uuid',
  timestamp: '2024-01-15T10:30:00Z',
  eventType: 'record_update',
  severity: 'info', // info, warning, error, critical
  
  // Actor information
  actor: {
    userId: 'uuid',
    email: 'user@company.com',
    role: 'sales_rep',
    sessionId: 'session-uuid'
  },
  
  // Action details
  action: {
    operation: 'UPDATE',
    resource: 'contacts',
    resourceId: 'contact-uuid',
    changes: {
      email: {
        from: 'old@email.com',
        to: 'new@email.com'
      }
    }
  },
  
  // Context
  context: {
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/96.0',
    requestId: 'req-uuid',
    apiEndpoint: '/api/v1/contacts/uuid'
  },
  
  // Result
  result: {
    success: true,
    statusCode: 200,
    errorMessage: null
  }
}
```

---

## 🚨 Security Monitoring

### Threat Detection
```javascript
threatDetection = {
  // Suspicious patterns
  patterns: {
    bruteForce: {
      trigger: '5 failed logins in 5 minutes',
      action: 'account_lockout'
    },
    
    dataExfiltration: {
      trigger: 'large data export outside business hours',
      action: 'alert_security_team'
    },
    
    privilegeEscalation: {
      trigger: 'permission changes for own account',
      action: 'require_admin_approval'
    },
    
    anomalousAccess: {
      trigger: 'login from new location/device',
      action: 'require_mfa_verification'
    }
  },
  
  // Real-time monitoring
  monitoring: {
    failedLogins: 'real-time',
    dataAccess: 'real-time',
    systemChanges: 'real-time',
    apiAnomalies: 'real-time'
  }
}
```

### Incident Response
```javascript
incidentResponse = {
  severity_levels: {
    low: {
      description: 'Minor security event',
      response_time: '24 hours',
      notifications: ['security_team']
    },
    
    medium: {
      description: 'Potential security breach',
      response_time: '4 hours',
      notifications: ['security_team', 'it_manager']
    },
    
    high: {
      description: 'Confirmed security breach',
      response_time: '1 hour',
      notifications: ['security_team', 'management', 'legal']
    },
    
    critical: {
      description: 'Active attack or data breach',
      response_time: '15 minutes',
      notifications: ['all_stakeholders'],
      actions: ['system_lockdown', 'emergency_procedures']
    }
  }
}
```

---

## 🔧 Security Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key
JWT_ACCESS_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800
JWT_ALGORITHM=HS256

# Encryption
ENCRYPTION_KEY=your-encryption-key
KMS_KEY_ID=your-kms-key-id

# Database
DB_SSL_MODE=require
DB_SSL_CERT_PATH=/path/to/cert

# API Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
CORS_ORIGIN=https://app.crm-consulting.com

# MFA Configuration
MFA_ISSUER=CRM-Consulting
TOTP_SECRET_LENGTH=32
SMS_PROVIDER=aws-sns

# Security Monitoring
SECURITY_LOG_LEVEL=info
AUDIT_LOG_RETENTION=2555 # 7 years in days
THREAT_DETECTION_ENABLED=true
```

### Security Headers
```javascript
securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.crm-consulting.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

---

## 📋 Compliance & Standards

### Industry Compliance
```javascript
compliance = {
  gdpr: {
    implementation: [
      'data_minimization',
      'consent_management', 
      'right_to_erasure',
      'data_portability',
      'privacy_by_design'
    ]
  },
  
  sox: {
    requirements: [
      'audit_trails',
      'access_controls',
      'data_integrity',
      'segregation_of_duties'
    ]
  },
  
  iso27001: {
    controls: [
      'access_management',
      'cryptography',
      'communications_security',
      'incident_management'
    ]
  }
}
```

### Data Retention Policies
```javascript
dataRetention = {
  // Personal data
  personalData: {
    retention: '7 years',
    deletion: 'automatic',
    exceptions: ['legal_hold', 'active_disputes']
  },
  
  // Audit logs
  auditLogs: {
    retention: '10 years',
    archival: 'after_3_years',
    storage: 'encrypted_cold_storage'
  },
  
  // Session data
  sessionData: {
    retention: '30 days',
    deletion: 'automatic'
  }
}
```

---

## 🔍 Security Testing

### Automated Security Testing
```javascript
securityTesting = {
  static_analysis: {
    tools: ['SonarQube', 'ESLint Security'],
    schedule: 'every_commit'
  },
  
  dependency_scanning: {
    tools: ['npm audit', 'Snyk'],
    schedule: 'daily'
  },
  
  dynamic_testing: {
    tools: ['OWASP ZAP', 'Burp Suite'],
    schedule: 'weekly'
  },
  
  penetration_testing: {
    frequency: 'quarterly',
    scope: 'full_application',
    provider: 'external_security_firm'
  }
}
```

---

## 📝 Implementation Checklist

### Phase 1: Core Security (2 weeks)
- [ ] JWT authentication implementation
- [ ] Basic RBAC system
- [ ] Password hashing (bcrypt)
- [ ] Basic audit logging
- [ ] HTTPS enforcement

### Phase 2: Advanced Security (2 weeks)
- [ ] Multi-factor authentication
- [ ] Rate limiting
- [ ] Input validation & sanitization
- [ ] CORS configuration
- [ ] Security headers

### Phase 3: Monitoring & Compliance (2 weeks)
- [ ] Comprehensive audit logging
- [ ] Threat detection system
- [ ] Security monitoring dashboard
- [ ] GDPR compliance features
- [ ] Incident response procedures

Đây là comprehensive security design đảm bảo protection cho sensitive financial data và compliance với industry standards.