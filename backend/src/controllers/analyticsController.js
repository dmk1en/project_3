const { 
  User, 
  Company, 
  Contact, 
  Opportunity, 
  Activity, 
  PipelineStage 
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
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
        // Extract actual date values for the query
        let queryStartDate, queryEndDate;
        
        if (startDate && endDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(endDate);
        } else {
          // Use the same logic as dateRange calculation
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
          
          queryStartDate = start.toDate();
          queryEndDate = now.toDate();
        }

        // Use raw SQL query to avoid Sequelize complexity issues
        const performanceQuery = `
          SELECT 
            u.id as "userId",
            u.first_name as "firstName", 
            u.last_name as "lastName",
            COUNT(o.id) as "totalDeals",
            COALESCE(SUM(o.value), 0) as "totalRevenue"
          FROM users u
          LEFT JOIN opportunities o ON u.id = o.assigned_user_id 
            AND o.deleted_at IS NULL 
            AND o.created_at >= :startDate
            AND o.created_at <= :endDate
          LEFT JOIN pipeline_stages ps ON o.pipeline_stage_id = ps.id 
            AND ps.deleted_at IS NULL 
            AND ps.name ILIKE '%won%'
          WHERE u.deleted_at IS NULL
          GROUP BY u.id, u.first_name, u.last_name
          ORDER BY "totalRevenue" DESC
          LIMIT 5
        `;

        const performanceData = await sequelize.query(performanceQuery, {
          replacements: { 
            startDate: queryStartDate.toISOString(),
            endDate: queryEndDate.toISOString()
          },
          type: sequelize.QueryTypes.SELECT
        });

        topPerformers = performanceData.map(user => ({
          userId: user.userId,
          name: `${user.firstName} ${user.lastName}`,
          totalDeals: parseInt(user.totalDeals) || 0,
          totalRevenue: parseFloat(user.totalRevenue) || 0
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
        order: [[literal('"totalLeads"'), 'DESC']],
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

      // Build date range filter
      const whereClause = {};
      if (dateRange?.start && dateRange?.end) {
        whereClause.createdAt = {
          [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
        };
      }

      let data = {};

      switch (reportType) {
        case 'activity_summary':
          // Get activity summary data
          const activities = await Activity.findAll({
            attributes: [
              'type',
              [fn('COUNT', col('id')), 'count'],
              [fn('COUNT', literal('CASE WHEN is_completed = true THEN 1 END')), 'completed']
            ],
            where: whereClause,
            group: ['type'],
            raw: true
          });

          data.activities = activities.map(a => ({
            type: a.type,
            count: parseInt(a.count),
            completed: parseInt(a.completed),
            completionRate: a.count > 0 ? Math.round((a.completed / a.count) * 100) : 0
          }));

          data.summary = {
            totalActivities: activities.reduce((sum, a) => sum + parseInt(a.count), 0),
            completedActivities: activities.reduce((sum, a) => sum + parseInt(a.completed), 0),
            overallCompletionRate: 0
          };

          if (data.summary.totalActivities > 0) {
            data.summary.overallCompletionRate = Math.round(
              (data.summary.completedActivities / data.summary.totalActivities) * 100
            );
          }
          break;

        case 'pipeline_analysis':
          // Get pipeline velocity and stage analysis
          const pipelineStages = await PipelineStage.findAll({
            attributes: [
              'id',
              'name',
              'displayOrder',
              'probabilityPercent',
              [fn('COUNT', col('opportunities.id')), 'opportunityCount'],
              [fn('AVG', col('opportunities.value')), 'avgValue'],
              [fn('SUM', col('opportunities.value')), 'totalValue']
            ],
            include: [{
              model: Opportunity,
              as: 'opportunities',
              attributes: [],
              where: whereClause,
              required: false
            }],
            group: ['PipelineStage.id'],
            order: [['displayOrder', 'ASC']],
            raw: true
          });

          data.pipelineAnalysis = pipelineStages.map(stage => ({
            stageId: stage.id,
            name: stage.name,
            displayOrder: stage.displayOrder,
            probabilityPercent: stage.probabilityPercent,
            opportunityCount: parseInt(stage.opportunityCount) || 0,
            avgValue: parseFloat(stage.avgValue) || 0,
            totalValue: parseFloat(stage.totalValue) || 0
          }));

          // Stage movements (activity-based transitions)
          const stageMovements = await Activity.findAll({
            attributes: [
              'subject',
              [fn('COUNT', col('Activity.id')), 'movements']
            ],
            where: {
              type: ['note', 'meeting', 'call'],
              subject: { [Op.iLike]: '%stage%' },
              ...whereClause
            },
            group: ['subject'],
            raw: true
          });

          data.stageMovements = stageMovements.map(movement => ({
            transition: movement.subject,
            count: parseInt(movement.movements)
          }));
          break;

        case 'user_performance':
          // Get user performance metrics using raw SQL for better reliability
          const userPerformanceQuery = `
            SELECT 
              u.id as "userId",
              u.first_name as "firstName",
              u.last_name as "lastName", 
              u.email,
              COUNT(DISTINCT o.id) as "totalOpportunities",
              COALESCE(SUM(o.value), 0) as "totalValue",
              COALESCE(AVG(o.value), 0) as "avgDealSize",
              COUNT(DISTINCT c.id) as "totalContacts",
              COUNT(DISTINCT a.id) as "totalActivities",
              COUNT(DISTINCT CASE WHEN a.is_completed = true THEN a.id END) as "completedActivities",
              COUNT(DISTINCT CASE WHEN ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' OR ps.probability_percent = 100 THEN o.id END) as "wonDeals"
            FROM users u
            LEFT JOIN opportunities o ON u.id = o.assigned_user_id 
              AND o.deleted_at IS NULL 
              ${dateRange?.start ? `AND o.created_at >= '${dateRange.start}'` : ''}
              ${dateRange?.end ? `AND o.created_at <= '${dateRange.end}'` : ''}
            LEFT JOIN contacts c ON u.id = c.assigned_to 
              AND c.deleted_at IS NULL
              ${dateRange?.start ? `AND c.created_at >= '${dateRange.start}'` : ''}
              ${dateRange?.end ? `AND c.created_at <= '${dateRange.end}'` : ''}
            LEFT JOIN activities a ON u.id = a.user_id 
              AND a.deleted_at IS NULL
              ${dateRange?.start ? `AND a.created_at >= '${dateRange.start}'` : ''}
              ${dateRange?.end ? `AND a.created_at <= '${dateRange.end}'` : ''}
            LEFT JOIN pipeline_stages ps ON o.pipeline_stage_id = ps.id 
              AND ps.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY "totalValue" DESC
          `;

          const userPerformanceResults = await sequelize.query(userPerformanceQuery, {
            type: sequelize.QueryTypes.SELECT
          });

          data.userPerformance = userPerformanceResults.map(user => ({
            userId: user.userId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            metrics: {
              totalOpportunities: parseInt(user.totalOpportunities) || 0,
              totalValue: parseFloat(user.totalValue) || 0,
              avgDealSize: parseFloat(user.avgDealSize) || 0,
              totalContacts: parseInt(user.totalContacts) || 0,
              totalActivities: parseInt(user.totalActivities) || 0,
              completedActivities: parseInt(user.completedActivities) || 0,
              activityCompletionRate: user.totalActivities > 0 
                ? Math.round((user.completedActivities / user.totalActivities) * 100) 
                : 0,
              wonDeals: parseInt(user.wonDeals) || 0,
              winRate: user.totalOpportunities > 0 
                ? Math.round((user.wonDeals / user.totalOpportunities) * 100) 
                : 0
            }
          }));
          break;

        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REPORT_TYPE',
              message: 'Invalid report type specified. Valid types: activity_summary, pipeline_analysis, user_performance'
            }
          });
      }

      res.json({
        success: true,
        data: {
          reportType,
          generatedAt: new Date().toISOString(),
          dateRange: dateRange || { start: null, end: null },
          ...data
        }
      });
    } catch (error) {
      console.error('Custom report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating custom report',
          details: error.message
        }
      });
    }
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