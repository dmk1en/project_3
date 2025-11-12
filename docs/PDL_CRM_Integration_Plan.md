# Implementation Plan: People Data Labs (PDL) Integration for CRM

## 🎯 1. Define Objectives & Scope  
- **Goal**: Automatically retrieve candidate or lead profiles (people) matching certain criteria (e.g., job titles, industry, location) → display them in a “Potential Leads/Candidates” queue → allow admin/managers to review and “Add to CRM”.  
- **Key Use Cases**:
  - Discover potential **staff**: job title filters (e.g., “Financial Advisor”, “Portfolio Manager”), location (Vietnam, Hanoi, HCMC)  
  - Discover potential **clients/customers**: titles (e.g., “CFO”, “Head of Treasury”), industries (e.g., Banking, Fintech)  
- **Data Flow**: Search → Filter → Review UI → Manual Addition → CRM Database  
- **Access Level**: Use PDL Person Search API (and possibly Person Enrichment later) for people discovery.  
- **Tech Stack Assumption** (you can adjust):
  - Backend: Node.js + Express  
  - Frontend: React  
  - Database: PostgreSQL (or any relational DB)  
  - Scheduler: cron job or a job queue (e.g., Bull)  
- **Security & Compliance**: Use environment variables for API keys; respect PDL credit usage, rate limits.

## 🧱 2. Architecture & Modules  
### 2.1 High‑Level Architecture  
```
[Scheduler / Trigger]  
     ↓  
[Backend “Search Collector” Module] ──> PDL Person Search API  
     ↓  
[Database: Potential Leads Table]  
     ↓  
[Backend “Review UI API”] ──> React Frontend  
     ↓  
[Manager reviews → “Add to CRM”]  
     ↓  
[Database: CRM Leads Table]  
```

### 2.2 Key Modules  
- **Search Collector Module**  
  - Runs queries via PDL Person Search API at scheduled intervals (e.g., daily)  
  - Stores results in `potential_leads` table with metadata (query used, timestamp, status = “pending_review”)  
- **Review UI Module**  
  - API endpoints: `GET /api/leads/potential`, `POST /api/leads/add/:id`  
  - React UI: table/grid of leads with filters, sort, preview columns (name, title, company, location, LinkedIn URL if available)  
  - Action: “Add to CRM” button  
- **CRM Leads Module**  
  - When “Add” clicked: copy data from `potential_leads` into `crm_leads` table, mark status accordingly (e.g., “prospect”)  
  - Possibly notify relevant user or team  
- **Enrichment Module** (optional/next phase)  
  - After a lead is added (or before), call PDL Person Enrichment API to fetch more details (emails, socials, etc.)  
- **Monitoring & Alerts Module**  
  - Track usage of PDL API credits via dashboard  
  - Alert when nearing quota or errors increase  

## 📝 3. Database Schema (Simplified)  
```sql
-- Table for discovered leads
CREATE TABLE potential_leads (
  id SERIAL PRIMARY KEY,
  pdl_profile_id TEXT,          -- unique id from PDL
  full_name TEXT,
  job_title TEXT,
  company_name TEXT,
  location_country TEXT,
  source_query TEXT,            -- store query string used
  retrieved_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending_review',
  raw_data JSONB                -- full JSON from PDL
);

-- Table for CRM leads
CREATE TABLE crm_leads (
  id SERIAL PRIMARY KEY,
  potential_lead_id INT REFERENCES potential_leads(id),
  full_name TEXT,
  job_title TEXT,
  company_name TEXT,
  added_by_user_id INT,         -- admin who added
  added_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'new_prospect',
  raw_data JSONB
);
```

## 🧮 4. Implementation Steps  
### Step 1: Get PDL API Key  
- Sign up for PDL, obtain API key.  
- Review plan, usage limits.

