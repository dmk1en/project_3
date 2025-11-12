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
    const whereClause = {};
    if (dateRange?.start && dateRange?.end) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
      };
    }

    // Pipeline velocity - average time opportunities spend in each stage
    const pipelineVelocity = await PipelineStage.findAll({
      attributes: [
        'id',
        'name',
        'displayOrder',
        'probabilityPercent'
      ],
      include: [{
        model: Opportunity,
        as: 'opportunities',
        attributes: [],
        where: whereClause,
        required: false
      }],
      order: [['displayOrder', 'ASC']]
    });

    // Stage conversion rates - opportunities moving between stages
    const stageMovements = await Activity.findAll({
      attributes: [
        'subject',
        [fn('COUNT', col('Activity.id')), 'movements']
      ],
      where: {
        type: 'stage_change',
        ...whereClause
      },
      group: ['subject'],
      raw: true
    });

    // Deal size analysis by stage
    const dealSizeByStage = await PipelineStage.findAll({
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('opportunities.id')), 'count'],
        [fn('AVG', col('opportunities.value')), 'avgValue'],
        [fn('SUM', col('opportunities.value')), 'totalValue'],
        [fn('MIN', col('opportunities.value')), 'minValue'],
        [fn('MAX', col('opportunities.value')), 'maxValue']
      ],
      include: [{
        model: Opportunity,
        as: 'opportunities',
        attributes: [],
        where: whereClause,
        required: false
      }],
      group: ['PipelineStage.id'],
      raw: false
    });

    return {
      pipelineVelocity: pipelineVelocity.map(stage => ({
        stageId: stage.id,
        name: stage.name,
        displayOrder: stage.displayOrder,
        probabilityPercent: stage.probabilityPercent
      })),
      stageMovements: stageMovements.map(movement => ({
        transition: movement.subject,
        count: parseInt(movement.movements)
      })),
      dealSizeAnalysis: dealSizeByStage.map(stage => ({
        stageId: stage.id,
        name: stage.name,
        count: parseInt(stage.dataValues.count) || 0,
        avgValue: parseFloat(stage.dataValues.avgValue) || 0,
        totalValue: parseFloat(stage.dataValues.totalValue) || 0,
        minValue: parseFloat(stage.dataValues.minValue) || 0,
        maxValue: parseFloat(stage.dataValues.maxValue) || 0
      }))
    };
  }

  async getUserPerformance(dateRange, filters) {
    const whereClause = {};
    if (dateRange?.start && dateRange?.end) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
      };
    }

    // User performance metrics
    const userStats = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email'
      ],
      include: [
        {
          model: Opportunity,
          as: 'assignedOpportunities',
          attributes: [
            [fn('COUNT', col('assignedOpportunities.id')), 'totalOpportunities'],
            [fn('SUM', col('assignedOpportunities.value')), 'totalValue'],
            [fn('AVG', col('assignedOpportunities.value')), 'avgDealSize']
          ],
          where: whereClause,
          required: false
        },
        {
          model: Contact,
          as: 'assignedContacts',
          attributes: [
            [fn('COUNT', col('assignedContacts.id')), 'totalContacts']
          ],
          where: whereClause,
          required: false
        },
        {
          model: Activity,
          as: 'assignedActivities',
          attributes: [
            [fn('COUNT', col('assignedActivities.id')), 'totalActivities'],
            [fn('COUNT', literal('CASE WHEN assignedActivities.completed_at IS NOT NULL THEN 1 END')), 'completedActivities']
          ],
          where: whereClause,
          required: false
        }
      ],
      group: ['User.id'],
      raw: false
    });

    // Won deals by user
    const wonDeals = await User.findAll({
      attributes: [
        'id',
        [fn('COUNT', col('assignedOpportunities.id')), 'wonDeals'],
        [fn('SUM', col('assignedOpportunities.value')), 'wonValue']
      ],
      include: [{
        model: Opportunity,
        as: 'assignedOpportunities',
        attributes: [],
        where: {
          ...whereClause,
          actualCloseDate: { [Op.not]: null }
        },
        include: [{
          model: PipelineStage,
          as: 'stage',
          where: { 
            [Op.or]: [
              { name: { [Op.iLike]: '%won%' } },
              { name: { [Op.iLike]: '%closed%' } },
              { probabilityPercent: 100 }
            ]
          },
          required: true
        }],
        required: false
      }],
      group: ['User.id'],
      raw: true
    });

    const wonDealsMap = {};
    wonDeals.forEach(user => {
      wonDealsMap[user.id] = {
        wonDeals: parseInt(user.wonDeals) || 0,
        wonValue: parseFloat(user.wonValue) || 0
      };
    });

    return {
      userPerformance: userStats.map(user => {
        const opportunities = user.assignedOpportunities?.[0]?.dataValues || {};
        const contacts = user.assignedContacts?.[0]?.dataValues || {};
        const activities = user.assignedActivities?.[0]?.dataValues || {};
        const won = wonDealsMap[user.id] || { wonDeals: 0, wonValue: 0 };

        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          metrics: {
            totalOpportunities: parseInt(opportunities.totalOpportunities) || 0,
            totalValue: parseFloat(opportunities.totalValue) || 0,
            avgDealSize: parseFloat(opportunities.avgDealSize) || 0,
            totalContacts: parseInt(contacts.totalContacts) || 0,
            totalActivities: parseInt(activities.totalActivities) || 0,
            completedActivities: parseInt(activities.completedActivities) || 0,
            activityCompletionRate: activities.totalActivities > 0 
              ? Math.round((activities.completedActivities / activities.totalActivities) * 100) 
              : 0,
            wonDeals: won.wonDeals,
            wonValue: won.wonValue,
            winRate: opportunities.totalOpportunities > 0 
              ? Math.round((won.wonDeals / opportunities.totalOpportunities) * 100) 
              : 0
          }
        };
      })
    };
  }

  /**
   * Get pipeline forecasting data
   */
  async getPipelineForecast(req, res) {
    try {
      const {
        period = 'quarter',
        userId,
        stageId
      } = req.query;

      // Calculate forecast period
      const now = new Date();
      let forecastEnd;
      
      switch (period) {
        case 'month':
          forecastEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          forecastEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
          break;
        case 'year':
          forecastEnd = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          forecastEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      }

      const whereClause = {
        expectedCloseDate: {
          [Op.between]: [now, forecastEnd]
        }
      };

      if (userId) {
        whereClause.assignedTo = userId;
      }

      if (stageId) {
        whereClause.stageId = stageId;
      }

      // Get opportunities expected to close in forecast period
      const forecastOpportunities = await Opportunity.findAll({
        where: whereClause,
        include: [
          {
            model: PipelineStage,
            as: 'stage',
            attributes: ['id', 'name', 'probabilityPercent']
          },
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
        ],
        order: [['expectedCloseDate', 'ASC']]
      });

      // Calculate weighted forecast
      const forecast = {
        totalOpportunities: forecastOpportunities.length,
        totalValue: 0,
        weightedValue: 0,
        bestCase: 0,
        worstCase: 0,
        byStage: {},
        byMonth: {}
      };

      forecastOpportunities.forEach(opp => {
        const value = parseFloat(opp.value) || 0;
        const probability = opp.stage?.probabilityPercent || 0;
        const weightedValue = (value * probability) / 100;

        forecast.totalValue += value;
        forecast.weightedValue += weightedValue;
        forecast.bestCase += probability >= 75 ? value : 0;
        forecast.worstCase += probability >= 90 ? value : 0;

        // Group by stage
        const stageName = opp.stage?.name || 'Unknown';
        if (!forecast.byStage[stageName]) {
          forecast.byStage[stageName] = {
            count: 0,
            totalValue: 0,
            weightedValue: 0,
            probability: probability
          };
        }
        forecast.byStage[stageName].count++;
        forecast.byStage[stageName].totalValue += value;
        forecast.byStage[stageName].weightedValue += weightedValue;

        // Group by month
        const month = opp.expectedCloseDate?.getMonth();
        const year = opp.expectedCloseDate?.getFullYear();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!forecast.byMonth[monthKey]) {
          forecast.byMonth[monthKey] = {
            count: 0,
            totalValue: 0,
            weightedValue: 0
          };
        }
        forecast.byMonth[monthKey].count++;
        forecast.byMonth[monthKey].totalValue += value;
        forecast.byMonth[monthKey].weightedValue += weightedValue;
      });

      res.json({
        success: true,
        data: {
          period,
          forecastPeriod: {
            start: now.toISOString().split('T')[0],
            end: forecastEnd.toISOString().split('T')[0]
          },
          forecast,
          opportunities: forecastOpportunities.map(opp => ({
            id: opp.id,
            name: opp.name,
            value: opp.value,
            probability: opp.stage?.probabilityPercent,
            expectedCloseDate: opp.expectedCloseDate,
            contact: opp.contact ? `${opp.contact.firstName} ${opp.contact.lastName}` : null,
            assignedUser: opp.assignedUser ? `${opp.assignedUser.firstName} ${opp.assignedUser.lastName}` : null,
            stage: opp.stage?.name
          }))
        }
      });
    } catch (error) {
      console.error('Pipeline forecast error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating pipeline forecast'
        }
      });
    }
  }
}

module.exports = new AnalyticsController();