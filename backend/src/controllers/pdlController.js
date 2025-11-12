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

      // Create new contact from potential lead
      const contactData = {
        firstName: potentialLead.fullName?.split(' ')[0] || '',
        lastName: potentialLead.fullName?.split(' ').slice(1).join(' ') || '',
        email: potentialLead.email,
        phone: potentialLead.phone,
        jobTitle: potentialLead.jobTitle,
        source: 'pdl_discovery',
        linkedinUrl: potentialLead.linkedinUrl,
        assignedTo: userId,
        notes: `Discovered via PDL on ${potentialLead.retrievedAt?.toDateString()}. Lead Score: ${potentialLead.leadScore}`,
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

      // Enrich the contact if possible
      if (potentialLead.email || potentialLead.linkedinUrl) {
        this.enrichContactAsync(newContact.id, potentialLead);
      }

      res.status(201).json({
        success: true,
        data: {
          contact: newContact,
          potentialLead: potentialLead
        },
        message: 'Lead successfully added to CRM'
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
        isActive = true
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100);

      const queries = await PdlSearchQuery.findAndCountAll({
        where: isActive !== undefined ? { isActive: isActive === 'true' } : {},
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
   * Async function to enrich contact data
   */
  async enrichContactAsync(contactId, potentialLead) {
    try {
      const enrichParams = {};
      
      if (potentialLead.email) {
        enrichParams.email = potentialLead.email;
      } else if (potentialLead.linkedinUrl) {
        enrichParams.linkedin_url = potentialLead.linkedinUrl;
      } else if (potentialLead.firstName && potentialLead.lastName) {
        // Try with name + company if available
        enrichParams.first_name = potentialLead.firstName;
        enrichParams.last_name = potentialLead.lastName;
        
        if (potentialLead.companyName) {
          enrichParams.company = potentialLead.companyName;
        } else if (potentialLead.location) {
          enrichParams.location = potentialLead.location;
        } else {
          console.log('PDL Enrichment skipped: insufficient data for lead', contactId);
          return; // No enrichment possible without additional context
        }
      } else {
        console.log('PDL Enrichment skipped: no identifiable data for lead', contactId);
        return; // No enrichment possible
      }

      console.log('PDL Enrichment attempt with params:', enrichParams);
      const enrichmentResult = await pdlService.enrichPerson(enrichParams);

      if (enrichmentResult.success && enrichmentResult.data) {
        const enrichedData = enrichmentResult.data;
        console.log('PDL Enrichment successful for contact:', contactId);
        
        // Update contact with enriched data
        const updateData = {};
        
        if (!potentialLead.phone && enrichedData.phone_numbers?.length > 0) {
          updateData.phone = enrichedData.phone_numbers[0].number;
        }
        
        if (!potentialLead.linkedinUrl && enrichedData.linkedin_url) {
          updateData.linkedinUrl = enrichedData.linkedin_url;
        }

        if (Object.keys(updateData).length > 0) {
          await Contact.update(updateData, {
            where: { id: contactId }
          });
          console.log('Contact updated with enriched data:', updateData);
        }
      } else {
        console.log('PDL Enrichment failed for contact:', contactId, 'Error:', enrichmentResult.error);
      }
      
    } catch (error) {
      console.error('Contact enrichment error:', error.message);
    }
  }

  /**
   * Helper methods for bulk operations
   */
  async bulkAddToCRM(leadIds, userId) {
    const results = { success: 0, failed: 0, errors: [] };

    for (const leadId of leadIds) {
      try {
        const req = { params: { id: leadId }, user: { id: userId } };
        const mockRes = {
          status: () => mockRes,
          json: (data) => {
            if (data.success) {
              results.success++;
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