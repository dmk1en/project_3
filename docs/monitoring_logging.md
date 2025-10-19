# Monitoring & Logging Strategy - CRM System

## Overview
Comprehensive monitoring và logging strategy cho CRM system với focus vào observability, alerting, performance monitoring, và compliance. Sử dụng AWS native services kết hợp với third-party tools để có complete visibility.

---

## 🎯 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │Auth Service │  │ CRM Core    │  │Social Media │  │ Analytics   │ │
│  │             │  │ Service     │  │ Service     │  │ Service     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Collection Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ CloudWatch  │  │   X-Ray     │  │    Logs     │  │   Custom    │ │
│  │   Metrics   │  │   Traces    │  │ Aggregator  │  │  Metrics    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Processing Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ElasticSearch│  │   Kinesis   │  │   Lambda    │  │   SNS/SQS   │ │
│  │   & Kibana  │  │    Data     │  │ Processors  │  │  Alerting   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Grafana    │  │  CloudWatch │  │    Kibana   │  │   Custom    │ │
│  │ Dashboards  │  │ Dashboards  │  │ Dashboards  │  │   Portal    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Application Monitoring

### CloudWatch Metrics Configuration

#### Custom Application Metrics
```javascript
// src/monitoring/metrics.js
const AWS = require('aws-sdk')
const cloudwatch = new AWS.CloudWatch()

class MetricsCollector {
  constructor(serviceName) {
    this.serviceName = serviceName
    this.namespace = `CRM/${serviceName}`
  }

  // Business metrics
  async recordUserLogin(userId, loginMethod) {
    await this.putMetric('UserLogin', 1, [
      { Name: 'LoginMethod', Value: loginMethod },
      { Name: 'ServiceName', Value: this.serviceName }
    ])
  }

  async recordLeadCreated(source, score) {
    await this.putMetric('LeadCreated', 1, [
      { Name: 'Source', Value: source },
      { Name: 'ScoreRange', Value: this.getScoreRange(score) }
    ])
  }

  async recordOpportunityStageChange(fromStage, toStage, value) {
    await this.putMetric('OpportunityStageChange', 1, [
      { Name: 'FromStage', Value: fromStage },
      { Name: 'ToStage', Value: toStage }
    ])
    
    await this.putMetric('OpportunityValue', value, [
      { Name: 'Stage', Value: toStage }
    ])
  }

  // Technical metrics
  async recordAPICall(endpoint, method, statusCode, responseTime) {
    await this.putMetric('APICall', 1, [
      { Name: 'Endpoint', Value: endpoint },
      { Name: 'Method', Value: method },
      { Name: 'StatusCode', Value: statusCode.toString() }
    ])
    
    await this.putMetric('APIResponseTime', responseTime, [
      { Name: 'Endpoint', Value: endpoint },
      { Name: 'Method', Value: method }
    ])
  }

  async recordDatabaseQuery(operation, table, executionTime) {
    await this.putMetric('DatabaseQuery', 1, [
      { Name: 'Operation', Value: operation },
      { Name: 'Table', Value: table }
    ])
    
    await this.putMetric('DatabaseQueryTime', executionTime, [
      { Name: 'Operation', Value: operation },
      { Name: 'Table', Value: table }
    ])
  }

  // Helper methods
  async putMetric(metricName, value, dimensions = []) {
    const params = {
      Namespace: this.namespace,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: metricName.includes('Time') ? 'Milliseconds' : 'Count',
        Dimensions: dimensions,
        Timestamp: new Date()
      }]
    }

    try {
      await cloudwatch.putMetricData(params).promise()
    } catch (error) {
      console.error('Failed to put metric:', error)
    }
  }

  getScoreRange(score) {
    if (score < 25) return 'Low'
    if (score < 50) return 'Medium-Low'
    if (score < 75) return 'Medium'
    if (score < 90) return 'High'
    return 'Very-High'
  }
}

module.exports = MetricsCollector
```

