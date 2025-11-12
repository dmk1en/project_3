const { Opportunity, Contact, Company, User, PipelineStage, Activity } = require('../models');
const { Op } = require('sequelize');

class OpportunityController {
  /**
   * Get all opportunities with pagination and filtering
   */
  async getOpportunities(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        stageId,
        assignedTo,
        companyId,
        contactId,
        minValue,
        maxValue,
        expectedCloseDateStart,
        expectedCloseDateEnd,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitValue = Math.min(parseInt(limit), 100);

      // Build where clause
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (stageId) {
        where.stageId = stageId;
      }

      if (assignedTo) {
        where.assignedTo = assignedTo;
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (contactId) {
        where.contactId = contactId;
      }

      if (minValue || maxValue) {
        where.value = {};
        if (minValue) where.value[Op.gte] = parseFloat(minValue);
        if (maxValue) where.value[Op.lte] = parseFloat(maxValue);
      }

      if (expectedCloseDateStart || expectedCloseDateEnd) {
        where.expectedCloseDate = {};
        if (expectedCloseDateStart) where.expectedCloseDate[Op.gte] = expectedCloseDateStart;
        if (expectedCloseDateEnd) where.expectedCloseDate[Op.lte] = expectedCloseDateEnd;
      }

      // Build order clause
      const orderClause = [[sort, order.toUpperCase()]];

      const { count, rows: opportunities } = await Opportunity.findAndCountAll({
        where,
        limit: limitValue,
        offset,
        order: orderClause,
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'industry', 'size']
          },
          {
            model: PipelineStage,
            as: 'stage',
            attributes: ['id', 'name', 'probabilityPercent', 'color']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        distinct: true
      });

      // Add last activity for each opportunity
      const opportunitiesWithActivity = await Promise.all(
        opportunities.map(async (opportunity) => {
          const lastActivity = await Activity.findOne({
            where: { opportunityId: opportunity.id },
            order: [['createdAt', 'DESC']],
            attributes: ['type', 'subject', 'createdAt']
          });

          return {
            ...opportunity.toJSON(),
            lastActivity: lastActivity ? {
              type: lastActivity.type,
              subject: lastActivity.subject,
              date: lastActivity.createdAt
            } : null
          };
        })
      );

      const totalPages = Math.ceil(count / limitValue);

      res.json({
        success: true,
        data: {
          opportunities: opportunitiesWithActivity,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: limitValue
          }
        }
      });
    } catch (error) {
      console.error('Get opportunities error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching opportunities'
        }
      });
    }
  }

  /**
   * Get single opportunity by ID
   */
  async getOpportunityById(req, res) {
    try {
      const { id } = req.params;

      const opportunity = await Opportunity.findByPk(id, {
        include: [
          {
            model: Contact,
            as: 'contact'
          },
          {
            model: Company,
            as: 'company'
          },
          {
            model: PipelineStage,
            as: 'stage'
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email']
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
          }
        ]
      });

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPPORTUNITY_NOT_FOUND',
            message: 'Opportunity not found'
          }
        });
      }

      res.json({
        success: true,
        data: opportunity
      });
    } catch (error) {
      console.error('Get opportunity error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching opportunity'
        }
      });
    }
  }

  /**
   * Create new opportunity
   */
  async createOpportunity(req, res) {
    try {
      const opportunityData = {
        ...req.body,
        assignedTo: req.body.assignedTo || req.user.id
      };

      const opportunity = await Opportunity.create(opportunityData);

      // Create activity for opportunity creation
      await Activity.create({
        type: 'note',
        subject: `Opportunity created: ${opportunity.name}`,
        description: `New opportunity "${opportunity.name}" was created`,
        opportunityId: opportunity.id,
        contactId: opportunity.contactId,
        assignedTo: req.user.id,
        completedAt: new Date()
      });

      // Fetch the created opportunity with associations
      const newOpportunity = await Opportunity.findByPk(opportunity.id, {
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: PipelineStage,
            as: 'stage',
            attributes: ['id', 'name', 'probabilityPercent', 'color']
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
        data: newOpportunity
      });
    } catch (error) {
      console.error('Create opportunity error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid opportunity data',
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
          message: 'An error occurred while creating opportunity'
        }
      });
    }
  }

  /**
   * Update opportunity
   */
  async updateOpportunity(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const opportunity = await Opportunity.findByPk(id);

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPPORTUNITY_NOT_FOUND',
            message: 'Opportunity not found'
          }
        });
      }

      const oldStageId = opportunity.stageId;
      await opportunity.update(updateData);

      // Create activity if stage changed
      if (updateData.stageId && updateData.stageId !== oldStageId) {
        const [oldStage, newStage] = await Promise.all([
          PipelineStage.findByPk(oldStageId),
          PipelineStage.findByPk(updateData.stageId)
        ]);

        await Activity.create({
          type: 'stage_change',
          subject: `Stage changed from ${oldStage?.name || 'Unknown'} to ${newStage?.name || 'Unknown'}`,
          description: `Opportunity "${opportunity.name}" moved to ${newStage?.name || 'Unknown'} stage`,
          opportunityId: opportunity.id,
          contactId: opportunity.contactId,
          assignedTo: req.user.id,
          completedAt: new Date()
        });
      }

      // Fetch updated opportunity with associations
      const updatedOpportunity = await Opportunity.findByPk(id, {
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: PipelineStage,
            as: 'stage',
            attributes: ['id', 'name', 'probabilityPercent', 'color']
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
        data: updatedOpportunity
      });
    } catch (error) {
      console.error('Update opportunity error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid opportunity data',
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
          message: 'An error occurred while updating opportunity'
        }
      });
    }
  }

  /**
   * Delete opportunity
   */
  async deleteOpportunity(req, res) {
    try {
      const { id } = req.params;

      const opportunity = await Opportunity.findByPk(id);

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPPORTUNITY_NOT_FOUND',
            message: 'Opportunity not found'
          }
        });
      }

      // Create deletion activity before deleting
      await Activity.create({
        type: 'note',
        subject: `Opportunity deleted: ${opportunity.name}`,
        description: `Opportunity "${opportunity.name}" was deleted`,
        contactId: opportunity.contactId,
        assignedTo: req.user.id,
        completedAt: new Date()
      });

      await opportunity.destroy();

      res.json({
        success: true,
        message: 'Opportunity deleted successfully'
      });
    } catch (error) {
      console.error('Delete opportunity error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting opportunity'
        }
      });
    }
  }

  /**
   * Move opportunity to a different stage
   */
  async moveToStage(req, res) {
    try {
      const { id } = req.params;
      const { stageId, notes } = req.body;

      const opportunity = await Opportunity.findByPk(id, {
        include: [{ model: PipelineStage, as: 'stage' }]
      });

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPPORTUNITY_NOT_FOUND',
            message: 'Opportunity not found'
          }
        });
      }

      const newStage = await PipelineStage.findByPk(stageId);
      if (!newStage) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STAGE_NOT_FOUND',
            message: 'Pipeline stage not found'
          }
        });
      }

      const oldStageName = opportunity.stage?.name || 'Unknown';
      
      // Update opportunity stage and probability
      await opportunity.update({
        stageId: stageId,
        probability: newStage.probabilityPercent
      });

      // Create stage change activity
      await Activity.create({
        type: 'stage_change',
        subject: `Stage changed from ${oldStageName} to ${newStage.name}`,
        description: notes || `Opportunity "${opportunity.name}" moved to ${newStage.name} stage`,
        opportunityId: opportunity.id,
        contactId: opportunity.contactId,
        assignedTo: req.user.id,
        completedAt: new Date()
      });

      // Fetch updated opportunity
      const updatedOpportunity = await Opportunity.findByPk(id, {
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: PipelineStage,
            as: 'stage',
            attributes: ['id', 'name', 'probabilityPercent', 'color']
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
        data: updatedOpportunity
      });
    } catch (error) {
      console.error('Move opportunity to stage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while moving opportunity to stage'
        }
      });
    }
  }

  /**
   * Get opportunities by pipeline stage (Kanban view)
   */
  async getOpportunitiesByStage(req, res) {
    try {
      const {
        assignedTo,
        companyId,
        minValue,
        maxValue
      } = req.query;

      // Build where clause for opportunities
      const where = {};
      
      if (assignedTo) {
        where.assignedTo = assignedTo;
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (minValue || maxValue) {
        where.value = {};
        if (minValue) where.value[Op.gte] = parseFloat(minValue);
        if (maxValue) where.value[Op.lte] = parseFloat(maxValue);
      }

      const stages = await PipelineStage.findAll({
        where: { isActive: true },
        order: [['displayOrder', 'ASC']],
        include: [{
          model: Opportunity,
          as: 'opportunities',
          where,
          required: false,
          include: [
            {
              model: Contact,
              as: 'contact',
              attributes: ['id', 'firstName', 'lastName', 'email']
            },
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
          ],
          order: [['createdAt', 'DESC']]
        }]
      });

      // Calculate stage statistics
      const stagesWithStats = stages.map(stage => {
        const opportunities = stage.opportunities || [];
        const totalValue = opportunities.reduce((sum, opp) => sum + (parseFloat(opp.value) || 0), 0);
        
        return {
          ...stage.toJSON(),
          stats: {
            count: opportunities.length,
            totalValue,
            avgValue: opportunities.length > 0 ? totalValue / opportunities.length : 0
          }
        };
      });

      res.json({
        success: true,
        data: stagesWithStats
      });
    } catch (error) {
      console.error('Get opportunities by stage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching opportunities by stage'
        }
      });
    }
  }
}

module.exports = new OpportunityController();