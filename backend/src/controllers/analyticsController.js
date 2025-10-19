const { 
  User, 
  Company, 
  Contact, 
  Opportunity, 
  Activity, 
  PipelineStage 
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

class AnalyticsController {
  /**
   * Get dashboard analytics
   */
  async getDashboard(req, res) {
    try {
      const {
        period = 'month',
        startDate,
        endDate,
        userId
      } = req.query;

      // Calculate date range
      let dateRange = {};
      if (startDate && endDate) {
        dateRange = {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        };
      } else {
        const now = moment();
        let start;
        
        switch (period) {
          case 'today':
            start = now.clone().startOf('day');
            break;
          case 'week':
            start = now.clone().startOf('week');
            break;
          case 'month':
            start = now.clone().startOf('month');
            break;
          case 'quarter':
            start = now.clone().startOf('quarter');
            break;
          case 'year':
            start = now.clone().startOf('year');
            break;
          default:
            start = now.clone().startOf('month');
        }
        
        dateRange = {
          createdAt: {
            [Op.gte]: start.toDate()
          }
        };
      }

      // Add user filter if specified
      const userFilter = userId ? { assignedTo: userId } : {};

      // Summary statistics
      const [
        totalOpportunities,
        totalValue,
        wonDeals,
        avgDealSize,
        totalContacts,
        totalCompanies,
        recentActivities
      ] = await Promise.all([
        // Total opportunities
        Opportunity.count({
          where: { ...dateRange, ...userFilter }
        }),
        
        // Total pipeline value
        Opportunity.sum('value', {
          where: { ...dateRange, ...userFilter }
        }),
        
        // Won deals
        Opportunity.count({
          where: {
            ...dateRange,
            ...userFilter,
            actualCloseDate: { [Op.not]: null }
          },
          include: [{
            model: PipelineStage,
            as: 'stage',
            where: { name: { [Op.iLike]: '%won%' } }
          }]
        }),
        
        // Average deal size
        Opportunity.findOne({
          attributes: [[fn('AVG', col('value')), 'average']],
          where: { ...dateRange, ...userFilter },
          raw: true
        }),
        
        // Total contacts
        Contact.count({
          where: { ...dateRange, ...userFilter }
        }),
        
        // Total companies
        Company.count({
          where: dateRange
        }),
        
        // Recent activities
        Activity.findAll({
          limit: 10,
          order: [['createdAt', 'DESC']],
          where: userFilter,
          include: [
            {
              model: Contact,
              as: 'contact',
              attributes: ['firstName', 'lastName']
            },
            {
              model: User,
              as: 'assignedUser',
              attributes: ['firstName', 'lastName']
            }
          ]
        })
      ]);

      // Pipeline health by stage
      const pipelineHealth = await PipelineStage.findAll({
        attributes: [
          'id',
          'name',
          'probabilityPercent',
          [fn('COUNT', col('opportunities.id')), 'count'],
          [fn('SUM', col('opportunities.value')), 'value']
        ],
        include: [{
          model: Opportunity,
          as: 'opportunities',
          attributes: [],
          where: { ...dateRange, ...userFilter },
          required: false
        }],
        group: ['PipelineStage.id'],
        order: [['displayOrder', 'ASC']],
        raw: false
      });

      // Top performers (if not filtering by specific user)
      let topPerformers = [];
      if (!userId) {
        const performanceData = await User.findAll({
          attributes: [
            'id',
            'firstName',
            'lastName',
            [fn('COUNT', col('assignedOpportunities.id')), 'totalDeals'],
            [fn('SUM', col('assignedOpportunities.value')), 'totalRevenue']
          ],
          include: [{
            model: Opportunity,
            as: 'assignedOpportunities',
            attributes: [],
            where: dateRange,
            required: false,
            include: [{
              model: PipelineStage,
              as: 'stage',
              where: { name: { [Op.iLike]: '%won%' } },
              required: false
            }]
          }],
          group: ['User.id'],
          order: [[literal('totalRevenue'), 'DESC']],
          limit: 5,
          raw: false
        });

        topPerformers = performanceData.map(user => ({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          totalDeals: parseInt(user.dataValues.totalDeals) || 0,
          totalRevenue: parseFloat(user.dataValues.totalRevenue) || 0
        }));
      }

      // Lead sources analysis
      const leadSources = await Contact.findAll({
        attributes: [
          'source',
          [fn('COUNT', col('id')), 'count']
        ],
        where: { ...dateRange, ...userFilter },
        group: ['source'],
        order: [[literal('count'), 'DESC']],
        raw: true
      });

      // Conversion rate calculation
      const convertedContacts = await Contact.count({
        where: {
          ...dateRange,
          ...userFilter,
          leadStatus: 'converted'
        }
      });

      const conversionRate = totalContacts > 0 ? 
        Math.round((convertedContacts / totalContacts) * 100) : 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalOpportunities,
            totalValue: totalValue || 0,
            wonDeals,
            conversionRate,
            averageDealSize: Math.round(avgDealSize?.average || 0),
            totalContacts,
            totalCompanies
          },
          pipelineHealth: pipelineHealth.map(stage => ({
            stage: stage.name,
            stageId: stage.id,
            probability: stage.probabilityPercent,
            count: parseInt(stage.dataValues.count) || 0,
            value: parseFloat(stage.dataValues.value) || 0
          })),
          recentActivities: recentActivities.map(activity => ({
            id: activity.id,
            type: activity.type,
            subject: activity.subject,
            contact: activity.contact ? 
              `${activity.contact.firstName} ${activity.contact.lastName}` : null,
            assignedUser: activity.assignedUser ?
              `${activity.assignedUser.firstName} ${activity.assignedUser.lastName}` : null,
            createdAt: activity.createdAt
          })),
          topPerformers,
          leadSources: leadSources.map(source => ({
            source: source.source,
            count: parseInt(source.count)
          })),
          period: {
            type: period,
            startDate: startDate || moment().startOf(period === 'today' ? 'day' : period).toISOString(),
            endDate: endDate || moment().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching dashboard analytics'
        }
      });
    }
  }

  /**
   * Get sales performance report
   */
  async getSalesPerformance(req, res) {
    try {
      const {
        period = 'month',
        userId,
        startDate,
        endDate
      } = req.query;

      // Build date range
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        };
      } else {
        const now = moment();
        const start = now.clone().subtract(1, period).startOf(period);
        dateFilter = {
          createdAt: {
            [Op.gte]: start.toDate()
          }
        };
      }

      const userFilter = userId ? { assignedTo: userId } : {};

      // Monthly/Weekly breakdown
      const timeSeriesData = await Opportunity.findAll({
        attributes: [
          [fn('DATE_TRUNC', period, col('created_at')), 'period'],
          [fn('COUNT', col('id')), 'opportunities'],
          [fn('SUM', col('value')), 'revenue']
        ],
        where: { ...dateFilter, ...userFilter },
        group: [literal('DATE_TRUNC(\'' + period + '\', created_at)')],
        order: [[literal('period'), 'ASC']],
        raw: true
      });

      // Conversion funnel
      const funnelData = await Promise.all([
        Contact.count({ where: { leadStatus: 'new', ...dateFilter, ...userFilter } }),
        Contact.count({ where: { leadStatus: 'contacted', ...dateFilter, ...userFilter } }),
        Contact.count({ where: { leadStatus: 'qualified', ...dateFilter, ...userFilter } }),
        Contact.count({ where: { leadStatus: 'nurturing', ...dateFilter, ...userFilter } }),
        Contact.count({ where: { leadStatus: 'converted', ...dateFilter, ...userFilter } })
      ]);

      const funnel = [
        { stage: 'New Leads', count: funnelData[0] },
        { stage: 'Contacted', count: funnelData[1] },
        { stage: 'Qualified', count: funnelData[2] },
        { stage: 'Nurturing', count: funnelData[3] },
        { stage: 'Converted', count: funnelData[4] }
      ];

      // Deal size distribution
      const dealSizes = await Opportunity.findAll({
        attributes: [
          [literal('CASE WHEN value < 1000 THEN \'<$1K\' WHEN value < 5000 THEN \'$1K-$5K\' WHEN value < 10000 THEN \'$5K-$10K\' WHEN value < 50000 THEN \'$10K-$50K\' ELSE \'$50K+\' END'), 'range'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: { ...dateFilter, ...userFilter },
        group: [literal('CASE WHEN value < 1000 THEN \'<$1K\' WHEN value < 5000 THEN \'$1K-$5K\' WHEN value < 10000 THEN \'$5K-$10K\' WHEN value < 50000 THEN \'$10K-$50K\' ELSE \'$50K+\' END')],
        raw: true
      });

      res.json({
        success: true,
        data: {
          timeSeries: timeSeriesData.map(item => ({
            period: item.period,
            opportunities: parseInt(item.opportunities),
            revenue: parseFloat(item.revenue) || 0
          })),
          conversionFunnel: funnel,
          dealSizeDistribution: dealSizes.map(item => ({
            range: item.range,
            count: parseInt(item.count)
          }))
        }
      });
    } catch (error) {
      console.error('Sales performance error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching sales performance data'
        }
      });
    }
  }

  /**
   * Get lead sources report
   */
  async getLeadSources(req, res) {
    try {
      const {
        period = 'month',
        startDate,
        endDate
      } = req.query;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        };
      } else {
        const now = moment();
        const start = now.clone().subtract(3, 'months').startOf('month');
        dateFilter = {
          createdAt: {
            [Op.gte]: start.toDate()
          }
        };
      }

      // Lead sources with conversion rates
      const sourceAnalysis = await Contact.findAll({
        attributes: [
          'source',
          [fn('COUNT', col('id')), 'totalLeads'],
          [fn('SUM', literal('CASE WHEN lead_status = \'converted\' THEN 1 ELSE 0 END')), 'convertedLeads']
        ],
        where: dateFilter,
        group: ['source'],
        order: [[literal('totalLeads'), 'DESC']],
        raw: true
      });

      const sourceData = sourceAnalysis.map(item => ({
        source: item.source,
        totalLeads: parseInt(item.totalLeads),
        convertedLeads: parseInt(item.convertedLeads),
        conversionRate: item.totalLeads > 0 ? 
          Math.round((item.convertedLeads / item.totalLeads) * 100) : 0
      }));

      res.json({
        success: true,
        data: {
          sources: sourceData,
          summary: {
            totalSources: sourceData.length,
            bestSource: sourceData.length > 0 ? sourceData[0].source : null,
            avgConversionRate: sourceData.length > 0 ?
              Math.round(sourceData.reduce((sum, s) => sum + s.conversionRate, 0) / sourceData.length) : 0
          }
        }
      });
    } catch (error) {
      console.error('Lead sources error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching lead sources data'
        }
      });
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(req, res) {
    try {
      const {
        reportType,
        dateRange,
        filters,
        groupBy,
        metrics
      } = req.body;

      // This is a basic implementation - can be extended for more complex reports
      let data = {};

      switch (reportType) {
        case 'activity_summary':
          data = await this.getActivitySummary(dateRange, filters);
          break;
        case 'pipeline_analysis':
          data = await this.getPipelineAnalysis(dateRange, filters);
          break;
        case 'user_performance':
          data = await this.getUserPerformance(dateRange, filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REPORT_TYPE',
              message: 'Invalid report type specified'
            }
          });
      }

      res.json({
        success: true,
        data: {
          reportType,
          generatedAt: new Date().toISOString(),
          ...data
        }
      });
    } catch (error) {
      console.error('Custom report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating custom report'
        }
      });
    }
  }

  async getActivitySummary(dateRange, filters) {
    const whereClause = {};
    if (dateRange?.start && dateRange?.end) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
      };
    }

    const activities = await Activity.findAll({
      attributes: [
        'type',
        [fn('COUNT', col('id')), 'count'],
        [fn('COUNT', literal('CASE WHEN completed_at IS NOT NULL THEN 1 END')), 'completed']
      ],
      where: whereClause,
      group: ['type'],
      raw: true
    });

    return {
      activities: activities.map(a => ({
        type: a.type,
        count: parseInt(a.count),
        completed: parseInt(a.completed),
        completionRate: a.count > 0 ? Math.round((a.completed / a.count) * 100) : 0
      }))
    };
  }

  async getPipelineAnalysis(dateRange, filters) {
    // Implementation for pipeline analysis
    return { message: 'Pipeline analysis implementation' };
  }

  async getUserPerformance(dateRange, filters) {
    // Implementation for user performance
    return { message: 'User performance implementation' };
  }
}

module.exports = new AnalyticsController();