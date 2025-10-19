# AWS Cloud Architecture - CRM System

## Overview
Comprehensive AWS cloud architecture cho CRM system với focus vào scalability, reliability, security, và cost optimization. Multi-AZ deployment với auto-scaling và disaster recovery capabilities.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Route 53 (DNS)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    CloudFront (CDN)                             │
│              SSL/TLS Termination                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Application Load Balancer  │
        │         (Multi-AZ)          │
        └──────────────┬──────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼───┐         ┌───▼───┐         ┌───▼───┐
│  AZ-1 │         │  AZ-2 │         │  AZ-3 │
│       │         │       │         │       │
│ ECS   │         │ ECS   │         │ ECS   │
│Tasks  │         │Tasks  │         │Tasks  │
└───┬───┘         └───┬───┘         └───┬───┘
    │                 │                 │
    └──────────────────┼─────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │       Database Layer        │
        │    RDS PostgreSQL (Multi-AZ)│
        │    ElastiCache (Redis)      │
        └─────────────────────────────┘
```

---

## 🌐 Network Architecture

### VPC Configuration
```yaml
VPC:
  cidr: 10.0.0.0/16
  enableDnsHostnames: true
  enableDnsSupport: true
  
Subnets:
  # Public subnets for load balancers
  public_subnet_1:
    cidr: 10.0.1.0/24
    availabilityZone: us-east-1a
  public_subnet_2:
    cidr: 10.0.2.0/24
    availabilityZone: us-east-1b
  public_subnet_3:
    cidr: 10.0.3.0/24
    availabilityZone: us-east-1c
    
  # Private subnets for application servers
  private_subnet_1:
    cidr: 10.0.11.0/24
    availabilityZone: us-east-1a
  private_subnet_2:
    cidr: 10.0.12.0/24
    availabilityZone: us-east-1b
  private_subnet_3:
    cidr: 10.0.13.0/24
    availabilityZone: us-east-1c
    
  # Database subnets
  db_subnet_1:
    cidr: 10.0.21.0/24
    availabilityZone: us-east-1a
  db_subnet_2:
    cidr: 10.0.22.0/24
    availabilityZone: us-east-1b
```

### Security Groups
```yaml
# Application Load Balancer Security Group
alb_security_group:
  ingress:
    - port: 443
      protocol: tcp
      source: 0.0.0.0/0
    - port: 80
      protocol: tcp
      source: 0.0.0.0/0
  egress:
    - port: 8080
      protocol: tcp
      destination: ecs_security_group

# ECS Tasks Security Group  
ecs_security_group:
  ingress:
    - port: 8080
      protocol: tcp
      source: alb_security_group
    - port: 3000-3010
      protocol: tcp
      source: alb_security_group
  egress:
    - port: 5432
      protocol: tcp
      destination: rds_security_group
    - port: 6379
      protocol: tcp
      destination: elasticache_security_group
    - port: 443
      protocol: tcp
      destination: 0.0.0.0/0

# RDS Security Group
rds_security_group:
  ingress:
    - port: 5432
      protocol: tcp
      source: ecs_security_group
  egress: []
```

---

## 💻 Compute Layer - ECS

### ECS Cluster Configuration
```yaml
ECS_Cluster:
  name: crm-production
  capacityProviders:
    - FARGATE
    - FARGATE_SPOT
  defaultCapacityProviderStrategy:
    - capacityProvider: FARGATE
      weight: 70
    - capacityProvider: FARGATE_SPOT
      weight: 30

# Service Configuration Template
ECS_Service_Template:
  launchType: FARGATE
  networkMode: awsvpc
  requiresCompatibility:
    - FARGATE
  cpu: 512
  memory: 1024
  
  networkConfiguration:
    subnets:
      - private_subnet_1
      - private_subnet_2
      - private_subnet_3
    securityGroups:
      - ecs_security_group
    assignPublicIp: DISABLED