### Express.js Middleware for Automatic Metrics
```javascript
// src/middleware/monitoring.js
const MetricsCollector = require('../monitoring/metrics')

function createMonitoringMiddleware(serviceName) {
  const metrics = new MetricsCollector(serviceName)

  return (req, res, next) => {
    const startTime = Date.now()
    
    // Capture original end function
    const originalEnd = res.end

    res.end = function(...args) {
      const responseTime = Date.now() - startTime
      const endpoint = req.route ? req.route.path : req.path
      
      // Record metrics
      metrics.recordAPICall(
        endpoint,
        req.method,
        res.statusCode,
        responseTime
      )

      // Call original end function
      originalEnd.apply(this, args)
    }

    next()
  }
}

module.exports = createMonitoringMiddleware
```

---

## 📋 Structured Logging

### Winston Logger Configuration
```javascript
// src/logging/logger.js
const winston = require('winston')
const { ElasticsearchTransport } = require('winston-elasticsearch')

class StructuredLogger {
  constructor(serviceName, environment) {
    this.serviceName = serviceName
    this.environment = environment
    
    const transports = [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
          })
        )
      }),

      // CloudWatch transport for production
      new winston.transports.File({
        filename: '/var/log/application.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10
      })
    ]

    // Add Elasticsearch transport for production
    if (environment === 'production') {
      transports.push(
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL
          },
          index: `crm-logs-${serviceName}`,
          transformer: (logData) => ({
            '@timestamp': new Date().toISOString(),
            service: serviceName,
            environment: environment,
            level: logData.level,
            message: logData.message,
            ...logData.meta
          })
        })
      )
    }

    this.logger = winston.createLogger({
      level: environment === 'development' ? 'debug' : 'info',
      defaultMeta: {
        service: serviceName,
        environment: environment,
        hostname: require('os').hostname(),
        pid: process.pid
      },
      transports,
      exceptionHandlers: transports,
      rejectionHandlers: transports
    })
  }

  // Structured logging methods
  logAPIRequest(req, res, responseTime) {
    this.logger.info('API Request', {
      type: 'api_request',
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      statusCode: res.statusCode,
      responseTime,
      requestId: req.id
    })
  }

  logBusinessEvent(eventType, eventData, userId = null) {
    this.logger.info('Business Event', {
      type: 'business_event',
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      ...eventData
    })
  }

  logError(error, context = {}) {
    this.logger.error('Application Error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      ...context
    })
  }

  logSecurityEvent(eventType, details, userId = null) {
    this.logger.warn('Security Event', {
      type: 'security_event',
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    })
  }

  logPerformanceIssue(metric, value, threshold, context = {}) {
    this.logger.warn('Performance Issue', {
      type: 'performance_issue',
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      ...context
    })
  }
}

module.exports = StructuredLogger
```

### Request Tracing Middleware
```javascript
// src/middleware/tracing.js
const { v4: uuidv4 } = require('uuid')
const AWSXRay = require('aws-xray-sdk-core')

function createTracingMiddleware() {
  return (req, res, next) => {
    // Generate unique request ID
    req.id = uuidv4()
    
    // Add request ID to response headers
    res.set('X-Request-ID', req.id)
    
    // Create X-Ray subsegment
    const subsegment = AWSXRay.getSegment()?.addNewSubsegment(`${req.method} ${req.path}`)
    
    if (subsegment) {
      subsegment.addAnnotation('method', req.method)
      subsegment.addAnnotation('path', req.path)
      subsegment.addAnnotation('requestId', req.id)
      
      if (req.user) {
        subsegment.addAnnotation('userId', req.user.id)
      }
      
      // Add metadata
      subsegment.addMetadata('request', {
        headers: req.headers,
        query: req.query,
        body: req.body
      })
      
      req.xraySubsegment = subsegment
    }

    // Cleanup on response end
    res.on('finish', () => {
      if (subsegment) {
        subsegment.addAnnotation('statusCode', res.statusCode)
        subsegment.close()
      }
    })

    next()
  }
}

module.exports = createTracingMiddleware
```

---

## 🚨 Alerting Configuration

