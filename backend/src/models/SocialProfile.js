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
  followerCount: {
    type: DataTypes.INTEGER,
    field: 'follower_count',
    defaultValue: 0
  },
  connectionStatus: {
    type: DataTypes.ENUM('none', 'pending', 'connected', 'following'),
    field: 'connection_status',
    defaultValue: 'none'
  },
  lastActivityDate: {
    type: DataTypes.DATE,
    field: 'last_activity_date'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    field: 'is_verified',
    defaultValue: false
  }
}, {
  tableName: 'social_profiles',
  indexes: [
    {
      fields: ['contact_id']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['connection_status']
    },
    {
      unique: true,
      fields: ['profile_url']
    }
  ]
});

module.exports = SocialProfile;