```

### Individual Services Configuration

#### Auth Service
```yaml
auth_service:
  serviceName: crm-auth-service
  taskDefinition:
    family: crm-auth
    cpu: 256
    memory: 512
    containers:
      - name: auth-service
        image: crm-auth:latest
        portMappings:
          - containerPort: 3001
            protocol: tcp
        environment:
          - name: NODE_ENV
            value: production
          - name: PORT
            value: "3001"
        secrets:
          - name: JWT_SECRET
            valueFrom: /crm/auth/jwt-secret
          - name: DB_URL
            valueFrom: /crm/auth/database-url
        healthCheck:
          command: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
          interval: 30
          timeout: 5
          retries: 3
        
  desiredCount: 2
  minCapacity: 2
  maxCapacity: 10
  
  autoScaling:
    targetCPUUtilization: 70
    targetMemoryUtilization: 80
    scaleOutCooldown: 300
    scaleInCooldown: 600
```

#### CRM Core Service
```yaml
crm_core_service:
  serviceName: crm-core-service
  taskDefinition:
    family: crm-core
    cpu: 512
    memory: 1024
    containers:
      - name: crm-core
        image: crm-core:latest
        portMappings:
          - containerPort: 3002
        environment:
          - name: NODE_ENV
            value: production
          - name: PORT
            value: "3002"
        secrets:
          - name: DB_URL
            valueFrom: /crm/core/database-url
          - name: REDIS_URL
            valueFrom: /crm/core/redis-url
            
  desiredCount: 3
  minCapacity: 2
  maxCapacity: 15
  
  autoScaling:
    targetCPUUtilization: 70
    scaleOutCooldown: 300
    scaleInCooldown: 600
```

#### Social Media Service
```yaml
social_media_service:
  serviceName: crm-social-service
  taskDefinition:
    family: crm-social
    cpu: 512
    memory: 1024
    containers:
      - name: social-service
        image: crm-social:latest
        portMappings:
          - containerPort: 3003
        environment:
          - name: NODE_ENV
            value: production
        secrets:
          - name: TWITTER_API_KEY
            valueFrom: /crm/social/twitter-api-key
          - name: LINKEDIN_API_KEY
            valueFrom: /crm/social/linkedin-api-key
            
  desiredCount: 2
  minCapacity: 1
  maxCapacity: 8
```

---

## 🗄️ Database Layer

### RDS PostgreSQL Configuration
```yaml
RDS_PostgreSQL:
  engine: postgres
  engineVersion: "15.4"
  instanceClass: db.r6g.large
  allocatedStorage: 500
  maxAllocatedStorage: 2000
  storageType: gp3
  storageEncrypted: true
  
  # Multi-AZ for high availability
  multiAZ: true
  availabilityZone: us-east-1a
  secondaryAvailabilityZone: us-east-1b
  
  # Database configuration
  dbName: crm_production
  masterUsername: crm_admin
  manageMasterUserPassword: true
  
  # Backup and maintenance
  backupRetentionPeriod: 7
  backupWindow: "03:00-04:00"
  maintenanceWindow: "sun:04:00-sun:05:00"
  deleteAutomatedBackups: false
  
  # Monitoring
  monitoringInterval: 60
  performanceInsightsEnabled: true
  performanceInsightsRetentionPeriod: 7
  
  # Security
  vpcSecurityGroups:
    - rds_security_group
  dbSubnetGroup: crm-db-subnet-group
  
  # Performance
  parameterGroup:
    - name: shared_preload_libraries
      value: pg_stat_statements
    - name: log_statement
      value: mod
    - name: log_min_duration_statement
      value: 1000
```

### Read Replica for Analytics
```yaml
RDS_Read_Replica:
  sourceDBInstanceIdentifier: crm-production-primary
  instanceClass: db.r6g.large
  availabilityZone: us-east-1c
  publiclyAccessible: false
  
  # Optimized for read workloads
  parameterGroup:
    - name: default_statistics_target
      value: 1000
    - name: random_page_cost
      value: 1.1