### CloudWatch Alarms
```yaml
# cloudformation/monitoring.yml
Resources:
  # Application Performance Alarms
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-High-Error-Rate
      AlarmDescription: High error rate detected
      MetricName: 4XXError
      Namespace: AWS/ApplicationELB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref CriticalAlertsTopic
      Dimensions:
        - Name: LoadBalancer
          Value: !Ref ApplicationLoadBalancer

  HighResponseTimeAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-High-Response-Time
      AlarmDescription: API response time is too high
      MetricName: TargetResponseTime
      Namespace: AWS/ApplicationELB
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 2.0
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref WarningAlertsTopic

  # Database Performance Alarms
  DatabaseHighCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-Database-High-CPU
      AlarmDescription: Database CPU utilization is high
      MetricName: CPUUtilization
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref WarningAlertsTopic
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref DatabaseInstance

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-Database-High-Connections
      AlarmDescription: Database connection count is high
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref WarningAlertsTopic

  # Business Metrics Alarms
  LowLeadConversionAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-Low-Lead-Conversion
      AlarmDescription: Lead conversion rate is below threshold
      MetricName: LeadConversionRate
      Namespace: CRM/Business
      Statistic: Average
      Period: 3600
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: LessThanThreshold
      AlarmActions:
        - !Ref BusinessAlertsTopic
      TreatMissingData: breaching

  HighUserAuthFailuresAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CRM-High-Auth-Failures
      AlarmDescription: High number of authentication failures
      MetricName: AuthenticationFailure
      Namespace: CRM/Security
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 20
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SecurityAlertsTopic

  # SNS Topics for different alert types
  CriticalAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: crm-critical-alerts
      Subscription:
        - Protocol: email
          Endpoint: critical-alerts@crm-consulting.com
        - Protocol: sms
          Endpoint: "+1234567890"

  WarningAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: crm-warning-alerts
      Subscription:
        - Protocol: email
          Endpoint: alerts@crm-consulting.com

  BusinessAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: crm-business-alerts
      Subscription:
        - Protocol: email
          Endpoint: business-team@crm-consulting.com

  SecurityAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: crm-security-alerts
      Subscription:
        - Protocol: email
          Endpoint: security-team@crm-consulting.com
```

### Lambda-based Alert Processor
```javascript
// lambda/alert-processor.js
const AWS = require('aws-sdk')
const slack = require('@slack/webhook')
const sns = new AWS.SNS()

exports.handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message)
    
    const alert = {
      alarmName: message.AlarmName,
      newState: message.NewStateValue,
      reason: message.NewStateReason,
      timestamp: message.StateChangeTime,
      metricName: message.Trigger.MetricName,
      threshold: message.Trigger.Threshold
    }

    // Process different types of alerts
    switch (alert.alarmName.split('-')[1]) {
      case 'High':
        await handlePerformanceAlert(alert)
        break
      case 'Database':
        await handleDatabaseAlert(alert)
        break
      case 'Security':
        await handleSecurityAlert(alert)
        break
      case 'Business':
        await handleBusinessAlert(alert)
        break
    }
  }
}

async function handlePerformanceAlert(alert) {
  const webhook = new slack.IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
  
  await webhook.send({
    text: `🚨 Performance Alert: ${alert.alarmName}`,
    attachments: [{
      color: alert.newState === 'ALARM' ? 'danger' : 'good',
      fields: [
        { title: 'Metric', value: alert.metricName, short: true },
        { title: 'Threshold', value: alert.threshold, short: true },
        { title: 'Reason', value: alert.reason, short: false }
      ],
      ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
    }]
  })
}

async function handleSecurityAlert(alert) {
  // Send immediate notification for security issues
  const message = `SECURITY ALERT: ${alert.alarmName}\nReason: ${alert.reason}\nTime: ${alert.timestamp}`
  
  await sns.publish({
    TopicArn: process.env.SECURITY_TOPIC_ARN,
    Message: message,
    Subject: 'URGENT: Security Alert'
  }).promise()
  
  // Also trigger incident response workflow
  await triggerIncidentResponse(alert)
}

async function triggerIncidentResponse(alert) {
  // Create incident in incident management system
  // This could integrate with PagerDuty, Opsgenie, etc.
  console.log('Triggering incident response for:', alert.alarmName)
}
```

