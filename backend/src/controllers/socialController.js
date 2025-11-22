const { SocialProfile, Contact } = require('../models');
const { Op } = require('sequelize');

class SocialController {
  /**
   * Get social profiles for a contact or all profiles
   */
  async getSocialProfiles(req, res) {
    try {
      const { contactId, platform } = req.query;

      const where = {};
      if (contactId) {
        where.contactId = contactId;
      }
      if (platform) {
        where.platform = platform;
      }

      const profiles = await SocialProfile.findAll({
        where,
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      res.json({
        success: true,
        data: profiles
      });
    } catch (error) {
      console.error('Get social profiles error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching social profiles'
        }
      });
    }
  }

  /**
   * Create or update social profile
   */
  async createSocialProfile(req, res) {
    try {
      const {
        contactId,
        platform,
        profileUrl,
        username,
        profileData,
        followersCount,
        followingCount,
        postCount,
        engagementRate
      } = req.body;

      // Check if profile already exists
      const existingProfile = await SocialProfile.findOne({
        where: { contactId, platform }
      });

      let profile;
      if (existingProfile) {
        // Update existing profile
        await existingProfile.update({
          profileUrl,
          username,
          profileData,
          followerCount,
          connectionStatus,
          lastActivityDate: new Date()
        });
        profile = existingProfile;
      } else {
        // Create new profile
        profile = await SocialProfile.create({
          contactId,
          platform,
          profileUrl,
          username,
          profileData,
          followersCount,
          followingCount,
          postCount,
          engagementRate
        });
      }

      const profileWithContact = await SocialProfile.findByPk(profile.id, {
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.status(existingProfile ? 200 : 201).json({
        success: true,
        data: profileWithContact
      });
    } catch (error) {
      console.error('Create social profile error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid social profile data',
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
          message: 'An error occurred while creating social profile'
        }
      });
    }
  }

