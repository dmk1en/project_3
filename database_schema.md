# Database Schema Design - CRM System

## Overview
Database schema cho CRM system với Social Media Customer Discovery. Sử dụng PostgreSQL để tận dụng các tính năng advanced như JSON fields, full-text search, và extensibility.

---

## 🗄️ Core Tables

### 1. Users & Authentication

```sql
-- Users table for system authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'sales_rep',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'admin',
    'manager', 
    'sales_rep',
    'analyst'
);

-- User sessions for JWT management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Companies & Organizations

```sql
-- Companies/Organizations
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    size company_size,
    description TEXT,
    website VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    linkedin_url VARCHAR(255),
    twitter_handle VARCHAR(100),
    revenue_range VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE company_size AS ENUM (
    'startup', 
    'small', 
    'medium', 
    'large', 
    'enterprise'
);

-- Company tags for categorization
CREATE TABLE company_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Contacts & Leads

```sql
-- Main contacts/leads table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(150),
    department VARCHAR(100),
    seniority_level contact_seniority,
    linkedin_url VARCHAR(255),
    twitter_handle VARCHAR(100),
    source contact_source NOT NULL,
    lead_score INTEGER DEFAULT 0,
    lead_status lead_status DEFAULT 'new',
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE contact_seniority AS ENUM (
    'entry',
    'mid',
    'senior',
    'director',
    'vp',
    'c_level'
);

CREATE TYPE contact_source AS ENUM (
    'manual',
    'linkedin',
    'twitter',
    'referral',
    'website',
    'email_campaign',
    'cold_outreach',
    'event'
);

CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'unqualified',
    'nurturing',
    'converted',
    'lost'
);
```

### 4. Sales Pipeline & Opportunities

```sql
-- Pipeline stages configuration
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    probability_percent INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, display_order, probability_percent, color) VALUES
('Lead', 1, 10, '#FF6B6B'),
('Qualified', 2, 25, '#4ECDC4'),
('Proposal', 3, 50, '#45B7D1'),
('Negotiation', 4, 75, '#96CEB4'),
('Closed Won', 5, 100, '#FFEAA7'),
('Closed Lost', 6, 0, '#DDA0DD');

-- Opportunities/Deals
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),
    stage_id UUID REFERENCES pipeline_stages(id),
    assigned_to UUID REFERENCES users(id),
    value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    actual_close_date DATE,
    source VARCHAR(100),
    description TEXT,
    next_action TEXT,
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Opportunity history for tracking stage changes
CREATE TABLE opportunity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES pipeline_stages(id),
    to_stage_id UUID REFERENCES pipeline_stages(id),
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Activities & Interactions

```sql
-- Activity types
CREATE TYPE activity_type AS ENUM (
    'call',
    'email',
    'meeting',
    'note',
    'task',
    'demo',
    'proposal_sent',
    'social_interaction'
);

-- Activities log
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type activity_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    contact_id UUID REFERENCES contacts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    priority activity_priority DEFAULT 'medium',
    outcome TEXT,
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE activity_priority AS ENUM ('low', 'medium', 'high', 'urgent');
```

### 6. Appointments & Calendar

```sql
-- Meetings and appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    location VARCHAR(255),
    meeting_url VARCHAR(500), -- For virtual meetings
    organizer_id UUID REFERENCES users(id),
    contact_id UUID REFERENCES contacts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    status appointment_status DEFAULT 'scheduled',
    meeting_type appointment_type DEFAULT 'sales_call',
    reminder_sent BOOLEAN DEFAULT false,
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE appointment_type AS ENUM (
    'sales_call',
    'demo',
    'discovery',
    'proposal_presentation',
    'negotiation',
    'follow_up',
    'internal_meeting'
);

-- Appointment participants (for group meetings)
CREATE TABLE appointment_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    response participant_response DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE participant_response AS ENUM ('pending', 'accepted', 'declined', 'tentative');
```

---

## 🌐 Social Media Integration Tables

### 7. Social Media Profiles

```sql
-- Social media platforms
CREATE TYPE social_platform AS ENUM ('linkedin', 'twitter', 'facebook', 'instagram');

