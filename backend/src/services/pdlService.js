const axios = require('axios');
const { PotentialLead, PdlSearchQuery } = require('../models');

class PDLService {
  constructor() {
    this.apiKey = process.env.PDL_API_KEY;
    this.baseURL = 'https://api.peopledatalabs.com/v5';
    
    if (!this.apiKey) {
      console.warn('PDL_API_KEY not found in environment variables');
    }
  }

  /**
   * Search for people using PDL Person Search API with Elasticsearch DSL
   */
  async searchPeople(searchParams) {
    if (!this.apiKey) {
      throw new Error('PDL API key not configured');
    }

    try {
      const searchQuery = this.buildSearchQuery(searchParams);
      
      console.log('PDL Search Query:', JSON.stringify(searchQuery, null, 2));
      
      // Use POST method with Elasticsearch DSL (verified working format)
      const response = await axios.post(`${this.baseURL}/person/search`, searchQuery, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0,
        credits_used: response.data.credits_used || 0,
        remaining_credits: response.data.remaining_credits || 0
      };
    } catch (error) {
      console.error('PDL Search Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status || 500
      };
    }
  }

  /**
   * Enrich a person's profile using PDL Person Enrichment API
   */
  async enrichPerson(params) {
    if (!this.apiKey) {
      throw new Error('PDL API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/person/enrich`, {
        headers: {
          'X-Api-Key': this.apiKey
        },
        params: params,
        timeout: 30000
      });

      return {
        success: true,
        data: response.data.data,
        credits_used: response.headers['x-api-credits-used'] || 0
      };
    } catch (error) {
      console.error('PDL Enrichment Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status || 500
      };
    }
  }

  /**
   * Build search query using working Elasticsearch DSL format
   */
  buildSearchQuery(params) {
    const {
      jobTitles = [],
      industries = [],
      countries = [],
      cities = [],
      companies = [],
      skills = [],
      size = 20,
      minExperience,
      maxExperience
    } = params;

    const mustClauses = [];

    // Job titles - use match for fuzzy matching
    if (jobTitles.length > 0) {
      const titleQueries = jobTitles.map(title => ({
        match: { "job_title": title.toLowerCase() }
      }));
      
      if (titleQueries.length === 1) {
        mustClauses.push(titleQueries[0]);
      } else {
        mustClauses.push({
          bool: {
            should: titleQueries,
            minimum_should_match: 1
          }
        });
      }
    }

    // Countries - exact match
    if (countries.length > 0) {
      if (countries.length === 1) {
        mustClauses.push({
          term: { "location_country": countries[0].toLowerCase() }
        });
      } else {
        mustClauses.push({
          terms: { "location_country": countries.map(c => c.toLowerCase()) }
        });
      }
    }

    // Cities - match for fuzzy matching
    if (cities.length > 0) {
      const cityQueries = cities.map(city => ({
        match: { "location_locality": city.toLowerCase() }
      }));
      
      if (cityQueries.length === 1) {
        mustClauses.push(cityQueries[0]);
      } else {
        mustClauses.push({
          bool: {
            should: cityQueries,
            minimum_should_match: 1
          }
        });
      }
    }

    // Industries - match for fuzzy matching
    if (industries.length > 0) {
      const industryQueries = industries.map(industry => ({
        match: { "industry": industry.toLowerCase() }
      }));
      
      if (industryQueries.length === 1) {
        mustClauses.push(industryQueries[0]);
      } else {
        mustClauses.push({
          bool: {
            should: industryQueries,
            minimum_should_match: 1
          }
        });
      }
    }

    // Companies - match for fuzzy matching
    if (companies.length > 0) {
      const companyQueries = companies.map(company => ({
        match: { "job_company_name": company.toLowerCase() }
      }));
      
      if (companyQueries.length === 1) {
        mustClauses.push(companyQueries[0]);
      } else {
        mustClauses.push({
          bool: {
            should: companyQueries,
            minimum_should_match: 1
          }
        });
      }
    }

    // Add quality filters for better results
    mustClauses.push({
      exists: { field: "job_company_name" }
    });

    mustClauses.push({
      exists: { field: "location_country" }
    });

    return {
      size: Math.min(size, 50), // PDL recommends max 50 per request
      query: {
        bool: {
          must: mustClauses
        }
      }
    };
  }

  /**
   * Process and store search results
   */
  async processAndStoreResults(searchResults, queryInfo) {
    const { data, credits_used } = searchResults;
    const storedLeads = [];

    for (const person of data) {
      try {
        // Check if this person already exists
        const existingLead = await PotentialLead.findOne({
          where: {
            pdlProfileId: person.id
          }
        });

        if (existingLead) {
          console.log(`Skipping duplicate lead: ${person.full_name} (${person.id})`);
          continue;
        }

        // Calculate lead score
        const leadScore = this.calculateLeadScore(person, queryInfo.leadType);

        // Create new potential lead
        const potentialLead = await PotentialLead.create({
          pdlProfileId: person.id,
          fullName: person.full_name,
          jobTitle: person.job_title,
          companyName: person.job_company_name,
          locationCountry: person.location_country,
          locationCity: person.location_locality,
          industry: person.industry,
          linkedinUrl: person.linkedin_url,
          email: person.emails?.[0]?.address,
          phone: person.phone_numbers?.[0]?.number,
          sourceQuery: JSON.stringify(queryInfo.queryConfig),
          leadType: queryInfo.leadType,
          leadScore: leadScore,
          rawData: person,
          retrievedAt: new Date()
        });

        storedLeads.push(potentialLead);
        
      } catch (error) {
        console.error(`Error storing lead ${person.full_name}:`, error.message);
      }
    }

    return {
      totalProcessed: data.length,
      newLeadsStored: storedLeads.length,
      creditsUsed: credits_used,
      leads: storedLeads
    };
  }

  /**
   * Calculate lead score based on various factors
   */
  calculateLeadScore(person, leadType) {
    let score = 50; // Base score

    // Job title scoring
    if (person.job_title) {
      const title = person.job_title.toLowerCase();
      
      if (leadType === 'client') {
        // Higher scores for decision-maker titles
        if (title.includes('ceo') || title.includes('founder') || title.includes('president')) {
          score += 30;
        } else if (title.includes('cfo') || title.includes('cto') || title.includes('vp') || title.includes('vice president')) {
          score += 25;
        } else if (title.includes('director') || title.includes('head of') || title.includes('manager')) {
          score += 15;
        }
      } else if (leadType === 'staff') {
        // Higher scores for relevant professional titles
        if (title.includes('advisor') || title.includes('consultant') || title.includes('analyst')) {
          score += 20;
        } else if (title.includes('manager') || title.includes('senior') || title.includes('lead')) {
          score += 15;
        }
      }
    }

    // Industry relevance
    if (person.industry) {
      const industry = person.industry.toLowerCase();
      const relevantIndustries = ['banking', 'finance', 'fintech', 'consulting', 'investment'];
      
      if (relevantIndustries.some(ind => industry.includes(ind))) {
        score += 15;
      }
    }

    // Company size (if available)
    if (person.job_company_size) {
      const companySize = person.job_company_size.toLowerCase();
      if (companySize.includes('large') || companySize.includes('enterprise')) {
        score += 10;
      } else if (companySize.includes('medium')) {
        score += 5;
      }
    }

    // LinkedIn presence
    if (person.linkedin_url) {
      score += 10;
    }

    // Contact information availability
    if (person.emails && person.emails.length > 0) {
      score += 10;
    }
    
    if (person.phone_numbers && person.phone_numbers.length > 0) {
      score += 5;
    }

    return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
  }

  /**
   * Run a saved search query
   */
  async runSearchQuery(queryId) {
    try {
      const searchQuery = await PdlSearchQuery.findByPk(queryId);
      
      if (!searchQuery || !searchQuery.isActive) {
        throw new Error('Search query not found or inactive');
      }

      // Execute the search
      const searchResults = await this.searchPeople(searchQuery.queryConfig);
      
      if (!searchResults.success) {
        throw new Error(`PDL Search failed: ${searchResults.error}`);
      }

      // Process and store results
      const processResults = await this.processAndStoreResults(searchResults, {
        leadType: searchQuery.leadType,
        queryConfig: searchQuery.queryConfig
      });

      // Update last run timestamp
      await searchQuery.update({
        lastRunAt: new Date()
      });

      return {
        success: true,
        queryName: searchQuery.name,
        ...processResults,
        remainingCredits: searchResults.remaining_credits
      };
      
    } catch (error) {
      console.error('Run search query error:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get API usage statistics
   */
  async getAPIUsage() {
    try {
      // Make a minimal request to get credit information
      const response = await axios.get(`${this.baseURL}/person/search`, {
        headers: {
          'X-Api-Key': this.apiKey
        },
        params: {
          size: 1,
          query: JSON.stringify({
            bool: {
              must: [
                { term: { location_country: 'vietnam' } }
              ]
            }
          })
        }
      });

      return {
        success: true,
        credits_used: response.headers['x-api-credits-used'] || 0,
        remaining_credits: response.headers['x-api-credits-remaining'] || 0,
        total_credits: response.headers['x-api-credits-total'] || 0
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = new PDLService();