```

### ElastiCache Redis Configuration
```yaml
ElastiCache_Redis:
  cacheNodeType: cache.r6g.large
  numCacheNodes: 3
  engine: redis
  engineVersion: "7.0"
  
  # Replication group for high availability
  replicationGroupId: crm-redis-cluster
  description: "CRM Redis cluster for session and cache"
  
  # Multi-AZ with automatic failover
  multiAZEnabled: true
  automaticFailoverEnabled: true
  
  # Security
  atRestEncryptionEnabled: true
  transitEncryptionEnabled: true
  authToken: true
  
  # Subnet and security
  cacheSubnetGroup: crm-cache-subnet-group
  securityGroupIds:
    - elasticache_security_group
    
  # Backup
  snapshotRetentionLimit: 7
  snapshotWindow: "03:00-05:00"
  
  # Notifications
  notificationTopicArn: arn:aws:sns:us-east-1:account:crm-notifications
```

---

## 🔄 Load Balancing

### Application Load Balancer
```yaml
ALB:
  name: crm-production-alb
  scheme: internet-facing
  type: application
  ipAddressType: ipv4
  
  subnets:
    - public_subnet_1
    - public_subnet_2
    - public_subnet_3
    
  securityGroups:
    - alb_security_group
    
  # SSL/TLS Configuration
  listeners:
    - port: 443
      protocol: HTTPS
      sslPolicy: ELBSecurityPolicy-TLS-1-2-2017-01
      certificates:
        - certificateArn: arn:aws:acm:us-east-1:account:certificate-id
      defaultActions:
        - type: forward
          targetGroupArn: crm-core-target-group
          
    - port: 80
      protocol: HTTP
      defaultActions:
        - type: redirect
          redirectConfig:
            protocol: HTTPS
            port: "443"
            statusCode: HTTP_301

# Target Groups
target_groups:
  crm_core_target_group:
    name: crm-core-targets
    port: 3002
    protocol: HTTP
    targetType: ip
    healthCheck:
      enabled: true
      path: /health
      protocol: HTTP
      intervalSeconds: 30
      timeoutSeconds: 5
      healthyThresholdCount: 2
      unhealthyThresholdCount: 3
      
  auth_service_target_group:
    name: crm-auth-targets  
    port: 3001
    protocol: HTTP
    targetType: ip
    healthCheck:
      path: /health
      intervalSeconds: 30
```

### Route-based Load Balancing
```yaml
ALB_Rules:
  # Auth service routing
  - priority: 100
    conditions:
      - field: path-pattern
        values: ["/auth/*"]
    actions:
      - type: forward
        targetGroupArn: auth-service-target-group
        
  # Social media service routing  
  - priority: 200
    conditions:
      - field: path-pattern
        values: ["/social/*"]
    actions:
      - type: forward
        targetGroupArn: social-media-target-group
        
  # Analytics service routing
  - priority: 300
    conditions:
      - field: path-pattern
        values: ["/analytics/*"]
    actions:
      - type: forward
        targetGroupArn: analytics-target-group
        
  # Default to CRM core
  - priority: 1000
    conditions:
      - field: path-pattern
        values: ["/*"]
    actions:
      - type: forward
        targetGroupArn: crm-core-target-group