---

## 📈 Dashboards & Visualization

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "CRM System Overview",
    "tags": ["crm", "production"],
    "refresh": "30s",
    "panels": [
      {
        "title": "API Performance",
        "type": "graph",
        "targets": [
          {
            "region": "us-east-1",
            "namespace": "AWS/ApplicationELB",
            "metricName": "TargetResponseTime",
            "statistics": ["Average"],
            "dimensions": {
              "LoadBalancer": "crm-production-alb"
            }
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (ms)",
            "min": 0
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [2000],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A", "5m", "now"]
              },
              "reducer": {
                "type": "avg"
              },
              "type": "query"
            }
          ],
          "executionErrorState": "alerting",
          "for": "5m",
          "frequency": "10s",
          "handler": 1,
          "name": "High API Response Time",
          "noDataState": "no_data",
          "notifications": []
        }
      },
      {
        "title": "Business Metrics",
        "type": "stat",
        "targets": [
          {
            "region": "us-east-1",
            "namespace": "CRM/Business",
            "metricName": "LeadsCreated",
            "statistics": ["Sum"],
            "period": "3600"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "region": "us-east-1",
            "namespace": "AWS/ApplicationELB",
            "metricName": "HTTPCode_ELB_4XX_Count",
            "statistics": ["Sum"]
          },
          {
            "region": "us-east-1",
            "namespace": "AWS/ApplicationELB",
            "metricName": "HTTPCode_ELB_5XX_Count",
            "statistics": ["Sum"]
          }
        ]
      }
    ]
  }
}
```

### CloudWatch Dashboard
```yaml
# cloudformation/dashboards.yml
Resources:
  CRMOperationalDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: CRM-Operational-Dashboard
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "x": 0,
              "y": 0,
              "width": 12,
              "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${ApplicationLoadBalancer}"],
                  [".", "TargetResponseTime", ".", "."],
                  [".", "HTTPCode_ELB_4XX_Count", ".", "."],
                  [".", "HTTPCode_ELB_5XX_Count", ".", "."]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "us-east-1",
                "title": "API Performance"
              }
            },
            {
              "type": "metric",
              "x": 0,
              "y": 6,
              "width": 12,
              "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ECS", "CPUUtilization", "ServiceName", "crm-auth-service", "ClusterName", "crm-production"],
                  [".", "MemoryUtilization", ".", ".", ".", "."],
                  [".", "CPUUtilization", "ServiceName", "crm-core-service", "ClusterName", "crm-production"],
                  [".", "MemoryUtilization", ".", ".", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Service Resource Utilization"
              }
            },
            {
              "type": "metric",
              "x": 0,
              "y": 12,
              "width": 12,
              "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${DatabaseInstance}"],
                  [".", "DatabaseConnections", ".", "."],
                  [".", "ReadLatency", ".", "."],
                  [".", "WriteLatency", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Database Performance"
              }
            }
          ]
        }
