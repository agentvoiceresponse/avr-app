import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../index.js';

type LLM = {
  id: number;
  name: string;
  provider: 'openai' | 'openai-assistant' | 'openrouter';
  key: string;
  systemPrompt: string;
  model: string;
  assistant: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LLMCreationAttributes = Optional<LLM, 'id'>;

export class LLMModel extends Model<LLM, LLMCreationAttributes> {
  declare id: number;
  declare name: string;
  declare provider: 'openai' | 'openai-assistant' | 'openrouter';
  declare key: string;
  declare systemPrompt: string;
  declare model: string;
  declare assistant: string;
  declare description: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

LLMModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM('openai', 'openai-assistant', 'openrouter'),
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    systemPrompt: {
      type: DataTypes.TEXT,
    },
    model: {
      type: DataTypes.STRING,
    },
    assistant: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: 'llm',
    modelName: 'llm',
  },
);