```

---

## 📁 Storage Services

### S3 Bucket Configuration
```yaml
S3_Buckets:
  # Application assets and frontend
  crm_frontend_assets:
    bucketName: crm-frontend-assets-prod
    versioning: Enabled
    encryption:
      sseAlgorithm: AES256
    publicReadPolicy: true
    corsConfiguration:
      corsRules:
        - allowedHeaders: ["*"]
          allowedMethods: [GET, HEAD]
          allowedOrigins: ["https://app.crm-consulting.com"]
          maxAge: 3600
          
  # User uploaded files
  crm_user_uploads:
    bucketName: crm-user-uploads-prod
    versioning: Enabled
    encryption:
      sseAlgorithm: aws:kms
      kmsMasterKeyID: arn:aws:kms:us-east-1:account:key/key-id
    lifecycleConfiguration:
      rules:
        - id: move_to_ia
          status: Enabled
          transitions:
            - days: 30
              storageClass: STANDARD_IA
        - id: move_to_glacier
          status: Enabled
          transitions:
            - days: 90
              storageClass: GLACIER
              
  # Application backups
  crm_backups:
    bucketName: crm-backups-prod
    versioning: Enabled
    encryption:
      sseAlgorithm: aws:kms
    lifecycleConfiguration:
      rules:
        - id: backup_retention
          status: Enabled
          expiration:
            days: 2555 # 7 years
            
  # Analytics data exports
  crm_analytics_exports:
    bucketName: crm-analytics-exports-prod
    versioning: Disabled
    encryption:
      sseAlgorithm: AES256
    lifecycleConfiguration:
      rules:
        - id: temp_exports
          status: Enabled
          expiration:
            days: 30
```

### CloudFront Distribution
```yaml
CloudFront:
  distribution:
    comment: "CRM Frontend Distribution"
    enabled: true
    priceClass: PriceClass_100
    
    origins:
      # S3 origin for static assets
      - id: s3-frontend-assets
        domainName: crm-frontend-assets-prod.s3.amazonaws.com
        s3OriginConfig:
          originAccessIdentity: origin-access-identity/cloudfront/OAI-ID
          
      # ALB origin for API
      - id: alb-api-origin
        domainName: crm-production-alb-xxxxx.us-east-1.elb.amazonaws.com
        customOriginConfig:
          httpPort: 80
          httpsPort: 443
          originProtocolPolicy: https-only
          
    defaultCacheBehavior:
      targetOriginId: s3-frontend-assets
      viewerProtocolPolicy: redirect-to-https
      cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # Managed-CachingOptimized
      
    cacheBehaviors:
      # API requests - no caching
      - pathPattern: "/api/*"
        targetOriginId: alb-api-origin
        viewerProtocolPolicy: https-only
        cachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # CachingDisabled
        originRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf # CORS-S3Origin
        
      # Static assets - aggressive caching  
      - pathPattern: "/static/*"
        targetOriginId: s3-frontend-assets
        viewerProtocolPolicy: https-only
        cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # CachingOptimized
        
    aliases:
      - app.crm-consulting.com
      - api.crm-consulting.com
      
    viewerCertificate:
      acmCertificateArn: arn:aws:acm:us-east-1:account:certificate-id
      sslSupportMethod: sni-only
      minimumProtocolVersion: TLSv1.2_2021
```

---

## ⚡ Serverless Components

### Lambda Functions
```yaml
Lambda_Functions:
  # Data processing functions
  social_data_processor:
    functionName: crm-social-data-processor
    runtime: nodejs18.x
    handler: index.handler
    memorySize: 512
    timeout: 300
    environment:
      NODE_ENV: production
    deadLetterQueue:
      targetArn: arn:aws:sqs:us-east-1:account:dlq-social-processor
    triggers:
      - type: sqs
        batchSize: 10
        maximumBatchingWindowInSeconds: 5
        
  # Analytics aggregation
  analytics_aggregator:
    functionName: crm-analytics-aggregator
    runtime: python3.9
    handler: app.lambda_handler
    memorySize: 1024
    timeout: 900
    schedule: "rate(1 hour)"
    
  # Report generation
  report_generator:
    functionName: crm-report-generator
    runtime: nodejs18.x
    handler: report.handler
    memorySize: 2048
    timeout: 900
    triggers:
      - type: s3
        bucket: crm-report-requests
        events: ["s3:ObjectCreated:*"]