```

---

## 🔍 Log Analysis & Search

### Elasticsearch Index Configuration
```json
{
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "service": {
        "type": "keyword"
      },
      "environment": {
        "type": "keyword"
      },
      "level": {
        "type": "keyword"
      },
      "message": {
        "type": "text",
        "analyzer": "standard"
      },
      "type": {
        "type": "keyword"
      },
      "userId": {
        "type": "keyword"
      },
      "requestId": {
        "type": "keyword"
      },
      "method": {
        "type": "keyword"
      },
      "url": {
        "type": "keyword"
      },
      "statusCode": {
        "type": "integer"
      },
      "responseTime": {
        "type": "integer"
      },
      "ip": {
        "type": "ip"
      },
      "userAgent": {
        "type": "text"
      },
      "eventType": {
        "type": "keyword"
      },
      "error": {
        "properties": {
          "message": {
            "type": "text"
          },
          "stack": {
            "type": "text"
          }
        }
      }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index": {
      "lifecycle": {
        "name": "crm-logs-policy",
        "rollover_alias": "crm-logs"
      }
    }
  }
}
```

### Kibana Saved Searches
```json
{
  "saved_searches": [
    {
      "title": "API Errors (4xx and 5xx)",
      "description": "All API errors in the last 24 hours",
      "query": {
        "bool": {
          "must": [
            {
              "range": {
                "@timestamp": {
                  "gte": "now-24h"
                }
              }
            },
            {
              "range": {
                "statusCode": {
                  "gte": 400
                }
              }
            }
          ]
        }
      }
    },
    {
      "title": "Slow API Requests",
      "description": "API requests taking more than 2 seconds",
      "query": {
        "bool": {
          "must": [
            {
              "range": {
                "@timestamp": {
                  "gte": "now-1h"
                }
              }
            },
            {
              "range": {
                "responseTime": {
                  "gt": 2000
                }
              }
            }
          ]
        }
      }
    },
    {
      "title": "Security Events",
      "description": "All security-related events",
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "type": "security_event"
              }
            }
          ]
        }
      }
    }
  ]
}
```

---

## 📱 Mobile & Real-time Monitoring

### Real-time Notifications Setup
```javascript
// src/monitoring/realtime-alerts.js
const io = require('socket.io')
const AWS = require('aws-sdk')

class RealTimeAlerting {
  constructor(server) {
    this.io = io(server)
    this.cloudwatch = new AWS.CloudWatch()
    this.setupSocketConnection()
    this.startMetricsPolling()
  }

  setupSocketConnection() {
    this.io.on('connection', (socket) => {
      console.log('Client connected to real-time monitoring')
      
      socket.on('subscribe-alerts', (alertTypes) => {
        socket.join('alerts')
        console.log('Client subscribed to alerts:', alertTypes)
      })
      
      socket.on('subscribe-metrics', (metrics) => {
        socket.join('metrics')
        console.log('Client subscribed to metrics:', metrics)
      })
    })
  }

  async startMetricsPolling() {
    setInterval(async () => {
      try {
        const metrics = await this.getCurrentMetrics()
        this.io.to('metrics').emit('metrics-update', metrics)
        
        // Check for alert conditions
        const alerts = this.checkAlertConditions(metrics)
        if (alerts.length > 0) {
          this.io.to('alerts').emit('new-alerts', alerts)
        }
      } catch (error) {
        console.error('Error polling metrics:', error)
      }
    }, 30000) // Poll every 30 seconds
  }