### Step 2: Build Search Collector  
- Create a backend route `/api/leads/search` (can be internal only)  
- Example Person Search API call (via PDL docs)  
  ```js
  const fetch = require('node-fetch');
  async function searchLeads(title, industry, country, size=20) {
    const apiKey = process.env.PDL_API_KEY;
    const url = 'https://api.peopledatalabs.com/v5/person/search';
    const body = {
      size,
      query: {
        bool: {
          must: [
            { term: { job_title_role: title } },
            { term: { industry: industry } },
            { term: { location_country: country } }
          ]
        }
      },
      pretty: true
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X‑Api‑Key': apiKey
      },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    return result.data;
  }
  ```
- Store results in `potential_leads` table.

### Step 3: Schedule Search Jobs  
- Define queries list (e.g., titles = [“Financial Advisor”, “Investment Analyst”], industries = [“Banking”, “Fintech”], country = “Vietnam”)  
- Use a scheduler (cron) or scheduling library (e.g., node‑cron, Bull) to run these periodically (daily/weekly)  
- Each run: for each query → call search → store results with `source_query` metadata.

### Step 4: Build Review UI  
- Backend endpoints:
  - `GET /api/leads/potential?status=pending_review&limit=50` → returns potential leads  
  - `POST /api/leads/add/:id` → mark lead as added, copy to CRM table  
- Frontend (React):
  - Table view with columns: Name, Job Title, Company, Location, Link (LinkedIn if exists)  
  - Filters: title, company, location, status  
  - Button: “Add to CRM”  
  - Confirmation modal when adding  
- On “Add”, send `POST` to backend and update UI.

### Step 5: CRM Leads Integration  
- Backend handles addition: read `potential_leads` record by id → insert into `crm_leads` table with relevant data + user info  
- Possibly call enrichment API (next step) after addition.

### Step 6: Optional Enrichment  
- After adding to CRM, call `/person/enrich` endpoint of PDL to get fuller data (emails, social links) for that person.  
- Update `crm_leads.raw_data` JSON with enriched data.

### Step 7: Monitoring & Error Handling  
- Monitor PDL API usage via PDL Dashboard.  
- Implement logging for API calls, errors, failed responses.  
- Implement retry/backoff for errors.  
- Implement credit‑usage alert (e.g., send internal email if <10% credits left).

### Step 8: AI Coding Integration (Optional)  
- Use AI/analytics module to score or rank leads: e.g., “How likely is this person to be high‑value client?”  
- Feed lead data into AI (internal model) or use heuristic ranking (job title seniority + company size + location)  
- Display “Lead Score” column in review UI.

## 📅 5. Timeline & Milestones  
| Week | Milestone |
|------|-----------|
| Week 1 | Set up PDL account & API key; build backend search collector route; test simple search calls |
| Week 2 | Build `potential_leads` DB table; implement scheduler; store search results; basic logging |
| Week 3 | Build frontend review UI; backend endpoints for review; integrate table view; test manual review flow |
| Week 4 | Build “Add to CRM” flow; CRM leads table; data transfer; review UI updates; basic QA |
| Week 5 | Add enrichment module; call PDL enrichment after addition; update data; display enrichment fields |
| Week 6 | Add AI scoring/ranking; integrate in UI; refine filters and user experience; add monitoring and alerts |
| Week 7 | Testing & QA; refine error handling; usage monitoring; documentation |
| Week 8 | Deployment; training for admin/manager users; go live in production |

## ✅ Success Metrics  
- Number of leads discovered per query run  
- Percentage of discovered leads reviewed / added to CRM  
- Time from discovery to addition  
- API credit usage and cost per lead  
- Admin/manager satisfaction (UX of review UI)  
- Lead quality (conversion rate from added lead → engaged client/staff)

## 🛡️ Risks & Mitigations  
- **High cost/credits consumption**: Monitor usage; set quotas per query; refine filters to reduce noise  
- **Poor lead relevance**: Use tighter filters (job title specificity, industry, location); add AI scoring  
- **API rate limits / errors**: Respect limits; implement retry logic; fall back gracefully  
- **Data privacy/compliance issues**: Ensure you abide by PDL terms and local data laws; store only necessary data; anonymize if required  
- **UI/UX complexity**: Keep review UI simple; show key fields; allow quick “Add” or “Skip”