```

### SQS Queues
```yaml
SQS_Queues:
  # Email notifications queue
  email_notifications:
    queueName: crm-email-notifications
    visibilityTimeout: 300
    messageRetentionPeriod: 1209600 # 14 days
    deadLetterQueue:
      targetArn: arn:aws:sqs:us-east-1:account:dlq-email
      maxReceiveCount: 3
      
  # Social media processing queue
  social_media_processing:
    queueName: crm-social-processing
    visibilityTimeout: 600
    messageRetentionPeriod: 1209600
    batchSize: 10
    
  # Analytics computation queue
  analytics_computation:
    queueName: crm-analytics-computation
    visibilityTimeout: 900
    messageRetentionPeriod: 1209600
```

### SNS Topics
```yaml
SNS_Topics:
  # System notifications
  system_notifications:
    topicName: crm-system-notifications
    subscriptions:
      - protocol: email
        endpoint: admin@crm-consulting.com
      - protocol: sqs
        endpoint: arn:aws:sqs:us-east-1:account:notification-processor
        
  # Alert notifications
  alert_notifications:
    topicName: crm-alert-notifications
    subscriptions:
      - protocol: email
        endpoint: alerts@crm-consulting.com
      - protocol: sms
        endpoint: "+1234567890"
```

---

## 🔧 Infrastructure as Code

### Terraform Configuration
```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "crm-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "crm-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "CRM-System"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
```

### Environment-specific configurations
```bash
# terraform/environments/production.tfvars
aws_region = "us-east-1"
environment = "production"

# VPC configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# ECS configuration
ecs_cluster_name = "crm-production"
auth_service_count = 2
crm_core_service_count = 3
social_service_count = 2

# RDS configuration
rds_instance_class = "db.r6g.large"
rds_allocated_storage = 500
rds_backup_retention_period = 7

# ElastiCache configuration
redis_node_type = "cache.r6g.large"
redis_num_cache_nodes = 3
```

---

## 📊 Monitoring & Observability

### CloudWatch Configuration
```yaml
CloudWatch:
  # Custom metrics
  custom_metrics:
    - metric_name: APIResponseTime
      namespace: CRM/API
      dimensions:
        - Service
        - Endpoint
        
    - metric_name: ActiveUsers
      namespace: CRM/Users
      dimensions:
        - TimeRange
        
    - metric_name: LeadConversionRate
      namespace: CRM/Business
      dimensions:
        - Period
        - Source
        
  # Alarms
  alarms:
    # High error rate
    - alarm_name: High-Error-Rate
      metric_name: 4XXError
      threshold: 10
      comparison_operator: GreaterThanThreshold
      evaluation_periods: 2
      actions:
        - arn:aws:sns:us-east-1:account:alert-notifications
        
    # High response time
    - alarm_name: High-Response-Time
      metric_name: TargetResponseTime
      threshold: 2
      comparison_operator: GreaterThanThreshold
      evaluation_periods: 3
      
    # Database CPU utilization
    - alarm_name: RDS-High-CPU
      metric_name: CPUUtilization
      threshold: 80
      comparison_operator: GreaterThanThreshold
      evaluation_periods: 2
      
  # Log groups
  log_groups:
    - log_group_name: /ecs/crm-auth-service
      retention_in_days: 30
    - log_group_name: /ecs/crm-core-service
      retention_in_days: 30
    - log_group_name: /aws/lambda/crm-social-processor
      retention_in_days: 14
```

### X-Ray Tracing
```yaml
X_Ray:
  tracing_config:
    mode: Active
    
  sampling_rules:
    - service_name: "*"
      http_method: "*"
      url_path: "*"
      fixed_target: 1
      rate: 0.1
      
    - service_name: "crm-core-service"
      http_method: "POST"
      url_path: "/api/v1/opportunities"
      fixed_target: 2
      rate: 0.5
```

---

## 💰 Cost Optimization

### Resource Tagging Strategy
```yaml
tagging_strategy:
  required_tags:
    - Project: CRM-System
    - Environment: production/staging/development
    - Component: auth/core/social/analytics
    - Owner: team-email
    - CostCenter: finance-consulting
    - ManagedBy: terraform
    
  cost_allocation_tags:
    - Environment
    - Component
    - CostCenter