  async getCurrentMetrics() {
    const params = {
      MetricDataQueries: [
        {
          Id: 'api_requests',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/ApplicationELB',
              MetricName: 'RequestCount'
            },
            Period: 300,
            Stat: 'Sum'
          }
        },
        {
          Id: 'error_rate',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/ApplicationELB',
              MetricName: 'HTTPCode_ELB_5XX_Count'
            },
            Period: 300,
            Stat: 'Sum'
          }
        }
      ],
      StartTime: new Date(Date.now() - 300000), // 5 minutes ago
      EndTime: new Date()
    }

    const result = await this.cloudwatch.getMetricData(params).promise()
    return this.formatMetricsData(result.MetricDataResults)
  }

  checkAlertConditions(metrics) {
    const alerts = []
    
    // Check error rate
    if (metrics.error_rate > 10) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate is ${metrics.error_rate} (threshold: 10)`,
        timestamp: new Date()
      })
    }
    
    return alerts
  }
}

module.exports = RealTimeAlerting
```

---

## 🎯 Performance Monitoring

### APM Integration
```javascript
// src/monitoring/apm.js
const newrelic = require('newrelic')

class ApplicationPerformanceMonitoring {
  static recordCustomEvent(eventType, attributes) {
    newrelic.recordCustomEvent(eventType, attributes)
  }

  static recordCustomMetric(name, value) {
    newrelic.recordMetric(name, value)
  }

  static addCustomAttribute(key, value) {
    newrelic.addCustomAttribute(key, value)
  }

  static startWebTransaction(name, handler) {
    return newrelic.startWebTransaction(name, handler)
  }

  static createTracer(name, callback) {
    return newrelic.createTracer(name, callback)
  }

  // Business-specific monitoring
  static recordLeadConversion(leadId, source, value) {
    this.recordCustomEvent('LeadConversion', {
      leadId,
      source,
      value,
      timestamp: Date.now()
    })
  }

  static recordSocialMediaFetch(platform, leads_found, processing_time) {
    this.recordCustomEvent('SocialMediaFetch', {
      platform,
      leads_found,
      processing_time,
      timestamp: Date.now()
    })
  }

  static recordDatabaseOperation(operation, table, duration) {
    this.recordCustomMetric(`Database/${operation}/${table}`, duration)
  }
}

module.exports = ApplicationPerformanceMonitoring
```

---

## 🔧 Health Checks

### Comprehensive Health Check Implementation
```javascript
// src/health/health-check.js
const AWS = require('aws-sdk')

class HealthCheckService {
  constructor() {
    this.rds = new AWS.RDS()
    this.elasticache = new AWS.ElastiCache()
    this.s3 = new AWS.S3()
  }

  async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ])

    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: process.uptime(),
      version: process.env.APP_VERSION
    }

    checks.forEach((result, index) => {
      const checkNames = ['database', 'redis', 's3', 'external_apis', 'disk_space', 'memory']
      const checkName = checkNames[index]
      
      if (result.status === 'fulfilled') {
        results.checks[checkName] = result.value
      } else {
        results.checks[checkName] = {
          status: 'unhealthy',
          error: result.reason.message
        }
        results.status = 'unhealthy'
      }
    })

    return results
  }

  async checkDatabase() {
    try {
      const pool = require('../database/connection')
      const result = await pool.query('SELECT 1 as health_check')
      
      return {
        status: 'healthy',
        response_time: Date.now() - start,
        details: 'Database connection successful'
      }
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`)
    }
  }

  async checkRedis() {
    try {
      const redis = require('../cache/redis')
      const start = Date.now()
      await redis.ping()
      
      return {
        status: 'healthy',
        response_time: Date.now() - start,
        details: 'Redis connection successful'
      }
    } catch (error) {
      throw new Error(`Redis health check failed: ${error.message}`)
    }
  }

  async checkS3() {
    try {
      const start = Date.now()
      await this.s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise()
      
      return {
        status: 'healthy',
        response_time: Date.now() - start,
        details: 'S3 access successful'
      }
    } catch (error) {
      throw new Error(`S3 health check failed: ${error.message}`)
    }
  }

  async checkExternalAPIs() {
    const checks = []
    
    // Check LinkedIn API
    try {
      const linkedinCheck = await this.checkAPIEndpoint('https://api.linkedin.com/v2/people')
      checks.push({ api: 'linkedin', ...linkedinCheck })
    } catch (error) {
      checks.push({ api: 'linkedin', status: 'unhealthy', error: error.message })
    }

    // Check Twitter API
    try {
      const twitterCheck = await this.checkAPIEndpoint('https://api.twitter.com/2/users/me')
      checks.push({ api: 'twitter', ...twitterCheck })
    } catch (error) {
      checks.push({ api: 'twitter', status: 'unhealthy', error: error.message })
    }

    return {
      status: checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded',
      details: checks
    }
  }

  async checkAPIEndpoint(url) {
    const axios = require('axios')
    const start = Date.now()
    
    try {
      const response = await axios.head(url, { timeout: 5000 })
      return {
        status: response.status < 400 ? 'healthy' : 'unhealthy',
        response_time: Date.now() - start,
        status_code: response.status
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        response_time: Date.now() - start,
        error: error.message
      }
    }
  }

  checkDiskSpace() {
    const fs = require('fs')
    const stats = fs.statSync('/')
    const total = stats.size
    const free = stats.free
    const used = total - free
    const usagePercent = (used / total) * 100

    return {
      status: usagePercent < 85 ? 'healthy' : 'warning',
      details: {
        total_gb: Math.round(total / 1024 / 1024 / 1024),
        free_gb: Math.round(free / 1024 / 1024 / 1024),
        used_percent: Math.round(usagePercent)
      }
    }
  }

  checkMemoryUsage() {
    const total = process.memoryUsage()
    const usedMB = Math.round(total.rss / 1024 / 1024)
    const heapUsedMB = Math.round(total.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(total.heapTotal / 1024 / 1024)

    return {
      status: heapUsedMB < 500 ? 'healthy' : 'warning',
      details: {
        rss_mb: usedMB,
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB
      }
    }
  }
}

