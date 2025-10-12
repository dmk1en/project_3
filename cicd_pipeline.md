# CI/CD Pipeline Design - CRM System

## Overview
Comprehensive CI/CD pipeline cho CRM system sử dụng GitHub Actions với automated testing, security scanning, containerization, và deployment to AWS ECS. Focus vào automation, quality gates, và security.

---

## 🔄 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ auth-service│  │ crm-core    │  │social-media │  │ analytics   │ │
│  │             │  │ service     │  │ service     │  │ service     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                GitHub Actions                               │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
        │  │   Build     │  │    Test     │  │   Security Scan     │ │
        │  │             │  │             │  │                     │ │
        │  └─────────────┘  └─────────────┘  └─────────────────────┘ │
        └──────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                Docker Hub / ECR                             │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
        │  │Docker Images│  │   Tagged    │  │   Vulnerability     │ │
        │  │             │  │  Versions   │  │     Scanned        │ │
        │  └─────────────┘  └─────────────┘  └─────────────────────┘ │
        └──────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                   AWS ECS                                   │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
        │  │ Development │  │   Staging   │  │    Production       │ │
        │  │ Environment │  │Environment  │  │   Environment       │ │
        │  └─────────────┘  └─────────────┘  └─────────────────────┘ │
        └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 GitHub Actions Workflows

### Main CI/CD Workflow
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  
env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
  
jobs:
  # Job 1: Code Quality & Security
  code-quality:
    name: Code Quality & Security Checks
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history for SonarQube
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run ESLint
      run: npm run lint
      
    - name: Run security audit
      run: npm audit --audit-level=high
      
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
        
    - name: SonarQube scan
      uses: sonarqube-quality-gate-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}

  # Job 2: Unit & Integration Tests
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: code-quality
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: crm_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    strategy:
      matrix:
        service: [auth-service, crm-core-service, social-media-service, analytics-service]
        
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: services/${{ matrix.service }}/package-lock.json
        
    - name: Install dependencies
      working-directory: services/${{ matrix.service }}
      run: npm ci
      
    - name: Run unit tests
      working-directory: services/${{ matrix.service }}
      run: npm run test:unit
      env:
        NODE_ENV: test
        DATABASE_URL: postgres://postgres:test@localhost:5432/crm_test
        REDIS_URL: redis://localhost:6379
        
    - name: Run integration tests
      working-directory: services/${{ matrix.service }}
      run: npm run test:integration
      env:
        NODE_ENV: test
        DATABASE_URL: postgres://postgres:test@localhost:5432/crm_test
        REDIS_URL: redis://localhost:6379
        
    - name: Generate test report
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Test Results (${{ matrix.service }})
        path: services/${{ matrix.service }}/test-results.xml
        reporter: jest-junit

  # Job 3: Build & Push Docker Images
  build-and-push:
    name: Build & Push Docker Images
    runs-on: ubuntu-latest
    needs: [code-quality, test]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    
    strategy:
      matrix:
        service: [auth-service, crm-core-service, social-media-service, analytics-service, frontend]
        
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
      
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.ECR_REGISTRY }}/crm-${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
          
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./services/${{ matrix.service }}
        file: ./services/${{ matrix.service }}/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        
    - name: Scan Docker image for vulnerabilities
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.ECR_REGISTRY }}/crm-${{ matrix.service }}:${{ github.sha }}
        format: sarif
        output: trivy-results.sarif
        
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: trivy-results.sarif

  # Job 4: Deploy to Development
  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment: development
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Deploy to ECS
      run: |
        # Update task definitions with new image URIs
        for service in auth-service crm-core-service social-media-service analytics-service; do
          aws ecs update-service \
            --cluster crm-development \
            --service crm-$service-dev \
            --force-new-deployment \
            --region ${{ env.AWS_REGION }}
        done
        
    - name: Wait for deployment
      run: |
        for service in auth-service crm-core-service social-media-service analytics-service; do
          aws ecs wait services-stable \
            --cluster crm-development \
            --services crm-$service-dev \
            --region ${{ env.AWS_REGION }}
        done
        
    - name: Run smoke tests
      run: |
        npm run test:smoke -- --env=development

  # Job 5: Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Deploy with Terraform
      working-directory: terraform/staging
      run: |
        terraform init
        terraform plan -var="image_tag=${{ github.sha }}"
        terraform apply -auto-approve -var="image_tag=${{ github.sha }}"
        
    - name: Run E2E tests
      run: |
        npm run test:e2e -- --env=staging
        
    - name: Performance tests
      run: |
        npm run test:performance -- --env=staging
        
    - name: Security tests
      run: |
        npm run test:security -- --env=staging

  # Job 6: Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Create backup before deployment
      run: |
        # Create RDS snapshot
        aws rds create-db-snapshot \
          --db-instance-identifier crm-production-primary \
          --db-snapshot-identifier crm-backup-$(date +%Y%m%d-%H%M%S) \
          --region ${{ env.AWS_REGION }}
          
    - name: Blue-Green Deployment
      run: |
        # Deploy to green environment
        terraform -chdir=terraform/production plan -var="deployment_color=green" -var="image_tag=${{ github.sha }}"
        terraform -chdir=terraform/production apply -auto-approve -var="deployment_color=green" -var="image_tag=${{ github.sha }}"
        
        # Run health checks
        npm run test:health -- --env=production-green
        
        # Switch traffic to green
        aws elbv2 modify-listener \
          --listener-arn ${{ secrets.PROD_ALB_LISTENER_ARN }} \
          --default-actions Type=forward,TargetGroupArn=${{ secrets.PROD_GREEN_TARGET_GROUP_ARN }}
          
        # Monitor for 10 minutes
        sleep 600
        
        # Check metrics and rollback if needed
        if ! npm run check:metrics -- --env=production; then
          echo "Metrics check failed, rolling back..."
          aws elbv2 modify-listener \
            --listener-arn ${{ secrets.PROD_ALB_LISTENER_ARN }} \
            --default-actions Type=forward,TargetGroupArn=${{ secrets.PROD_BLUE_TARGET_GROUP_ARN }}
          exit 1
        fi
        
    - name: Cleanup old deployment
      if: success()
      run: |
        # Terminate blue environment
        terraform -chdir=terraform/production destroy -target=aws_ecs_service.blue -auto-approve
        
    - name: Notify deployment success
      uses: 8398a7/action-slack@v3
      if: success()
      with:
        status: success
        text: "✅ Production deployment successful!"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        
    - name: Notify deployment failure
      uses: 8398a7/action-slack@v3
      if: failure()
      with:
        status: failure
        text: "❌ Production deployment failed!"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 🧪 Testing Strategy

