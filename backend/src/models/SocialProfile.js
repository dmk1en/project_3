const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SocialProfile = sequelize.define('SocialProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  platform: {
    type: DataTypes.ENUM('linkedin', 'twitter', 'facebook', 'instagram'),
    allowNull: false
  },
  profileUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'profile_url',
    validate: {
      isUrl: true
    }
  },
  username: {
    type: DataTypes.STRING(100)
  },
  profileData: {
    type: DataTypes.JSONB,
    field: 'profile_data'
  },
  followersCount: {
    type: DataTypes.INTEGER,
    field: 'followers_count'
  },
  followingCount: {
    type: DataTypes.INTEGER,
    field: 'following_count'
  },
  postCount: {
    type: DataTypes.INTEGER,
    field: 'post_count'
  },
  engagementRate: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'engagement_rate'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    field: 'last_updated',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'social_profiles',
  indexes: [
    {
      unique: true,
      fields: ['contact_id', 'platform']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['username']
    }
  ]
});

module.exports = SocialProfile;