-- Social media profiles linked to contacts
CREATE TABLE social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    profile_url VARCHAR(500) NOT NULL,
    username VARCHAR(100),
    profile_data JSONB, -- Store platform-specific data
    followers_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    engagement_rate DECIMAL(5,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id, platform)
);

-- Social media posts/content monitoring
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_profile_id UUID REFERENCES social_profiles(id),
    platform social_platform NOT NULL,
    post_id VARCHAR(255) NOT NULL, -- Platform-specific post ID
    content TEXT,
    post_url VARCHAR(500),
    post_type VARCHAR(50), -- post, retweet, share, etc.
    engagement_metrics JSONB, -- likes, shares, comments, etc.
    sentiment sentiment_score,
    keywords TEXT[], -- Array of detected keywords
    posted_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, post_id)
);

CREATE TYPE sentiment_score AS ENUM ('very_positive', 'positive', 'neutral', 'negative', 'very_negative');
```

### 8. Lead Discovery & Scoring

```sql
-- Social media monitoring keywords
CREATE TABLE monitoring_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    weight DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead scoring rules
CREATE TABLE scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Flexible criteria definition
    score_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead scores history
CREATE TABLE lead_scores_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    previous_score INTEGER,
    new_score INTEGER,
    score_change INTEGER,
    reason TEXT,
    scoring_rule_id UUID REFERENCES scoring_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 Analytics & Reporting Tables

### 9. Performance Metrics

```sql
-- Sales metrics tracking
CREATE TABLE sales_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    period_start DATE,
    period_end DATE,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System usage analytics
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 10. Feedback & Reviews

```sql
-- Customer feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_type feedback_type DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    collected_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE feedback_type AS ENUM (
    'general',
    'service_quality',
    'communication',
    'product_demo',
    'proposal',
    'post_sale'
);
```

---

## 🔧 System Tables

### 11. Configuration & Settings

```sql
-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    template_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📋 Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_lead_status ON contacts(lead_status);
CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX idx_contacts_source ON contacts(source);

CREATE INDEX idx_opportunities_stage ON opportunities(stage_id);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_close_date ON opportunities(expected_close_date);

CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);

CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_organizer ON appointments(organizer_id);

CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_posted_at ON social_posts(posted_at);
CREATE INDEX idx_social_posts_sentiment ON social_posts(sentiment);

-- Full-text search indexes
CREATE INDEX idx_contacts_fulltext ON contacts USING gin(
    to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, ''))
);

CREATE INDEX idx_companies_fulltext ON companies USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
```

---

## 🔒 Row Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see contacts assigned to them or their team
CREATE POLICY contacts_access_policy ON contacts
    FOR ALL
    TO authenticated_users
    USING (
        assigned_to = current_user_id() OR
        assigned_to IN (SELECT user_id FROM user_teams WHERE team_id IN (
            SELECT team_id FROM user_teams WHERE user_id = current_user_id()
        ))
    );
```

---

## 📝 Notes

1. **UUID Usage**: Sử dụng UUID cho all primary keys để tránh enumeration attacks và distributed scalability.

2. **JSONB Fields**: Sử dụng JSONB cho flexible data như custom_fields, metadata để có thể mở rộng dễ dàng.

3. **Audit Trail**: Tất cả tables có `created_at` và `updated_at` để tracking changes.

4. **Soft Deletes**: Consider thêm `deleted_at` column cho soft deletes nếu cần.

5. **Partitioning**: Có thể partition tables như `activities` và `social_posts` theo time range để improve performance.

6. **Constraints**: Thêm more business logic constraints dựa trên requirements cụ thể.

7. **Triggers**: Implement triggers cho auto-updating `updated_at` timestamps và business logic.

Đây là schema foundation, có thể adjust và extend dựa trên requirements cụ thể trong quá trình development.