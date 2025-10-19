const { Contact, Company, User, Opportunity, Activity, SocialProfile } = require('../models');
const { Op } = require('sequelize');

class ContactController {
  /**
   * Get all contacts with pagination and filtering
   */
  async getContacts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        source,
        assignedTo,
        leadScore,
        company,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100);

      // Build where clause
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { jobTitle: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status) {
        where.leadStatus = status;
      }

      if (source) {
        where.source = source;
      }

      if (assignedTo) {
        where.assignedTo = assignedTo;
      }

      if (company) {
        where.companyId = company;
      }

      if (leadScore) {
        const [min, max] = leadScore.split('-').map(Number);
        where.leadScore = {
          [Op.between]: [min || 0, max || 100]
        };
      }

      // Build order clause
      const orderClause = [[sort, order.toUpperCase()]];

      const { count, rows: contacts } = await Contact.findAndCountAll({
        where,
        limit: limitValue,
        offset,
        order: orderClause,
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'industry', 'size']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        distinct: true
      });

      // Add last activity for each contact
      const contactsWithActivity = await Promise.all(
        contacts.map(async (contact) => {
          const lastActivity = await Activity.findOne({
            where: { contactId: contact.id },
            order: [['createdAt', 'DESC']],
            attributes: ['type', 'createdAt']
          });

          return {
            ...contact.toJSON(),
            lastActivity: lastActivity ? lastActivity.createdAt : null
          };
        })
      );

      const totalPages = Math.ceil(count / limitValue);

      res.json({
        success: true,
        data: {
          contacts: contactsWithActivity,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: limitValue
          }
        }
      });
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching contacts'
        }
      });
    }
  }

  /**
   * Get single contact by ID
   */
  async getContactById(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id, {
        include: [
          {
            model: Company,
            as: 'company'
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Opportunity,
            as: 'opportunities',
            limit: 10,
            order: [['createdAt', 'DESC']]
          },
          {
            model: Activity,
            as: 'activities',
            limit: 20,
            order: [['createdAt', 'DESC']],
            include: [{
              model: User,
              as: 'assignedUser',
              attributes: ['firstName', 'lastName']
            }]
          },
          {
            model: SocialProfile,
            as: 'socialProfiles'
          }
        ]
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Contact not found'
          }
        });
      }

      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error('Get contact error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching contact'
        }
      });
    }
  }

  /**
   * Create new contact
   */
  async createContact(req, res) {
    try {
      const contactData = {
        ...req.body,
        assignedTo: req.body.assignedTo || req.user.id
      };

      const contact = await Contact.create(contactData);

      // Fetch the created contact with associations
      const newContact = await Contact.findByPk(contact.id, {
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: newContact
      });
    } catch (error) {
      console.error('Create contact error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid contact data',
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
          message: 'An error occurred while creating contact'
        }
      });
    }
  }

  /**
   * Update contact
   */
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Contact not found'
          }
        });
      }

      await contact.update(updateData);

      // Fetch updated contact with associations
      const updatedContact = await Contact.findByPk(id, {
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedContact
      });
    } catch (error) {
      console.error('Update contact error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid contact data',
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
          message: 'An error occurred while updating contact'
        }
      });
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Contact not found'
          }
        });
      }

      await contact.destroy();

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting contact'
        }
      });
    }
  }

  /**
   * Convert contact to opportunity
   */
  async convertContact(req, res) {
    try {
      const { id } = req.params;
      const { opportunityName, value, expectedCloseDate, stageId } = req.body;

      const contact = await Contact.findByPk(id, {
        include: [{ model: Company, as: 'company' }]
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Contact not found'
          }
        });
      }

      // Update contact status to converted
      await contact.update({ leadStatus: 'converted' });

      // Create new opportunity
      const opportunity = await Opportunity.create({
        name: opportunityName,
        contactId: contact.id,
        companyId: contact.companyId,
        assignedTo: contact.assignedTo,
        value: value || 0,
        expectedCloseDate,
        stageId,
        source: contact.source
      });

      // Create conversion activity
      await Activity.create({
        type: 'note',
        subject: `Contact converted to opportunity: ${opportunityName}`,
        description: `Contact ${contact.firstName} ${contact.lastName} was successfully converted to opportunity`,
        contactId: contact.id,
        opportunityId: opportunity.id,
        assignedTo: req.user.id,
        completedAt: new Date()
      });

      res.json({
        success: true,
        data: {
          contact,
          opportunity
        }
      });
    } catch (error) {
      console.error('Convert contact error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while converting contact'
        }
      });
    }
  }
}

module.exports = new ContactController();