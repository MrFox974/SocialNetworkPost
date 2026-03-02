const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Speech = sequelize.define(
  'speech',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'projects', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      allowNull: false,
    },
    in_selection: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    hook: { type: DataTypes.TEXT, allowNull: false },
    hook_type: { type: DataTypes.STRING(100), allowNull: true },
    context: { type: DataTypes.TEXT, allowNull: false },
    demo: { type: DataTypes.TEXT, allowNull: false },
    cta: { type: DataTypes.TEXT, allowNull: false },
    pillar: { type: DataTypes.STRING(100), allowNull: true },
    tiktok: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
    instagram: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
    youtube: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
    linkedin: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
    twitter: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
    score: { type: DataTypes.INTEGER, allowNull: true },
    published_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'speeches',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Speech;
