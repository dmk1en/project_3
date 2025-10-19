const { Company, Contact, Opportunity } = require('../models');
const { Op } = require('sequelize');

class CompanyController {
  /**
   * Get all companies with pagination and filtering
   */
  async getCompanies(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        industry,
        size,
        sort = 'name',
        order = 'asc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100); // Max 100 items per page

      // Build where clause
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { domain: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (industry) {
        where.industry = industry;
      }

      if (size) {
        where.size = size;
      }

      // Build order clause
      const orderClause = [[sort, order.toUpperCase()]];

      const { count, rows: companies } = await Company.findAndCountAll({
        where,
        limit: limitValue,
        offset,
        order: orderClause,
        attributes: [
          'id', 'name', 'domain', 'industry', 'size', 'website',
          'linkedinUrl', 'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: Contact,
            as: 'contacts',
            attributes: [],
            required: false
          },
          {
            model: Opportunity,
            as: 'opportunities',
            attributes: [],
            required: false
          }
        ],
        subQuery: false,
        group: ['Company.id'],
        having: {},
        raw: false
      });

      // Calculate additional metrics for each company
      const companiesWithMetrics = await Promise.all(
        companies.map(async (company) => {
          const contactsCount = await Contact.count({
            where: { companyId: company.id }
          });

          const opportunities = await Opportunity.findAll({
            where: { companyId: company.id },
            attributes: ['value']
          });

          const opportunitiesCount = opportunities.length;
          const totalValue = opportunities.reduce((sum, opp) => 
            sum + (parseFloat(opp.value) || 0), 0
          );

          return {
            ...company.toJSON(),
            contactsCount,
            opportunitiesCount,
            totalValue
          };
        })
      );

      const totalPages = Math.ceil(count / limitValue);

      res.json({
        success: true,
        data: {
          companies: companiesWithMetrics,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: limitValue
          }
        }
      });
    } catch (error) {
      console.error('Get companies error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching companies'
        }
      });
    }
  }

  /**
   * Get single company by ID
   */
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;

      const company = await Company.findByPk(id, {
        include: [
          {
            model: Contact,
            as: 'contacts',
            limit: 10,
            order: [['createdAt', 'DESC']]
          },
          {
            model: Opportunity,
            as: 'opportunities',
            limit: 10,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Get company error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching company'
        }
      });
    }
  }

  /**
   * Create new company
   */
  async createCompany(req, res) {
    try {
      const companyData = req.body;

      const company = await Company.create(companyData);

      res.status(201).json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Create company error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid company data',
            details: error.errors.map(err => ({
              field: err.path,
              message: err.message
            }))
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating company'
        }
      });
    }
  }

  /**
   * Update company
   */
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const company = await Company.findByPk(id);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      await company.update(updateData);

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Update company error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid company data',
            details: error.errors.map(err => ({
              field: err.path,
              message: err.message
            }))
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating company'
        }
      });
    }
  }

  /**
   * Delete company
   */
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;

      const company = await Company.findByPk(id);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      // Check if company has associated contacts or opportunities
      const contactsCount = await Contact.count({ where: { companyId: id } });
      const opportunitiesCount = await Opportunity.count({ where: { companyId: id } });

      if (contactsCount > 0 || opportunitiesCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'COMPANY_HAS_DEPENDENCIES',
            message: 'Cannot delete company with associated contacts or opportunities'
          }
        });
      }

      await company.destroy();

      res.json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      console.error('Delete company error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting company'
        }
      });
    }
  }
}

module.exports = new CompanyController();