### Testing Workflows

#### Unit Testing
```yaml
# .github/workflows/unit-tests.yml
name: Unit Tests

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        service: [auth-service, crm-core-service, social-media-service, analytics-service]
        node-version: [18, 20]
        
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: services/${{ matrix.service }}/package-lock.json
        
    - name: Install dependencies
      working-directory: services/${{ matrix.service }}
      run: npm ci
      
    - name: Run tests with coverage
      working-directory: services/${{ matrix.service }}
      run: npm run test:coverage
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: services/${{ matrix.service }}/coverage/lcov.info
        flags: ${{ matrix.service }}
```

#### Integration Testing
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: crm_integration_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Setup test database
      run: |
        npm run db:migrate -- --env=test
        npm run db:seed -- --env=test
      env:
        DATABASE_URL: postgres://postgres:test@localhost:5432/crm_integration_test
        
    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        DATABASE_URL: postgres://postgres:test@localhost:5432/crm_integration_test
        REDIS_URL: redis://localhost:6379
        JWT_SECRET: test-secret
        
    - name: Cleanup
      if: always()
      run: npm run db:reset -- --env=test
```

#### E2E Testing
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        environment: [staging, production]
        
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install Playwright
      run: |
        npm ci
        npx playwright install --with-deps
        
    - name: Run E2E tests
      run: npx playwright test
      env:
        BASE_URL: ${{ matrix.environment == 'staging' && secrets.STAGING_URL || secrets.PRODUCTION_URL }}
        TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
        TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report-${{ matrix.environment }}
        path: playwright-report/
        retention-days: 30
```

---

## 🔒 Security Scanning

### Security Scanning Workflow
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday

jobs:
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high --file=package.json
        
    - name: Upload result to GitHub Code Scanning
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: snyk.sarif

  code-scan:
    name: Static Code Analysis
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: javascript
        
    - name: Autobuild
      uses: github/codeql-action/autobuild@v2
      
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  container-scan:
    name: Container Security Scan
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker images
      run: |
        docker build -t crm-test:latest ./services/auth-service
        
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: crm-test:latest
        format: sarif
        output: trivy-results.sarif
        
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: trivy-results.sarif
```

---

## 🚀 Deployment Strategies

### Blue-Green Deployment Script
```bash
#!/bin/bash
# scripts/blue-green-deploy.sh

set -e

CLUSTER_NAME="crm-production"
SERVICE_NAME="$1"
NEW_IMAGE="$2"
CURRENT_COLOR=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].tags[?key==`Color`].value' --output text)

# Determine target color
if [ "$CURRENT_COLOR" = "blue" ]; then
  TARGET_COLOR="green"
else
  TARGET_COLOR="blue"
fi

echo "Deploying $SERVICE_NAME to $TARGET_COLOR environment..."

# Update task definition
TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition $SERVICE_NAME --query 'taskDefinition')
NEW_TASK_DEFINITION=$(echo $TASK_DEFINITION | jq --arg IMAGE "$NEW_IMAGE" '.containerDefinitions[0].image = $IMAGE' | jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEFINITION" --query 'taskDefinition.taskDefinitionArn' --output text)

# Create or update target environment service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service "$SERVICE_NAME-$TARGET_COLOR" \
  --task-definition $NEW_TASK_DEF_ARN \
  --desired-count 2

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services "$SERVICE_NAME-$TARGET_COLOR"

# Run health checks
./scripts/health-check.sh "$SERVICE_NAME-$TARGET_COLOR"

if [ $? -eq 0 ]; then
  echo "Health checks passed. Switching traffic to $TARGET_COLOR..."
  
  # Update load balancer target group
  aws elbv2 modify-listener \
    --listener-arn $LISTENER_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
    
  # Scale down old environment
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service "$SERVICE_NAME-$CURRENT_COLOR" \
    --desired-count 0
    
  echo "Deployment successful!"
else
  echo "Health checks failed. Rolling back..."
  exit 1
fi
```

### Canary Deployment Script
```bash
#!/bin/bash
# scripts/canary-deploy.sh

set -e

SERVICE_NAME="$1"
NEW_IMAGE="$2"
CANARY_PERCENTAGE="$3"

echo "Starting canary deployment for $SERVICE_NAME with $CANARY_PERCENTAGE% traffic..."

# Deploy canary version
aws ecs update-service \
  --cluster crm-production \
  --service "$SERVICE_NAME-canary" \
  --task-definition $NEW_TASK_DEFINITION \
  --desired-count 1

# Wait for canary to be ready
aws ecs wait services-stable \
  --cluster crm-production \
  --services "$SERVICE_NAME-canary"

# Update ALB to route traffic to canary
aws elbv2 modify-rule \
  --rule-arn $CANARY_RULE_ARN \
  --actions Type=forward,ForwardConfig='{
    "TargetGroups": [
      {
        "TargetGroupArn": "'$MAIN_TARGET_GROUP'",
        "Weight": '$((100 - CANARY_PERCENTAGE))'
      },
      {
        "TargetGroupArn": "'$CANARY_TARGET_GROUP'",
        "Weight": '$CANARY_PERCENTAGE'
      }
    ]
  }'

echo "Canary deployment active with $CANARY_PERCENTAGE% traffic"
echo "Monitor metrics and run: ./scripts/promote-canary.sh $SERVICE_NAME to promote"
echo "Or run: ./scripts/rollback-canary.sh $SERVICE_NAME to rollback"
```

---

## 📊 Monitoring & Alerting

### Pipeline Monitoring
```yaml
# .github/workflows/pipeline-monitoring.yml
name: Pipeline Health Check

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes

