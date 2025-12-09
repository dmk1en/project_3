const { PotentialLead, PdlSearchQuery, Contact, User } = require('../models');
const pdlService = require('../services/pdlService');
const { Op } = require('sequelize');

class PDLController {
  /**
   * Get all potential leads with filtering and pagination
   */
  async getPotentialLeads(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'pending_review',
        leadType,
        search,
        minScore,
        sort = 'leadScore',
        order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100);

      // Build where clause
      const where = { status };
      
      if (leadType) {
        where.leadType = leadType;
      }

      if (search) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${search}%` } },
          { jobTitle: { [Op.iLike]: `%${search}%` } },
          { companyName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (minScore) {
        where.leadScore = { [Op.gte]: parseInt(minScore) };
      }

      const leads = await PotentialLead.findAndCountAll({
        where,
        limit: limitValue,
        offset,
        order: [[sort, order.toUpperCase()]],
        include: [
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          leads: leads.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(leads.count / limitValue),
            totalItems: leads.count,
            itemsPerPage: limitValue
          }
        }
      });
      
    } catch (error) {
      console.error('Get potential leads error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve potential leads'
        }
      });
    }
  }

  /**
   * Get a single potential lead by ID
   */
  async getPotentialLead(req, res) {
    try {
      const { id } = req.params;

      const lead = await PotentialLead.findByPk(id, {
        include: [
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Potential lead not found'
          }
        });
      }

      res.json({
        success: true,
        data: lead
      });
      
    } catch (error) {
      console.error('Get potential lead error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve potential lead'
        }
      });
    }
  }

  /**
   * Add potential lead to CRM as a contact
   */
  async addToCRM(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const potentialLead = await PotentialLead.findByPk(id);

      if (!potentialLead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Potential lead not found'
          }
        });
      }

      if (potentialLead.status === 'added_to_crm') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_ADDED',
            message: 'Lead has already been added to CRM'
          }
        });
      }

      // Check if contact already exists by email
      if (potentialLead.email) {
        const existingContact = await Contact.findOne({
          where: { email: potentialLead.email }
        });

        if (existingContact) {
          // Mark as duplicate
          await potentialLead.update({
            status: 'duplicate',
            reviewedBy: userId,
            reviewedAt: new Date()
          });

          return res.status(400).json({
            success: false,
            error: {
              code: 'DUPLICATE_CONTACT',
              message: 'Contact with this email already exists in CRM'
            }
          });
        }
      }

      // Auto-create company if company name is available
      let companyId = null;
      let companyCreated = false;
      if (potentialLead.companyName) {
        const result = await pdlService.findOrCreateCompany(potentialLead);
        if (result && result.company) {
          companyId = result.company.id;
          companyCreated = result.isNewRecord;
          console.log(`${companyCreated ? 'Created new' : 'Found existing'} company: ${result.company.name} for lead: ${potentialLead.fullName}`);
        }
      }

      // Create new contact from potential lead
      const contactData = {
        firstName: potentialLead.fullName?.split(' ')[0] || '',
        lastName: potentialLead.fullName?.split(' ').slice(1).join(' ') || '',
        email: potentialLead.email,
        phone: potentialLead.phone,
        jobTitle: potentialLead.jobTitle,
        companyId: companyId,
        source: 'pdl_discovery',
        linkedinUrl: potentialLead.linkedinUrl,
        assignedTo: userId,
        notes: `Discovered via PDL on ${potentialLead.retrievedAt?.toDateString()}. Lead Score: ${potentialLead.leadScore}${companyCreated ? `. Company "${potentialLead.companyName}" was automatically created.` : ''}`,
        leadScore: potentialLead.leadScore,
        leadStatus: potentialLead.leadScore >= 70 ? 'qualified' : 'new'
      };

      const newContact = await Contact.create(contactData);

      // Update potential lead status
      await potentialLead.update({
        status: 'added_to_crm',
        reviewedBy: userId,
        reviewedAt: new Date()
      });

      // Enrich the contact - check for forceEnrich parameter
      const { forceEnrich = false } = req.body || {};
      
      if ((!potentialLead.pdlProfileId || forceEnrich) && (potentialLead.email || potentialLead.linkedinUrl || potentialLead.phone)) {
        const enrichResult = await this.enrichContactAsync(newContact.id, potentialLead, forceEnrich);
        if (enrichResult && !enrichResult.success) {
          console.log('Enrichment failed during conversion:', enrichResult.error);
        }
      } else if (potentialLead.pdlProfileId && !forceEnrich) {
        console.log('Skipping enrichment for PDL-sourced contact (use forceEnrich=true to override):', newContact.id);
      }

      // Fetch the complete contact with company relationship
      const completeContact = await Contact.findByPk(newContact.id, {
        include: [{
          model: require('../models/Company'),
          as: 'company'
        }]
      });

      res.status(201).json({
        success: true,
        data: {
          contact: completeContact,
          potentialLead: potentialLead,
          companyCreated: companyCreated
        },
        message: `Lead successfully added to CRM${companyCreated ? ` and company "${potentialLead.companyName}" was automatically created` : ''}`
      });
      
    } catch (error) {
      console.error('Add to CRM error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add lead to CRM'
        }
      });
    }
  }

  /**
   * Reject a potential lead
   */
  async rejectLead(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const potentialLead = await PotentialLead.findByPk(id);

      if (!potentialLead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Potential lead not found'
          }
        });
      }

      await potentialLead.update({
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rawData: {
          ...potentialLead.rawData,
          rejectionReason: reason
        }
      });

      res.json({
        success: true,
        data: potentialLead,
        message: 'Lead rejected successfully'
      });
      
    } catch (error) {
      console.error('Reject lead error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject lead'
        }
      });
    }
  }

  /**
   * Execute a PDL search
   */
  async executeSearch(req, res) {
    try {
      const {
        jobTitles = [],
        industries = [],
        countries = ['Vietnam'],
        cities = [],
        companies = [],
        leadType = 'general',
        size = 20
      } = req.body;

      if (!Array.isArray(jobTitles) || jobTitles.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'At least one job title is required'
          }
        });
      }

      const searchParams = {
        jobTitles,
        industries,
        countries,
        cities,
        companies,
        size: Math.min(size, 50) // Limit to prevent high API costs
      };

      const searchResults = await pdlService.searchPeople(searchParams);

      if (!searchResults.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PDL_SEARCH_ERROR',
            message: searchResults.error
          }
        });
      }

      // Process and store results
      const processResults = await pdlService.processAndStoreResults(searchResults, {
        leadType,
        queryConfig: searchParams
      });

      res.json({
        success: true,
        data: {
          searchResults: searchResults.data,
          ...processResults,
          creditsUsed: searchResults.credits_used,
          remainingCredits: searchResults.remaining_credits
        },
        message: `Found ${processResults.newLeadsStored} new leads from ${processResults.totalProcessed} results`
      });
      
    } catch (error) {
      console.error('Execute search error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to execute search'
        }
      });
    }
  }

  /**
   * Get search queries
   */
  async getSearchQueries(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        isActive
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100);
      
      // Build where clause - show active queries by default
      const whereClause = {};
      if (isActive !== undefined) {
        // If isActive parameter is provided, use it (converting string to boolean)
        whereClause.isActive = isActive === 'true';
      } else {
        // If no isActive parameter, show active queries by default
        whereClause.isActive = true;
      }

      const queries = await PdlSearchQuery.findAndCountAll({
        where: whereClause,
        limit: limitValue,
        offset,
        order: [['updatedAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          queries: queries.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(queries.count / limitValue),
            totalItems: queries.count,
            itemsPerPage: limitValue
          }
        }
      });
      
    } catch (error) {
      console.error('Get search queries error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve search queries'
        }
      });
    }
  }

  /**
   * Create a search query
   */
  async createSearchQuery(req, res) {
    try {
      const {
        name,
        description,
        queryConfig,
        leadType = 'general',
        runFrequency = 'weekly'
      } = req.body;

      const userId = req.user.id;

      if (!name || !queryConfig) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Name and query configuration are required'
          }
        });
      }

      const searchQuery = await PdlSearchQuery.create({
        name,
        description,
        queryConfig,
        leadType,
        runFrequency,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: searchQuery,
        message: 'Search query created successfully'
      });
      
    } catch (error) {
      console.error('Create search query error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create search query'
        }
      });
    }
  }

  /**
   * Run a saved search query
   */
  async runSearchQuery(req, res) {
    try {
      const { id } = req.params;

      const result = await pdlService.runSearchQuery(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SEARCH_EXECUTION_ERROR',
            message: result.error
          }
        });
      }

      res.json({
        success: true,
        data: result,
        message: `Search "${result.queryName}" executed successfully`
      });
      
    } catch (error) {
      console.error('Run search query error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to run search query'
        }
      });
    }
  }

  /**
   * Delete a saved search query
   */
  async deleteSearchQuery(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const searchQuery = await PdlSearchQuery.findByPk(id);

      if (!searchQuery) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUERY_NOT_FOUND',
            message: 'Search query not found'
          }
        });
      }

      // Check if user owns the query or has admin permissions
      if (searchQuery.createdBy !== userId && !req.user.role?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own search queries'
          }
        });
      }

      const queryName = searchQuery.name;
      await searchQuery.destroy();

      res.json({
        success: true,
        message: `Search query "${queryName}" deleted successfully`
      });
    } catch (error) {
      console.error('Delete search query error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete search query'
        }
      });
    }
  }

  /**
   * Get PDL API usage statistics
   */
  async getAPIUsage(req, res) {
    try {
      const usage = await pdlService.getAPIUsage();

      if (!usage.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'API_ERROR',
            message: usage.error
          }
        });
      }

      // Get additional statistics from database
      const totalLeads = await PotentialLead.count();
      const recentLeads = await PotentialLead.count({
        where: {
          retrievedAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      const addedToCRM = await PotentialLead.count({
        where: { status: 'added_to_crm' }
      });

      res.json({
        success: true,
        data: {
          apiUsage: usage,
          statistics: {
            totalLeads,
            recentLeads,
            addedToCRM,
            conversionRate: totalLeads > 0 ? (addedToCRM / totalLeads * 100).toFixed(2) : 0
          }
        }
      });
      
    } catch (error) {
      console.error('Get API usage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve API usage'
        }
      });
    }
  }

  /**
   * Bulk operations on potential leads
   */
  async bulkOperation(req, res) {
    try {
      const { leadIds, operation, data = {} } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Lead IDs array is required'
          }
        });
      }

      let results = { success: 0, failed: 0, errors: [] };

      switch (operation) {
        case 'addToCRM':
          results = await this.bulkAddToCRM(leadIds, userId);
          break;
        
        case 'reject':
          results = await this.bulkReject(leadIds, userId, data.reason);
          break;
          
        case 'updateStatus':
          results = await this.bulkUpdateStatus(leadIds, userId, data.status);
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: 'Invalid bulk operation'
            }
          });
      }

      res.json({
        success: true,
        data: results,
        message: `Bulk operation completed: ${results.success} successful, ${results.failed} failed`
      });
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk operation'
        }
      });
    }
  }

  /**
   * Create a manual lead (not from PDL search)
   */
  async createManualLead(req, res) {
    try {
      const userId = req.user.id;
      const {
        fullName,
        jobTitle,
        companyName,
        email,
        phone,
        linkedinUrl,
        twitterUrl,
        locationCity,
        locationCountry,
        industry,
        leadType = 'general',
        skills = [],
        notes
      } = req.body;

      // Validate required fields
      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Full name is required'
          }
        });
      }

      // Create manual lead
      const manualLead = await PotentialLead.create({
        fullName,
        jobTitle: jobTitle || 'Unknown',
        companyName: companyName || 'Unknown',
        email,
        phone,
        linkedinUrl,
        twitterUrl,
        locationCity,
        locationCountry,
        location: [locationCity, locationCountry].filter(Boolean).join(', ') || 'Unknown',
        industry: industry || 'Unknown', 
        leadScore: 50, // Default score for manual leads
        leadType,
        status: 'pending_review',
        skills: Array.isArray(skills) ? skills : [],
        notes,
        // Mark as manual lead (not PDL-sourced)
        pdlProfileId: null,
        pdl_id: null,
        isManual: true,
        createdBy: userId,
        source: 'manual_entry'
        // Note: retrievedAt is left null for manual leads since they weren't "retrieved" from PDL
      });

      res.status(201).json({
        success: true,
        data: manualLead,
        message: 'Manual lead created successfully'
      });
    } catch (error) {
      console.error('Error creating manual lead:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create manual lead';
      if (error.name === 'SequelizeValidationError') {
        errorMessage = 'Validation error: ' + error.errors.map(e => e.message).join(', ');
      } else if (error.name === 'SequelizeDatabaseError') {
        if (error.original?.code === '23502') {
          errorMessage = `Database constraint error: ${error.original.column} cannot be null`;
        } else {
          errorMessage = 'Database error: ' + error.original?.message || error.message;
        }
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Update lead information
   */
  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const lead = await PotentialLead.findByPk(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found'
          }
        });
      }

      // Don't allow updating core PDL data for PDL-sourced leads
      if (lead.pdlProfileId && !lead.isManual) {
        // Only allow updating certain fields for PDL leads
        const allowedFields = ['notes', 'leadType', 'status', 'tags'];
        const filteredUpdate = {};
        
        allowedFields.forEach(field => {
          if (updateData[field] !== undefined) {
            filteredUpdate[field] = updateData[field];
          }
        });
        
        if (Object.keys(filteredUpdate).length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'PDL-sourced leads can only be updated for notes, leadType, status, and tags'
            }
          });
        }
        
        await lead.update(filteredUpdate);
      } else {
        // Full update allowed for manual leads
        const allowedFields = [
          'fullName', 'jobTitle', 'companyName', 'email', 'phone',
          'linkedinUrl', 'twitterUrl', 'locationCity', 'locationCountry',
          'industry', 'leadType', 'skills', 'notes', 'status', 'tags'
        ];
        
        const filteredUpdate = {};
        allowedFields.forEach(field => {
          if (updateData[field] !== undefined) {
            filteredUpdate[field] = updateData[field];
          }
        });
        
        // Update location if city or country changed
        if (filteredUpdate.locationCity || filteredUpdate.locationCountry) {
          const city = filteredUpdate.locationCity || lead.locationCity;
          const country = filteredUpdate.locationCountry || lead.locationCountry;
          filteredUpdate.location = [city, country].filter(Boolean).join(', ') || 'Unknown';
        }
        
        filteredUpdate.updatedBy = userId;
        await lead.update(filteredUpdate);
      }

      const updatedLead = await PotentialLead.findByPk(id);
      res.json({
        success: true,
        data: updatedLead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update lead'
        }
      });
    }
  }

  /**
   * Delete a lead
   */
  async deleteLead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const lead = await PotentialLead.findByPk(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found'
          }
        });
      }

      // Check if lead can be deleted
      if (lead.status === 'converted' || lead.status === 'added_to_crm') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE',
            message: 'Cannot delete leads that have been converted to CRM contacts'
          }
        });
      }

      // Delete the lead
      await lead.destroy();

      res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete lead'
        }
      });
    }
  }

  /**
   * Manual enrichment endpoint for leads
   */
  async enrichLead(req, res) {
    try {
      const { id } = req.params;
      const { forceEnrich = false } = req.body;
      const userId = req.user.id;

      const potentialLead = await PotentialLead.findByPk(id);
      if (!potentialLead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Potential lead not found'
          }
        });
      }

      // Find associated contact if lead was converted
      let contact = null;
      if (potentialLead.status === 'added_to_crm') {
        contact = await Contact.findOne({
          where: {
            [Op.or]: [
              { email: potentialLead.email },
              { phone: potentialLead.phone },
              { linkedinUrl: potentialLead.linkedinUrl }
            ]
          }
        });
      }

      const enrichmentResult = await this.enrichContactAsync(
        contact?.id || null, 
        potentialLead, 
        forceEnrich
      );

      if (enrichmentResult && enrichmentResult.success) {
        res.json({
          success: true,
          data: {
            enrichedData: enrichmentResult.data,
            contact: contact,
            potentialLead: potentialLead
          },
          message: 'Lead enriched successfully',
          warning: enrichmentResult.warning
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ENRICHMENT_FAILED',
            message: enrichmentResult?.error || 'Enrichment failed',
            details: enrichmentResult?.details
          },
          warning: enrichmentResult?.warning
        });
      }
    } catch (error) {
      console.error('Error enriching lead:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to enrich lead'
        }
      });
    }
  }

  /**
   * Async function to enrich contact data
   */
  async enrichContactAsync(contactId, potentialLead, forceEnrich = false) {
    try {
      // Prioritize enrichment for manual leads, skip for PDL-sourced unless forced
      if (potentialLead.pdlProfileId && !potentialLead.isManual && !forceEnrich) {
        console.log('PDL Enrichment skipped: Contact already sourced from PDL', contactId);
        return { success: false, error: 'PDL-sourced contact, use forceEnrich=true to override' };
      }
      
      // Always enrich manual leads
      if (potentialLead.isManual || !potentialLead.pdlProfileId) {
        console.log('PDL Enrichment for manual/non-PDL lead:', contactId);
      }

      const enrichParams = {};
      
      // Primary identifiers (most reliable)
      if (potentialLead.email) {
        enrichParams.email = potentialLead.email;
      } else if (potentialLead.linkedinUrl) {
        // For LinkedIn URL enrichment, we need additional context
        enrichParams.profile = { linkedin_url: potentialLead.linkedinUrl };
        
        let hasAdditionalContext = false;
        
        // Add additional data points to meet PDL requirements
        if (potentialLead.companyName) {
          enrichParams.company = potentialLead.companyName;
          hasAdditionalContext = true;
        }
        if (potentialLead.locationCountry) {
          enrichParams.country = potentialLead.locationCountry;
          hasAdditionalContext = true;
        }
        if (potentialLead.locationCity) {
          enrichParams.locality = potentialLead.locationCity;
          hasAdditionalContext = true;
        }
        if (potentialLead.location) {
          enrichParams.location = potentialLead.location;
          hasAdditionalContext = true;
        }
        
        // If we have name, add it too
        const nameParts = potentialLead.fullName?.split(' ') || [];
        if (nameParts.length >= 2) {
          enrichParams.first_name = nameParts[0];
          enrichParams.last_name = nameParts.slice(1).join(' ');
        }
        
        // Warn if insufficient context for LinkedIn enrichment
        if (!hasAdditionalContext) {
          console.warn(`⚠️  LinkedIn enrichment for contact ${contactId} may fail - missing additional context (company, location, etc.)`);
        }
      } else if (potentialLead.phone) {
        enrichParams.phone = potentialLead.phone;
      } else {
        // Fallback to name + company/location
        const nameParts = potentialLead.fullName?.split(' ') || [];
        if (nameParts.length >= 2) {
          enrichParams.first_name = nameParts[0];
          enrichParams.last_name = nameParts.slice(1).join(' ');
          
          // Add required additional data point
          if (potentialLead.companyName) {
            enrichParams.company = potentialLead.companyName;
          } else if (potentialLead.locationCountry) {
            enrichParams.country = potentialLead.locationCountry;
          } else if (potentialLead.locationCity) {
            enrichParams.locality = potentialLead.locationCity;
          } else {
            console.warn(`⚠️  PDL Enrichment skipped for contact ${contactId}: Name-based enrichment requires additional context`);
            console.log('Available name data:', {
              fullName: potentialLead.fullName,
              company: potentialLead.companyName,
              country: potentialLead.locationCountry,
              city: potentialLead.locationCity,
              location: potentialLead.location
            });
            return { 
              success: false, 
              error: 'Insufficient data for name-based enrichment',
              warning: 'Name-based enrichment requires company, country, city, or location information'
            };
          }
        } else {
          console.warn(`⚠️  PDL Enrichment skipped for contact ${contactId}: No identifiable data available`);
          console.log('Available data:', {
            email: !!potentialLead.email,
            phone: !!potentialLead.phone,
            linkedinUrl: !!potentialLead.linkedinUrl,
            fullName: !!potentialLead.fullName,
            company: !!potentialLead.companyName,
            location: !!potentialLead.locationCountry || !!potentialLead.locationCity
          });
          return { 
            success: false, 
            error: 'No identifiable data for contact',
            warning: 'Need at least email, phone, LinkedIn URL, or name with company/location'
          };
        }
      }

      console.log('PDL Enrichment attempt for contact:', contactId, 'with params:', enrichParams);
      const enrichmentResult = await pdlService.enrichPerson(enrichParams);

      if (!enrichmentResult.success) {
        console.error(`❌ PDL Enrichment failed for contact ${contactId}:`, enrichmentResult.error);
        
        // Check if it's a data insufficiency error
        const errorMessage = enrichmentResult.error?.message || enrichmentResult.error || 'Enrichment failed';
        const isInsufficientData = errorMessage.includes('minimum combination') || errorMessage.includes('required data points');
        
        if (isInsufficientData) {
          console.warn(`⚠️  Insufficient data provided for enrichment. Available fields:`, {
            ...enrichParams,
            suggestions: 'Consider adding more contact information (email, phone, company, location) for better enrichment results'
          });
        }
        
        return { 
          success: false, 
          error: errorMessage,
          details: enrichmentResult.error,
          warning: isInsufficientData ? 'Add more contact information for better enrichment results' : undefined
        };
      }

      if (enrichmentResult.success && enrichmentResult.data) {
        const enrichedData = enrichmentResult.data;
        console.log('PDL Enrichment successful for contact:', contactId);
        
        // Update potential lead with enriched data (only fill missing fields)
        const leadUpdateData = {};
        const contactUpdateData = {};
        
        // Update phone
        if (!potentialLead.phone && enrichedData.phone_numbers?.length > 0) {
          leadUpdateData.phone = enrichedData.phone_numbers[0].number;
          contactUpdateData.phone = enrichedData.phone_numbers[0].number;
        }
        
        // Update LinkedIn URL
        if (!potentialLead.linkedinUrl && enrichedData.linkedin_url) {
          const linkedinUrl = enrichedData.linkedin_url.startsWith('http') 
            ? enrichedData.linkedin_url 
            : `https://${enrichedData.linkedin_url}`;
          leadUpdateData.linkedinUrl = linkedinUrl;
          contactUpdateData.linkedinUrl = linkedinUrl;
        }

        // Update job title
        if (!potentialLead.jobTitle && enrichedData.job_title) {
          leadUpdateData.jobTitle = enrichedData.job_title;
          contactUpdateData.jobTitle = enrichedData.job_title;
        }

        // Update email if missing
        if (!potentialLead.email && enrichedData.emails?.length > 0) {
          const primaryEmail = enrichedData.emails.find(e => e.type === 'primary') || enrichedData.emails[0];
          leadUpdateData.email = primaryEmail.address;
          contactUpdateData.email = primaryEmail.address;
        }

        // Update company name if missing
        if (!potentialLead.companyName && enrichedData.experience?.length > 0) {
          const currentJob = enrichedData.experience.find(exp => exp.end_date === null) || enrichedData.experience[0];
          if (currentJob?.company?.name) {
            leadUpdateData.companyName = currentJob.company.name;
          }
        }

        // Update location if missing
        if (!potentialLead.locationCountry && enrichedData.location_country) {
          leadUpdateData.locationCountry = enrichedData.location_country;
        }
        if (!potentialLead.locationCity && enrichedData.location_locality) {
          leadUpdateData.locationCity = enrichedData.location_locality;
        }

        // Update industry if missing
        if (!potentialLead.industry && enrichedData.industry) {
          leadUpdateData.industry = enrichedData.industry;
        }

        // Update skills if missing
        if ((!potentialLead.skills || potentialLead.skills.length === 0) && enrichedData.skills?.length > 0) {
          leadUpdateData.skills = enrichedData.skills.slice(0, 10); // Limit to top 10 skills
        }

        // Update the potential lead record
        if (Object.keys(leadUpdateData).length > 0) {
          await potentialLead.update(leadUpdateData);
          console.log('Potential lead updated with enriched data:', leadUpdateData);
        }

        // Update contact record if exists
        if (Object.keys(contactUpdateData).length > 0 && contactId) {
          await Contact.update(contactUpdateData, {
            where: { id: contactId }
          });
          console.log('Contact updated with enriched data:', contactUpdateData);
        }

        if (Object.keys(leadUpdateData).length === 0 && Object.keys(contactUpdateData).length === 0) {
          console.log('No new data to update from enrichment for lead:', potentialLead.id);
        }
        
        return {
          success: true,
          data: enrichedData,
          updatedFields: leadUpdateData,
          updatedLead: potentialLead.reload ? await potentialLead.reload() : potentialLead
        };
      } else {
        console.log('PDL Enrichment failed for contact:', contactId, 'Error:', enrichmentResult.error);
        return {
          success: false,
          error: enrichmentResult.error
        };
      }
      
    } catch (error) {
      console.error('Contact enrichment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manual enrichment endpoint for leads
   */
  async enrichLead(req, res) {
    try {
      const { id } = req.params;
      const { forceEnrich = false } = req.body;

      const potentialLead = await PotentialLead.findByPk(id);
      if (!potentialLead) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Potential lead not found'
          }
        });
      }

      // Find associated contact if lead was converted
      let contact = null;
      if (potentialLead.status === 'added_to_crm') {
        contact = await Contact.findOne({
          where: {
            [Op.or]: [
              ...(potentialLead.email ? [{ email: potentialLead.email }] : []),
              ...(potentialLead.phone ? [{ phone: potentialLead.phone }] : []),
              ...(potentialLead.linkedinUrl ? [{ linkedinUrl: potentialLead.linkedinUrl }] : [])
            ]
          }
        });
      }

      const enrichmentResult = await this.enrichContactAsync(
        contact?.id || null, 
        potentialLead, 
        forceEnrich
      );

      if (enrichmentResult && enrichmentResult.success) {
        res.json({
          success: true,
          data: {
            enrichedData: enrichmentResult.data,
            updatedFields: enrichmentResult.updatedFields,
            contact: contact,
            potentialLead: potentialLead
          },
          message: 'Lead enriched successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ENRICHMENT_FAILED',
            message: enrichmentResult?.error || 'Enrichment failed'
          }
        });
      }
    } catch (error) {
      console.error('Error enriching lead:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to enrich lead'
        }
      });
    }
  }

  /**
   * Helper methods for bulk operations
   */
  async bulkAddToCRM(leadIds, userId) {
    const results = { success: 0, failed: 0, errors: [], companiesCreated: 0 };

    console.log('Starting bulk add to CRM for leadIds:', leadIds);

    for (const leadId of leadIds) {
      try {
        const req = { 
          params: { id: leadId }, 
          user: { id: userId }, 
          body: { forceEnrich: false } 
        };
        const mockRes = {
          status: () => mockRes,
          json: (data) => {
            console.log(`Lead ${leadId} result:`, data);
            if (data.success) {
              results.success++;
              if (data.data?.companyCreated) {
                console.log(`Company created for lead ${leadId}`);
                results.companiesCreated++;
              }
            } else {
              results.failed++;
              results.errors.push({ leadId, error: data.error.message });
            }
          }
        };

        await this.addToCRM(req, mockRes);
        
      } catch (error) {
        results.failed++;
        results.errors.push({ leadId, error: error.message });
      }
    }

    console.log('Bulk add to CRM results:', results);
    return results;
  }

  async bulkReject(leadIds, userId, reason) {
    const results = { success: 0, failed: 0, errors: [] };

    for (const leadId of leadIds) {
      try {
        await PotentialLead.update({
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          rawData: {
            rejectionReason: reason
          }
        }, {
          where: { id: leadId }
        });

        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push({ leadId, error: error.message });
      }
    }

    return results;
  }

  async bulkUpdateStatus(leadIds, userId, status) {
    const results = { success: 0, failed: 0, errors: [] };

    for (const leadId of leadIds) {
      try {
        await PotentialLead.update({
          status,
          reviewedBy: userId,
          reviewedAt: new Date()
        }, {
          where: { id: leadId }
        });

        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push({ leadId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Find contact matches for a potential lead
   */
  async findContactMatches(req, res) {
    try {
      const { id } = req.params;

      const result = await pdlService.findContactMatches(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MATCHING_ERROR',
            message: result.error
          }
        });
      }

      res.json({
        success: true,
        data: {
          lead: result.lead,
          matches: result.matches,
          totalMatches: result.matches.length
        },
        message: `Found ${result.matches.length} potential matches`
      });

    } catch (error) {
      console.error('Find contact matches error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to find contact matches'
        }
      });
    }
  }

  /**
   * Enrich contact with lead data
   */
  async enrichContactWithLead(req, res) {
    try {
      const { contactId } = req.params;
      const { leadId, selectedFields } = req.body;

      if (!leadId || !Array.isArray(selectedFields) || selectedFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Lead ID and selected fields array are required'
          }
        });
      }

      const result = await pdlService.enrichContact(contactId, leadId, selectedFields);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ENRICHMENT_ERROR',
            message: result.error
          }
        });
      }

      res.json({
        success: true,
        data: {
          contact: result.contact,
          enrichmentLog: result.enrichmentLog,
          fieldsEnriched: result.fieldsEnriched,
          fieldsApplied: result.fieldsApplied,
          companyCreated: result.companyCreated
        },
        message: `Contact enriched successfully. ${result.fieldsApplied} fields updated.`
      });

    } catch (error) {
      console.error('Enrich contact error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to enrich contact'
        }
      });
    }
  }
}

// Create instance and bind methods to preserve 'this' context
const pdlController = new PDLController();

// Bind all methods to maintain 'this' context
Object.getOwnPropertyNames(PDLController.prototype).forEach(name => {
  if (name !== 'constructor' && typeof pdlController[name] === 'function') {
    pdlController[name] = pdlController[name].bind(pdlController);
  }
});

module.exports = pdlController;