  /**
   * Social media lead discovery (mock implementation)
   */
  async discoverLeads(req, res) {
    try {
      const {
        keywords = [],
        platforms = ['linkedin'],
        filters = {},
        limit = 50
      } = req.body;

      // This is a mock implementation
      // In a real application, you would integrate with actual social media APIs
      
      const mockLeads = [
        {
          platform: 'linkedin',
          profileUrl: 'https://linkedin.com/in/johndoe',
          name: 'John Doe',
          jobTitle: 'CFO',
          company: 'Finance Corp',
          location: 'Ho Chi Minh City',
          score: 85,
          matchReasons: ['mentioned "digital transformation"', 'works in finance'],
          recentActivity: 'Posted about fintech trends',
          profileData: {
            connectionsCount: 500,
            experienceYears: 10,
            industry: 'Financial Services'
          }
        },
        {
          platform: 'linkedin',
          profileUrl: 'https://linkedin.com/in/janesmith',
          name: 'Jane Smith',
          jobTitle: 'CTO',
          company: 'Tech Innovations',
          location: 'Ho Chi Minh City',
          score: 78,
          matchReasons: ['mentioned "cloud migration"', 'tech leadership role'],
          recentActivity: 'Shared article about cloud architecture',
          profileData: {
            connectionsCount: 750,
            experienceYears: 12,
            industry: 'Information Technology'
          }
        },
        {
          platform: 'twitter',
          profileUrl: 'https://twitter.com/techleader',
          name: 'Mike Johnson',
          jobTitle: 'VP Engineering',
          company: 'StartupTech',
          location: 'Vietnam',
          score: 72,
          matchReasons: ['tweeted about "consulting services"'],
          recentActivity: 'Tweeted about team scaling challenges',
          profileData: {
            followersCount: 2500,
            tweetsCount: 1200,
            verified: false
          }
        }
      ];

      // Filter based on keywords (mock logic)
      let filteredLeads = mockLeads;
      if (keywords.length > 0) {
        filteredLeads = mockLeads.filter(lead => 
          keywords.some(keyword => 
            lead.matchReasons.some(reason => 
              reason.toLowerCase().includes(keyword.toLowerCase())
            )
          )
        );
      }

      // Filter by platform
      if (platforms.length > 0) {
        filteredLeads = filteredLeads.filter(lead => 
          platforms.includes(lead.platform)
        );
      }

      // Apply location filter
      if (filters.location) {
        filteredLeads = filteredLeads.filter(lead => 
          lead.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }

      // Apply industry filter
      if (filters.industry) {
        filteredLeads = filteredLeads.filter(lead => 
          lead.profileData.industry && 
          lead.profileData.industry.toLowerCase().includes(filters.industry.toLowerCase())
        );
      }

      // Limit results
      const results = filteredLeads.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          leads: results,
          totalFound: results.length,
          searchCriteria: {
            keywords,
            platforms,
            filters
          },
          note: 'This is a mock implementation. In production, this would integrate with actual social media APIs.'
        }
      });
    } catch (error) {
      console.error('Discover leads error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during lead discovery'
        }
      });
    }
  }

  /**
   * Analyze social media posts (mock implementation)
   */
  async analyzePosts(req, res) {
    try {
      const { profileId, platform, dateRange } = req.body;

      // Mock analysis results
      const analysisResults = {
        profileId,
        platform,
        dateRange,
        summary: {
          totalPosts: 45,
          avgEngagementRate: 3.8,
          topKeywords: ['technology', 'innovation', 'growth', 'team', 'leadership'],
          sentimentDistribution: {
            positive: 67,
            neutral: 28,
            negative: 5
          }
        },
        recentPosts: [
          {
            id: 'post_1',
            content: 'Excited to announce our new digital transformation initiative...',
            engagementMetrics: {
              likes: 45,
              comments: 12,
              shares: 8
            },
            sentiment: 'positive',
            keywords: ['digital transformation', 'innovation'],
            postedAt: '2024-01-15T10:30:00Z'
          },
          {
            id: 'post_2',
            content: 'Looking for the right consulting partner to help with our cloud migration...',
            engagementMetrics: {
              likes: 32,
              comments: 18,
              shares: 5
            },
            sentiment: 'neutral',
            keywords: ['consulting', 'cloud migration'],
            postedAt: '2024-01-10T14:20:00Z'
          }
        ],
        insights: [
          'High engagement on technology-related posts',
          'Frequently mentions business growth topics',
          'Active in professional discussions',
          'Good potential for B2B outreach'
        ]
      };

      res.json({
        success: true,
        data: analysisResults
      });
    } catch (error) {
      console.error('Analyze posts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during post analysis'
        }
      });
    }
  }

  /**
   * Update social profile metrics
   */
  async updateProfileMetrics(req, res) {
    try {
      const { id } = req.params;
      const {
        followersCount,
        followingCount,
        postCount,
        engagementRate,
        profileData
      } = req.body;

      const profile = await SocialProfile.findByPk(id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Social profile not found'
          }
        });
      }

      await profile.update({
        followerCount: followersCount !== undefined ? followersCount : profile.followerCount,
        connectionStatus: connectionStatus !== undefined ? connectionStatus : profile.connectionStatus,
        profileData: profileData ? { ...profile.profileData, ...profileData } : profile.profileData,
        lastActivityDate: new Date()
      });

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Update profile metrics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating profile metrics'
        }
      });
    }
  }

  /**
   * Delete social profile
   */
  async deleteSocialProfile(req, res) {
    try {
      const { id } = req.params;

      const profile = await SocialProfile.findByPk(id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Social profile not found'
          }
        });
      }

      await profile.destroy();

      res.json({
        success: true,
        message: 'Social profile deleted successfully'
      });
    } catch (error) {
      console.error('Delete social profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting social profile'
        }
      });
    }
  }
}

module.exports = new SocialController();