module.exports = HealthCheckService
```

---

## 📊 Business Intelligence Monitoring

### KPI Tracking
```javascript
// src/monitoring/business-metrics.js
class BusinessMetricsCollector {
  constructor() {
    this.metrics = new MetricsCollector('business')
  }

  async calculateDailyKPIs() {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // Lead generation metrics
    const newLeads = await this.getNewLeadsCount(yesterday, today)
    const qualifiedLeads = await this.getQualifiedLeadsCount(yesterday, today)
    const conversionRate = qualifiedLeads / newLeads * 100

    // Sales metrics
    const newOpportunities = await this.getNewOpportunitiesCount(yesterday, today)
    const wonDeals = await this.getWonDealsCount(yesterday, today)
    const totalRevenue = await this.getTotalRevenue(yesterday, today)

    // User engagement metrics
    const activeUsers = await this.getActiveUsersCount(yesterday, today)
    const avgSessionDuration = await this.getAverageSessionDuration(yesterday, today)

    // Social media metrics
    const socialLeads = await this.getSocialMediaLeadsCount(yesterday, today)
    const socialEngagement = await this.getSocialEngagementRate(yesterday, today)

    // Record metrics
    await this.metrics.recordBusinessMetric('DailyNewLeads', newLeads)
    await this.metrics.recordBusinessMetric('DailyConversionRate', conversionRate)
    await this.metrics.recordBusinessMetric('DailyRevenue', totalRevenue)
    await this.metrics.recordBusinessMetric('DailyActiveUsers', activeUsers)
    await this.metrics.recordBusinessMetric('SocialMediaLeads', socialLeads)

    return {
      date: today.toISOString().split('T')[0],
      leads: { new: newLeads, qualified: qualifiedLeads, conversion_rate: conversionRate },
      sales: { opportunities: newOpportunities, won_deals: wonDeals, revenue: totalRevenue },
      engagement: { active_users: activeUsers, avg_session_duration: avgSessionDuration },
      social: { leads: socialLeads, engagement_rate: socialEngagement }
    }
  }

  async generateWeeklyReport() {
    const reports = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const metrics = await this.calculateDailyKPIs(date)
      reports.push(metrics)
    }
    return reports
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Basic Monitoring (1-2 weeks)
- [ ] CloudWatch metrics setup
- [ ] Basic alerting configuration
- [ ] Health check endpoints
- [ ] Application logging with Winston
- [ ] Request tracing middleware

### Phase 2: Advanced Monitoring (1-2 weeks)
- [ ] Elasticsearch and Kibana setup
- [ ] Custom business metrics
- [ ] X-Ray distributed tracing
- [ ] Grafana dashboards
- [ ] Real-time alerting system

### Phase 3: Business Intelligence (1 week)
- [ ] KPI tracking automation
- [ ] Business metrics dashboards
- [ ] Automated reporting
- [ ] Performance benchmarking
- [ ] Capacity planning metrics

### Phase 4: Optimization & Automation (1 week)
- [ ] Automated incident response
- [ ] Predictive alerting
- [ ] Cost monitoring and optimization
- [ ] Performance optimization recommendations
- [ ] Comprehensive documentation

**Total estimated time: 4-6 weeks for complete monitoring and logging system**

Đây là comprehensive monitoring và logging strategy đảm bảo full visibility vào system performance, business metrics, security events, và user behavior để support proactive management và optimization.