```

### Auto Scaling Policies
```yaml
auto_scaling_policies:
  # ECS services
  ecs_scaling:
    scale_out:
      cpu_threshold: 70
      memory_threshold: 80
      cooldown: 300
      
    scale_in:
      cpu_threshold: 30
      memory_threshold: 40
      cooldown: 600
      
  # RDS scaling
  rds_scaling:
    storage_auto_scaling:
      target_capacity: 80
      maximum_storage: 2000
      
  # ElastiCache scaling
  elasticache_scaling:
    target_memory_utilization: 75
```

### Spot Instance Configuration
```yaml
spot_instances:
  # ECS Fargate Spot
  ecs_fargate_spot:
    capacity_provider_weight: 30
    base_capacity: 2
    
  # Lambda provisioned concurrency during peak hours
  lambda_provisioned_concurrency:
    schedule: "rate(1 hour)"
    provisioned_concurrency: 10
    peak_hours: "09:00-17:00"
```

---

## 🔄 Backup & Disaster Recovery

### Backup Strategy
```yaml
backup_strategy:
  # RDS automated backups
  rds_backups:
    retention_period: 7
    backup_window: "03:00-04:00"
    copy_tags_to_snapshot: true
    
  # Manual snapshots for major releases
  manual_snapshots:
    frequency: "before each deployment"
    retention: "3 months"
    
  # S3 cross-region replication
  s3_replication:
    source_bucket: crm-user-uploads-prod
    destination_bucket: crm-user-uploads-backup-west
    destination_region: us-west-2
    
  # ECS service backup
  ecs_backup:
    task_definition_versions: "keep all"
    configuration_backup: daily
```

### Disaster Recovery Plan
```yaml
disaster_recovery:
  rpo: 4 hours  # Recovery Point Objective
  rto: 2 hours  # Recovery Time Objective
  
  # Multi-region setup
  primary_region: us-east-1
  dr_region: us-west-2
  
  # Failover procedures
  automated_failover:
    - rds_multi_az: automatic
    - elasticache_multi_az: automatic
    - route53_health_checks: automatic_dns_failover
    
  manual_failover:
    - ecs_service_deployment: "deploy to DR region"
    - data_replication: "restore from latest backup"
    - dns_cutover: "update Route53 records"
```

---

## 🔧 Deployment Pipeline

### Blue-Green Deployment
```yaml
blue_green_deployment:
  strategy: blue_green
  
  deployment_steps:
    1: "Deploy to green environment"
    2: "Run integration tests"
    3: "Update load balancer to route traffic to green"
    4: "Monitor metrics for 10 minutes"
    5: "Terminate blue environment if successful"
    
  rollback_procedure:
    - "Switch traffic back to blue environment"
    - "Investigate issues in green environment"
    - "Fix and redeploy to green"
```

---

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure (1-2 weeks)
- [ ] VPC and networking setup
- [ ] ECS cluster creation
- [ ] RDS PostgreSQL setup
- [ ] Basic ALB configuration
- [ ] S3 buckets creation

### Phase 2: Application Deployment (1-2 weeks)
- [ ] Docker images for all services
- [ ] ECS task definitions
- [ ] Service deployment
- [ ] ALB routing rules
- [ ] ElastiCache setup

### Phase 3: Monitoring & Security (1 week)
- [ ] CloudWatch alarms
- [ ] X-Ray tracing
- [ ] Security groups refinement
- [ ] SSL/TLS certificates
- [ ] Backup configuration

### Phase 4: Optimization & DR (1 week)
- [ ] Auto-scaling policies
- [ ] Cost optimization
- [ ] Disaster recovery setup
- [ ] Performance testing
- [ ] Documentation

**Total estimated time: 4-6 weeks for complete AWS infrastructure setup**

Đây là comprehensive AWS architecture có thể handle production workload với high availability, scalability, và security requirements.