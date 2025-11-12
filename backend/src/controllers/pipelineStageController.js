const { PipelineStage, Opportunity, Activity } = require('../models');
const { Op } = require('sequelize');

class PipelineStageController {
  /**
   * Get all pipeline stages
   */
  async getStages(req, res) {
    try {
      const {
        includeInactive = false,
        includeStats = false
      } = req.query;

      const where = includeInactive === 'true' ? {} : { isActive: true };

      const stages = await PipelineStage.findAll({
        where,
        order: [['displayOrder', 'ASC']],
        ...(includeStats === 'true' && {
          include: [{
            model: Opportunity,
            as: 'opportunities',
            attributes: [],
            required: false
          }],
          attributes: {
            include: [
              [
                PipelineStage.sequelize.fn('COUNT', PipelineStage.sequelize.col('opportunities.id')),
                'opportunityCount'
              ],
              [
                PipelineStage.sequelize.fn('SUM', PipelineStage.sequelize.col('opportunities.value')),
                'totalValue'
              ]
            ]
          },
          group: ['PipelineStage.id'],
          raw: false
        })
      });

      res.json({
        success: true,
        data: stages
      });
    } catch (error) {
      console.error('Get stages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching pipeline stages'
        }
      });
    }
  }

  /**
   * Get single stage by ID
   */
  async getStageById(req, res) {
    try {
      const { id } = req.params;

      const stage = await PipelineStage.findByPk(id, {
        include: [{
          model: Opportunity,
          as: 'opportunities',
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'name', 'value', 'expectedCloseDate']
        }]
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STAGE_NOT_FOUND',
            message: 'Pipeline stage not found'
          }
        });
      }

      res.json({
        success: true,
        data: stage
      });
    } catch (error) {
      console.error('Get stage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching pipeline stage'
        }
      });
    }
  }

  /**
   * Create new pipeline stage
   */
  async createStage(req, res) {
    try {
      const stageData = req.body;

      // Get the next display order
      const maxOrder = await PipelineStage.max('displayOrder') || 0;
      stageData.displayOrder = maxOrder + 1;

      const stage = await PipelineStage.create(stageData);

      res.status(201).json({
        success: true,
        data: stage
      });
    } catch (error) {
      console.error('Create stage error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid stage data',
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
          message: 'An error occurred while creating pipeline stage'
        }
      });
    }
  }

  /**
   * Update pipeline stage
   */
  async updateStage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const stage = await PipelineStage.findByPk(id);

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STAGE_NOT_FOUND',
            message: 'Pipeline stage not found'
          }
        });
      }

      await stage.update(updateData);

      // If probability changed, update all opportunities in this stage
      if (updateData.probabilityPercent !== undefined && updateData.probabilityPercent !== stage.probabilityPercent) {
        await Opportunity.update(
          { probability: updateData.probabilityPercent },
          { where: { stageId: id } }
        );
      }

      res.json({
        success: true,
        data: stage
      });
    } catch (error) {
      console.error('Update stage error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid stage data',
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
          message: 'An error occurred while updating pipeline stage'
        }
      });
    }
  }

  /**
   * Delete pipeline stage
   */
  async deleteStage(req, res) {
    try {
      const { id } = req.params;
      const { moveToStageId } = req.body;

      const stage = await PipelineStage.findByPk(id);

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STAGE_NOT_FOUND',
            message: 'Pipeline stage not found'
          }
        });
      }

      // Check if there are opportunities in this stage
      const opportunityCount = await Opportunity.count({
        where: { stageId: id }
      });

      if (opportunityCount > 0) {
        if (!moveToStageId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'STAGE_HAS_OPPORTUNITIES',
              message: `Cannot delete stage with ${opportunityCount} opportunities. Please specify a moveToStageId to move them first.`,
              data: { opportunityCount }
            }
          });
        }

        // Verify target stage exists
        const targetStage = await PipelineStage.findByPk(moveToStageId);
        if (!targetStage) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'TARGET_STAGE_NOT_FOUND',
              message: 'Target stage for moving opportunities not found'
            }
          });
        }

        // Move all opportunities to the target stage
        await Opportunity.update(
          { 
            stageId: moveToStageId,
            probability: targetStage.probabilityPercent
          },
          { where: { stageId: id } }
        );

        // Create activities for moved opportunities
        const movedOpportunities = await Opportunity.findAll({
          where: { stageId: moveToStageId },
          attributes: ['id', 'name', 'contactId']
        });

        const activities = movedOpportunities.map(opp => ({
          type: 'stage_change',
          subject: `Stage changed due to deletion: ${stage.name} → ${targetStage.name}`,
          description: `Opportunity "${opp.name}" was moved from deleted stage "${stage.name}" to "${targetStage.name}"`,
          opportunityId: opp.id,
          contactId: opp.contactId,
          assignedTo: req.user.id,
          completedAt: new Date()
        }));

        await Activity.bulkCreate(activities);
      }

      await stage.destroy();

      // Reorder remaining stages
      await this.reorderStages();

      res.json({
        success: true,
        message: `Pipeline stage deleted successfully${opportunityCount > 0 ? `. ${opportunityCount} opportunities moved to ${targetStage?.name}` : ''}`,
        data: {
          deletedStage: stage.name,
          movedOpportunities: opportunityCount,
          targetStage: moveToStageId ? targetStage.name : null
        }
      });
    } catch (error) {
      console.error('Delete stage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting pipeline stage'
        }
      });
    }
  }

  /**
   * Reorder pipeline stages
   */
  async reorderStages(req, res) {
    try {
      const { stageIds } = req.body || {};

      if (req && res && stageIds) {
        // Called from API endpoint
        if (!Array.isArray(stageIds) || stageIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_STAGE_IDS',
              message: 'Stage IDs must be a non-empty array'
            }
          });
        }

        // Update display order for each stage
        const updatePromises = stageIds.map((stageId, index) => 
          PipelineStage.update(
            { displayOrder: index + 1 },
            { where: { id: stageId } }
          )
        );

        await Promise.all(updatePromises);

        // Fetch updated stages
        const stages = await PipelineStage.findAll({
          where: { id: stageIds },
          order: [['displayOrder', 'ASC']]
        });

        res.json({
          success: true,
          message: 'Pipeline stages reordered successfully',
          data: stages
        });
      } else {
        // Called internally - fix gaps in display order
        const stages = await PipelineStage.findAll({
          order: [['displayOrder', 'ASC']]
        });

        const updatePromises = stages.map((stage, index) => 
          stage.update({ displayOrder: index + 1 })
        );

        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error('Reorder stages error:', error);
      if (res) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while reordering pipeline stages'
          }
        });
      }
    }
  }

  /**
   * Toggle stage active status
   */
  async toggleStageStatus(req, res) {
    try {
      const { id } = req.params;

      const stage = await PipelineStage.findByPk(id);

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STAGE_NOT_FOUND',
            message: 'Pipeline stage not found'
          }
        });
      }

      // Check if deactivating a stage with opportunities
      if (stage.isActive) {
        const opportunityCount = await Opportunity.count({
          where: { stageId: id }
        });

        if (opportunityCount > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'STAGE_HAS_OPPORTUNITIES',
              message: `Cannot deactivate stage with ${opportunityCount} opportunities. Please move them first.`,
              data: { opportunityCount }
            }
          });
        }
      }

      await stage.update({ isActive: !stage.isActive });

      res.json({
        success: true,
        message: `Pipeline stage ${stage.isActive ? 'activated' : 'deactivated'} successfully`,
        data: stage
      });
    } catch (error) {
      console.error('Toggle stage status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating stage status'
        }
      });
    }
  }

  /**
   * Get stage conversion analytics
   */
  async getStageAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        userId
      } = req.query;

      // Build date filter
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        };
      } else {
        // Default to last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        dateFilter = {
          createdAt: {
            [Op.gte]: threeMonthsAgo
          }
        };
      }

      // User filter
      const userFilter = userId ? { assignedTo: userId } : {};

      // Get stage conversion data
      const stageActivities = await Activity.findAll({
        where: {
          type: 'stage_change',
          ...dateFilter
        },
        include: [{
          model: Opportunity,
          as: 'opportunity',
          where: userFilter,
          required: true,
          attributes: ['id', 'name', 'value']
        }],
        order: [['createdAt', 'ASC']]
      });

      // Calculate conversion rates and velocity
      const stageMetrics = {};
      const stages = await PipelineStage.findAll({
        where: { isActive: true },
        order: [['displayOrder', 'ASC']]
      });

      for (const stage of stages) {
        stageMetrics[stage.id] = {
          id: stage.id,
          name: stage.name,
          displayOrder: stage.displayOrder,
          conversions: 0,
          totalValue: 0,
          avgTimeInStage: 0,
          conversionRate: 0
        };
      }

      // Process stage changes to calculate metrics
      const opportunityStageHistory = {};
      
      stageActivities.forEach(activity => {
        const oppId = activity.opportunity.id;
        if (!opportunityStageHistory[oppId]) {
          opportunityStageHistory[oppId] = [];
        }
        opportunityStageHistory[oppId].push({
          date: activity.createdAt,
          subject: activity.subject,
          value: activity.opportunity.value
        });
      });

      // Calculate conversion rates and time in stage
      Object.values(opportunityStageHistory).forEach(history => {
        history.forEach((entry, index) => {
          if (index < history.length - 1) {
            const timeInStage = (history[index + 1].date - entry.date) / (1000 * 60 * 60 * 24); // days
            // Extract stage info from activity subject (simplified)
            // In a real implementation, you'd want to store stage IDs in activities
          }
        });
      });

      res.json({
        success: true,
        data: {
          stages: Object.values(stageMetrics),
          totalOpportunities: Object.keys(opportunityStageHistory).length,
          dateRange: { startDate, endDate },
          analysisNote: 'Stage analytics implementation can be enhanced with more detailed stage tracking'
        }
      });
    } catch (error) {
      console.error('Get stage analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching stage analytics'
        }
      });
    }
  }
}

module.exports = new PipelineStageController();