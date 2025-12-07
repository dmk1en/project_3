const axios = require('axios');
const { PotentialLead, PdlSearchQuery, Contact, Company } = require('../models');
const { Op } = require('sequelize');

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

    // Job titles - use terms for exact matching of multiple values
    if (jobTitles.length > 0) {
      if (jobTitles.length === 1) {
        mustClauses.push({
          match: { "job_title": jobTitles[0].toLowerCase() }
        });
      } else {
        // Use terms query for multiple job titles
        mustClauses.push({
          terms: { "job_title": jobTitles.map(title => title.toLowerCase()) }
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

    // Cities - use terms for multiple cities
    if (cities.length > 0) {
      if (cities.length === 1) {
        mustClauses.push({
          match: { "location_locality": cities[0].toLowerCase() }
        });
      } else {
        mustClauses.push({
          terms: { "location_locality": cities.map(city => city.toLowerCase()) }
        });
      }
    }

    // Industries - use terms for multiple industries
    if (industries.length > 0) {
      if (industries.length === 1) {
        mustClauses.push({
          match: { "industry": industries[0].toLowerCase() }
        });
      } else {
        mustClauses.push({
          terms: { "industry": industries.map(industry => industry.toLowerCase()) }
        });
      }
    }

    // Companies - use terms for multiple companies
    if (companies.length > 0) {
      if (companies.length === 1) {
        mustClauses.push({
          match: { "job_company_name": companies[0].toLowerCase() }
        });
      } else {
        mustClauses.push({
          terms: { "job_company_name": companies.map(company => company.toLowerCase()) }
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
          linkedinUrl: person.linkedin_url && !person.linkedin_url.startsWith('http') 
            ? `https://${person.linkedin_url}` 
            : person.linkedin_url,
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

  /**
   * Find potential matches between contacts and PDL leads
   */
  async findContactMatches(leadId) {
    try {
      const lead = await PotentialLead.findByPk(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      const matches = [];
      const leadData = lead.rawData || {};
      
      // Extract name parts for matching
      const leadNames = this.extractNameVariations(lead.fullName);
      const leadSkills = leadData.skills || [];
      const leadTitle = lead.jobTitle?.toLowerCase() || '';
      const leadCompany = lead.companyName?.toLowerCase() || '';
      const leadEmail = lead.email?.toLowerCase() || '';
      const leadLinkedin = lead.linkedinUrl || '';

      // Find contacts with similar characteristics
      const contacts = await Contact.findAll({
        include: [{
          model: require('../models/Company'),
          as: 'company',
          required: false
        }]
      });

      for (const contact of contacts) {
        const matchScore = this.calculateMatchScore({
          lead: {
            names: leadNames,
            skills: leadSkills,
            title: leadTitle,
            company: leadCompany,
            email: leadEmail,
            linkedin: leadLinkedin
          },
          contact: {
            firstName: contact.firstName?.toLowerCase() || '',
            lastName: contact.lastName?.toLowerCase() || '',
            title: contact.jobTitle?.toLowerCase() || '',
            company: contact.company?.name?.toLowerCase() || '',
            email: contact.email?.toLowerCase() || '',
            linkedin: contact.linkedinUrl || '',
            customFields: contact.customFields || {}
          }
        });

        if (matchScore >= 60) { // Only include matches with 60%+ similarity
          matches.push({
            contact,
            matchScore,
            matchReasons: this.getMatchReasons({
              lead: { names: leadNames, skills: leadSkills, title: leadTitle, company: leadCompany, email: leadEmail, linkedin: leadLinkedin },
              contact: {
                firstName: contact.firstName?.toLowerCase(),
                lastName: contact.lastName?.toLowerCase(),
                title: contact.jobTitle?.toLowerCase(),
                company: contact.company?.name?.toLowerCase(),
                email: contact.email?.toLowerCase(),
                linkedin: contact.linkedinUrl,
                customFields: contact.customFields || {}
              }
            })
          });
        }
      }

      // Sort by match score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return {
        success: true,
        lead,
        matches: matches.slice(0, 10) // Return top 10 matches
      };

    } catch (error) {
      console.error('Find contact matches error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract name variations for better matching
   */
  extractNameVariations(fullName) {
    if (!fullName) return [];
    
    const normalized = fullName.toLowerCase().trim();
    const parts = normalized.split(/\s+/);
    const variations = [normalized];
    
    if (parts.length >= 2) {
      // First Last
      variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
      // Last, First
      variations.push(`${parts[parts.length - 1]}, ${parts[0]}`);
      // Individual parts
      variations.push(...parts);
    }
    
    return [...new Set(variations)];
  }

  /**
   * Calculate match score between lead and contact
   */
  calculateMatchScore({ lead, contact }) {
    let score = 0;
    let factors = 0;

    // Handle both directions: lead->contact and contact->lead
    const leadNames = lead.names || this.extractNameVariations(lead.fullName || '');
    const contactFirstName = contact.firstName || '';
    const contactLastName = contact.lastName || '';
    const contactFullName = `${contactFirstName} ${contactLastName}`.trim();

    // Name matching (40% weight)
    let nameMatch = 0;
    if (leadNames.length > 0 && contactFullName) {
      nameMatch = this.calculateNameMatch(leadNames, contactFirstName, contactLastName);
    }
    score += nameMatch * 40;
    factors += 40;

    // Email matching (25% weight) - exact match
    if (lead.email && contact.email && lead.email === contact.email) {
      score += 25;
    }
    factors += 25;

    // LinkedIn URL matching (20% weight)
    if (lead.linkedin && contact.linkedin) {
      const linkedinMatch = this.calculateLinkedInMatch(lead.linkedin, contact.linkedin);
      score += linkedinMatch * 20;
    }
    factors += 20;

    // Job title similarity (10% weight)
    if (lead.title && contact.title) {
      const titleSimilarity = this.calculateStringSimilarity(lead.title, contact.title);
      score += titleSimilarity * 10;
    }
    factors += 10;

    // Company matching (5% weight)
    if (lead.company && contact.company) {
      const companySimilarity = this.calculateStringSimilarity(lead.company, contact.company);
      score += companySimilarity * 5;
    }
    factors += 5;

    return Math.round((score / factors) * 100);
  }

  /**
   * Calculate name matching score
   */
  calculateNameMatch(leadNames, contactFirstName, contactLastName) {
    if (!leadNames.length || (!contactFirstName && !contactLastName)) return 0;
    
    const contactFullName = `${contactFirstName || ''} ${contactLastName || ''}`.trim().toLowerCase();
    const contactReverseName = `${contactLastName || ''} ${contactFirstName || ''}`.trim().toLowerCase();
    
    let bestMatch = 0;
    
    for (const leadName of leadNames) {
      // Exact match
      if (leadName === contactFullName || leadName === contactReverseName) {
        return 1.0;
      }
      
      // Partial matches
      const similarity1 = this.calculateStringSimilarity(leadName, contactFullName);
      const similarity2 = this.calculateStringSimilarity(leadName, contactReverseName);
      const maxSimilarity = Math.max(similarity1, similarity2);
      
      bestMatch = Math.max(bestMatch, maxSimilarity);
    }
    
    return bestMatch;
  }

  /**
   * Calculate LinkedIn URL matching
   */
  calculateLinkedInMatch(leadLinkedIn, contactLinkedIn) {
    if (!leadLinkedIn || !contactLinkedIn) return 0;
    
    // Extract profile identifiers from LinkedIn URLs
    const extractProfileId = (url) => {
      const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      return match ? match[1].toLowerCase() : '';
    };
    
    const leadProfile = extractProfileId(leadLinkedIn);
    const contactProfile = extractProfileId(contactLinkedIn);
    
    if (leadProfile && contactProfile) {
      return leadProfile === contactProfile ? 1.0 : 0;
    }
    
    return 0;
  }

  /**
   * Calculate string similarity using Jaro-Winkler algorithm approximation
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get human-readable match reasons
   */
  getMatchReasons({ lead, contact }) {
    const reasons = [];
    
    // Name matching
    const nameMatch = this.calculateNameMatch(lead.names, contact.firstName, contact.lastName);
    if (nameMatch > 0.8) {
      reasons.push('Strong name match');
    } else if (nameMatch > 0.6) {
      reasons.push('Partial name match');
    }
    
    // Email match
    if (lead.email && contact.email && lead.email === contact.email) {
      reasons.push('Same email address');
    }
    
    // LinkedIn match
    if (lead.linkedin && contact.linkedin) {
      const linkedinMatch = this.calculateLinkedInMatch(lead.linkedin, contact.linkedin);
      if (linkedinMatch === 1.0) {
        reasons.push('Same LinkedIn profile');
      }
    }
    
    // Job title similarity
    if (lead.title && contact.title) {
      const titleSimilarity = this.calculateStringSimilarity(lead.title, contact.title);
      if (titleSimilarity > 0.7) {
        reasons.push('Similar job title');
      }
    }
    
    // Company similarity
    if (lead.company && contact.company) {
      const companySimilarity = this.calculateStringSimilarity(lead.company, contact.company);
      if (companySimilarity > 0.8) {
        reasons.push('Same or similar company');
      }
    }
    
    return reasons;
  }

  /**
   * Find potential PDL lead matches for a contact
   */
  async findLeadMatches(contact) {
    try {
      const matches = [];
      const contactData = {
        firstName: contact.firstName?.toLowerCase() || '',
        lastName: contact.lastName?.toLowerCase() || '',
        email: contact.email?.toLowerCase() || '',
        title: contact.jobTitle?.toLowerCase() || '',
        company: contact.company?.name?.toLowerCase() || '',
        linkedin: contact.linkedinUrl || '',
        customFields: contact.customFields || {}
      };

      // Extract name variations for matching
      const contactNames = this.extractNameVariations(`${contact.firstName} ${contact.lastName}`);
      const contactSkills = contactData.customFields.skills || [];

      // Find PDL leads with similar characteristics
      const leads = await PotentialLead.findAll({
        where: {
          status: {
            [Op.in]: ['pending_review']
          }
        }
      });

      for (const lead of leads) {
        const leadData = lead.rawData || {};
        const leadNames = this.extractNameVariations(lead.fullName);
        const leadSkills = leadData.skills || lead.skills || [];
        const leadTitle = lead.jobTitle?.toLowerCase() || '';
        const leadCompany = lead.companyName?.toLowerCase() || '';
        const leadEmail = lead.email?.toLowerCase() || '';
        const leadLinkedin = lead.linkedinUrl || '';

        const matchScore = this.calculateMatchScore({
          contact: contactData,
          lead: {
            names: leadNames,
            skills: leadSkills,
            title: leadTitle,
            company: leadCompany,
            email: leadEmail,
            linkedin: leadLinkedin
          }
        });

        if (matchScore >= 60) { // Only include matches with 60%+ similarity
          matches.push({
            lead,
            matchScore,
            matchReasons: this.getMatchReasons({
              contact: contactData,
              lead: { names: leadNames, skills: leadSkills, title: leadTitle, company: leadCompany, email: leadEmail, linkedin: leadLinkedin }
            })
          });
        }
      }

      // Sort by match score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return {
        success: true,
        contact,
        matches: matches.slice(0, 10).map(m => m.lead) // Return top 10 matches, just the leads
      };

    } catch (error) {
      console.error('Find lead matches error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enrich contact with lead data
   */
  async enrichContact(contactId, leadId, selectedFields = []) {
    try {
      const contact = await Contact.findByPk(contactId);
      const lead = await PotentialLead.findByPk(leadId);
      
      if (!contact) {
        throw new Error('Contact not found');
      }
      
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      const leadData = lead.rawData || {};
      const enrichmentData = {};
      const enrichmentLog = [];
      
      // Define available enrichment fields
      const fieldMappings = {
        phone: { 
          leadField: 'phone', 
          contactField: 'phone',
          leadValue: lead.phone || leadData.phone_numbers?.[0]?.number
        },
        email: {
          leadField: 'email',
          contactField: 'email', 
          leadValue: lead.email || leadData.emails?.[0]?.address
        },
        jobTitle: {
          leadField: 'jobTitle',
          contactField: 'jobTitle',
          leadValue: lead.jobTitle
        },
        linkedinUrl: {
          leadField: 'linkedinUrl', 
          contactField: 'linkedinUrl',
          leadValue: lead.linkedinUrl
        },
        skills: {
          leadField: 'skills',
          contactField: 'customFields.skills',
          leadValue: leadData.skills || lead.skills || []
        },
        education: {
          leadField: 'education',
          contactField: 'customFields.education',
          leadValue: leadData.education || []
        },
        experience: {
          leadField: 'experience', 
          contactField: 'customFields.experience',
          leadValue: leadData.experience || []
        },
        location: {
          leadField: 'location',
          contactField: 'customFields.location',
          leadValue: lead.location || `${lead.locationCity || ''}, ${lead.locationCountry || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
        },
        industry: {
          leadField: 'industry',
          contactField: 'customFields.industry',
          leadValue: lead.industry || leadData.industry
        },
        companyName: {
          leadField: 'companyName',
          contactField: 'customFields.currentCompany',
          leadValue: lead.companyName
        },
        seniorityLevel: {
          leadField: 'seniorityLevel',
          contactField: 'seniorityLevel',
          leadValue: this.deriveSeniorityLevel(lead.jobTitle)
        },
        socialProfiles: {
          leadField: 'socialProfiles',
          contactField: 'customFields.socialProfiles',
          leadValue: this.extractSocialProfiles(leadData)
        },
        certifications: {
          leadField: 'certifications',
          contactField: 'customFields.certifications',
          leadValue: leadData.certifications || []
        },
        languages: {
          leadField: 'languages',
          contactField: 'customFields.languages',
          leadValue: leadData.languages || []
        },
        interests: {
          leadField: 'interests',
          contactField: 'customFields.interests',
          leadValue: leadData.interests || []
        },
        personalEmails: {
          leadField: 'personalEmails',
          contactField: 'customFields.personalEmails',
          leadValue: Array.isArray(leadData.emails) ? leadData.emails.filter(email => email.type === 'personal').map(email => email.address) : []
        },
        workEmails: {
          leadField: 'workEmails',
          contactField: 'customFields.workEmails',
          leadValue: Array.isArray(leadData.emails) ? leadData.emails.filter(email => email.type === 'work').map(email => email.address) : []
        },
        phoneNumbers: {
          leadField: 'phoneNumbers',
          contactField: 'customFields.phoneNumbers',
          leadValue: leadData.phone_numbers || []
        },
        websites: {
          leadField: 'websites',
          contactField: 'customFields.websites',
          leadValue: Array.isArray(leadData.profiles) ? leadData.profiles.filter(profile => profile.network === 'website').map(profile => profile.url) : []
        },
        githubUrl: {
          leadField: 'githubUrl',
          contactField: 'customFields.githubUrl',
          leadValue: Array.isArray(leadData.profiles) ? leadData.profiles.find(profile => profile.network === 'github')?.url : null
        },
        twitterHandle: {
          leadField: 'twitterHandle',
          contactField: 'twitterHandle',
          leadValue: Array.isArray(leadData.profiles) ? leadData.profiles.find(profile => profile.network === 'twitter')?.username : null
        },
        companyInfo: {
          leadField: 'companyInfo',
          contactField: 'customFields.companyInfo',
          leadValue: this.extractCompanyInfo(leadData)
        }
      };
      
      // Apply selected enrichments
      for (const fieldName of selectedFields) {
        const mapping = fieldMappings[fieldName];
        if (!mapping || !mapping.leadValue) continue;
        
        // Check if this is a custom field
        if (mapping.contactField.startsWith('customFields.')) {
          // Handle custom fields
          if (!enrichmentData.customFields) {
            enrichmentData.customFields = { ...contact.customFields };
          }
          
          const customFieldKey = mapping.contactField.split('.')[1];
          const currentValue = contact.customFields?.[customFieldKey];
          
          if (!currentValue || 
              (Array.isArray(currentValue) && currentValue.length === 0) ||
              (typeof currentValue === 'object' && Object.keys(currentValue).length === 0)) {
            enrichmentData.customFields[customFieldKey] = mapping.leadValue;
            
            let displayValue = mapping.leadValue;
            if (Array.isArray(mapping.leadValue)) {
              displayValue = `${mapping.leadValue.length} items`;
            } else if (typeof mapping.leadValue === 'object') {
              displayValue = `${Object.keys(mapping.leadValue).length} items`;
            }
            
            enrichmentLog.push(`Added ${fieldName}: ${displayValue}`);
          } else {
            enrichmentLog.push(`Skipped ${fieldName}: already has data`);
          }
        } else {
          // Handle direct fields (phone, email, jobTitle, etc.)
          const currentValue = contact[mapping.contactField];
          if (!currentValue || (typeof currentValue === 'string' && currentValue.trim() === '')) {
            enrichmentData[mapping.contactField] = mapping.leadValue;
            enrichmentLog.push(`Added ${fieldName}: ${mapping.leadValue}`);
          } else {
            enrichmentLog.push(`Skipped ${fieldName}: already has data (${currentValue})`);
          }
        }
      }
      
      // Auto-create company if companyName is being enriched and contact doesn't have a company
      let companyCreated = false;
      if (selectedFields.includes('companyName') && !contact.companyId && lead.companyName) {
        const result = await this.findOrCreateCompany(lead);
        if (result && result.company) {
          enrichmentData.companyId = result.company.id;
          companyCreated = result.isNewRecord;
          enrichmentLog.push(`${result.isNewRecord ? 'Created and linked to new company' : 'Linked to existing company'}: ${result.company.name}`);
        }
      }

      // Update contact if there are enrichments to apply
      if (Object.keys(enrichmentData).length > 0) {
        await contact.update(enrichmentData);
        
        // Add enrichment note
        const enrichmentNote = `\n\n[ENRICHED ${new Date().toISOString()}] Data enriched from PDL lead "${lead.fullName}": ${enrichmentLog.join(', ')}`;
        await contact.update({
          notes: (contact.notes || '') + enrichmentNote
        });
      }
      
      return {
        success: true,
        contact: await Contact.findByPk(contactId, {
          include: [{
            model: Company,
            as: 'company'
          }]
        }), // Return updated contact with company
        enrichmentLog,
        fieldsEnriched: selectedFields.length,
        fieldsApplied: Object.keys(enrichmentData).length,
        companyCreated
      };
      
    } catch (error) {
      console.error('Enrich contact error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find or create a company based on PDL lead data
   */
  async findOrCreateCompany(leadData) {
    try {
      if (!leadData.companyName) {
        return null;
      }

      const companyName = leadData.companyName.trim();
      if (!companyName) {
        return null;
      }

      // First try to find existing company by name (case insensitive)
      let company = await Company.findOne({
        where: {
          name: {
            [Op.iLike]: companyName
          }
        }
      });

      if (company) {
        console.log(`Found existing company: ${company.name}`);
        return { company, isNewRecord: false };
      }

      // Extract company info from raw PDL data
      const rawData = leadData.rawData || {};
      const companyData = {
        name: companyName
      };

      // Add industry if available
      if (leadData.industry) {
        companyData.industry = leadData.industry;
      }

      // Extract company website from PDL data
      if (rawData.job_company_website) {
        companyData.website = rawData.job_company_website;
        // Extract domain from website
        try {
          const url = new URL(rawData.job_company_website);
          companyData.domain = url.hostname;
        } catch (e) {
          // Invalid URL, skip domain extraction
        }
      }

      // Map company size from PDL to our enum
      if (rawData.job_company_size) {
        const size = rawData.job_company_size.toLowerCase();
        if (size.includes('startup') || size.includes('1-10')) {
          companyData.size = 'startup';
        } else if (size.includes('small') || size.includes('11-50')) {
          companyData.size = 'small';
        } else if (size.includes('medium') || size.includes('51-200') || size.includes('201-500')) {
          companyData.size = 'medium';
        } else if (size.includes('large') || size.includes('501-1000') || size.includes('1001-5000')) {
          companyData.size = 'large';
        } else if (size.includes('enterprise') || size.includes('5000+')) {
          companyData.size = 'enterprise';
        }
      }

      // Add company description if available
      if (rawData.job_company_description) {
        companyData.description = rawData.job_company_description;
      }

      // Add LinkedIn URL if available
      if (rawData.job_company_linkedin_url) {
        companyData.linkedinUrl = rawData.job_company_linkedin_url;
      }

      // Create new company
      company = await Company.create(companyData);
      console.log(`Created new company: ${company.name} (ID: ${company.id})`);
      
      return { company, isNewRecord: true };

    } catch (error) {
      console.error('Error finding/creating company:', error);
      return null;
    }
  }

  // Helper method to derive seniority level from job title
  deriveSeniorityLevel(jobTitle) {
    if (!jobTitle) return null;
    
    const title = jobTitle.toLowerCase();
    
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
        title.includes('chief') || title.includes('president') || title.includes('founder')) {
      return 'c_level';
    }
    
    if (title.includes('vp') || title.includes('vice president') || title.includes('vice-president')) {
      return 'vp';
    }
    
    if (title.includes('director') || title.includes('head of')) {
      return 'director';
    }
    
    if (title.includes('senior') || title.includes('sr.') || title.includes('lead') || 
        title.includes('principal') || title.includes('staff') || title.includes('architect')) {
      return 'senior';
    }
    
    if (title.includes('junior') || title.includes('jr.') || title.includes('entry') || 
        title.includes('associate') || title.includes('intern')) {
      return 'entry';
    }
    
    return 'mid'; // Default to mid-level
  }

  // Helper method to extract social profiles
  extractSocialProfiles(leadData) {
    const profiles = {};
    
    if (leadData.profiles && Array.isArray(leadData.profiles)) {
      leadData.profiles.forEach(profile => {
        if (profile.network && profile.url) {
          profiles[profile.network] = {
            url: profile.url,
            username: profile.username || profile.id
          };
        }
      });
    }
    
    return Object.keys(profiles).length > 0 ? profiles : null;
  }

  // Helper method to extract company information
  extractCompanyInfo(leadData) {
    const companyInfo = {};
    
    if (leadData.experience && Array.isArray(leadData.experience) && leadData.experience.length > 0) {
      const currentJob = leadData.experience[0]; // Most recent job
      
      if (currentJob.company) {
        companyInfo.name = currentJob.company.name;
        companyInfo.industry = currentJob.company.industry;
        companyInfo.size = currentJob.company.size;
        companyInfo.type = currentJob.company.type;
        companyInfo.website = currentJob.company.website;
        companyInfo.location = currentJob.company.location;
        companyInfo.startDate = currentJob.start_date;
        companyInfo.endDate = currentJob.end_date;
        companyInfo.title = currentJob.title;
      }
    }
    
    return Object.keys(companyInfo).length > 0 ? companyInfo : null;
  }
}

module.exports = new PDLService();