jobs:
  monitor:
    runs-on: ubuntu-latest
    
    steps:
    - name: Check pipeline status
      run: |
        # Check recent workflow runs
        FAILED_RUNS=$(gh api repos/$GITHUB_REPOSITORY/actions/runs \
          --jq '.workflow_runs | map(select(.status == "completed" and .conclusion == "failure" and (now - (.created_at | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime)) < 3600)) | length')
        
        if [ $FAILED_RUNS -gt 3 ]; then
          echo "::error::High failure rate detected: $FAILED_RUNS failures in the last hour"
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-type: application/json' \
            --data '{"text":"🚨 CI/CD Pipeline Alert: High failure rate detected!"}'
        fi
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Check deployment health
      run: |
        # Check ECS service health
        for env in development staging production; do
          UNHEALTHY_SERVICES=$(aws ecs describe-services \
            --cluster crm-$env \
            --services $(aws ecs list-services --cluster crm-$env --query 'serviceArns[]' --output text) \
            --query 'services[?runningCount < desiredCount].serviceName' \
            --output text)
            
          if [ ! -z "$UNHEALTHY_SERVICES" ]; then
            echo "::warning::Unhealthy services in $env: $UNHEALTHY_SERVICES"
          fi
        done
```

---

## 🔧 Configuration Management

### Environment-specific Configurations
```yaml
# .github/workflows/config-management.yml
name: Configuration Management

on:
  push:
    paths:
      - 'config/**'
      - 'terraform/**'

jobs:
  validate-config:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Validate Terraform
      run: |
        cd terraform
        terraform fmt -check
        terraform validate
        
    - name: Validate environment configs
      run: |
        for env in development staging production; do
          echo "Validating $env configuration..."
          npx ajv validate -s config/schema.json -d config/$env.json
        done
        
    - name: Check for secrets in config
      run: |
        if grep -r "password\|secret\|key" config/ --exclude="*.md"; then
          echo "::error::Potential secrets found in configuration files"
          exit 1
        fi

  deploy-config:
    runs-on: ubuntu-latest
    needs: validate-config
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        environment: [development, staging, production]
        
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
        
    - name: Update Systems Manager parameters
      run: |
        cd config
        for param in $(jq -r 'keys[]' ${{ matrix.environment }}.json); do
          value=$(jq -r ".$param" ${{ matrix.environment }}.json)
          aws ssm put-parameter \
            --name "/crm/${{ matrix.environment }}/$param" \
            --value "$value" \
            --type "String" \
            --overwrite
        done
```

---

## 📋 Quality Gates

### Pull Request Validation
```yaml
# .github/workflows/pr-validation.yml
name: Pull Request Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Code quality checks
      run: |
        npm run lint
        npm run type-check
        npm run test:unit
        
    - name: Check test coverage
      run: |
        COVERAGE=$(npm run test:coverage --silent | grep -o '[0-9]*%' | head -1 | tr -d '%')
        if [ $COVERAGE -lt 80 ]; then
          echo "::error::Test coverage is below 80%: $COVERAGE%"
          exit 1
        fi
        
    - name: Check bundle size
      run: |
        npm run build
        BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
        echo "Bundle size: $BUNDLE_SIZE"
        
    - name: Security scan
      run: |
        npm audit --audit-level=high
        npx snyk test --severity-threshold=high
        
    - name: Performance budget check
      run: |
        npm run lighthouse-ci
```

---

## 📝 Implementation Checklist

### Phase 1: Basic CI/CD (1-2 weeks)
- [ ] GitHub Actions workflow setup
- [ ] Docker build and push to ECR
- [ ] Basic deployment to development
- [ ] Unit and integration testing
- [ ] Code quality checks (ESLint, Prettier)

### Phase 2: Security & Quality (1 week)
- [ ] Security scanning (Snyk, CodeQL)
- [ ] Container vulnerability scanning (Trivy)
- [ ] Test coverage reporting
- [ ] SonarQube integration
- [ ] Quality gates for PRs

### Phase 3: Advanced Deployment (1-2 weeks)
- [ ] Blue-green deployment
- [ ] Canary deployment
- [ ] Automated rollback
- [ ] Infrastructure as Code (Terraform)
- [ ] Environment promotion pipeline

### Phase 4: Monitoring & Optimization (1 week)
- [ ] Pipeline monitoring
- [ ] Deployment health checks
- [ ] Performance testing automation
- [ ] Slack/email notifications
- [ ] Metrics and alerting

**Total estimated time: 4-6 weeks for complete CI/CD pipeline**

Đây là comprehensive CI/CD pipeline đảm bảo quality, security, và reliability cho production deployments với full automation và monitoring capabilities.