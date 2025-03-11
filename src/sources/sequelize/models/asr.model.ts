import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../index.js';

type ASR = {
  id: number;
  name: string;
  provider: 'deepgram' | 'google';
  language: string;
  model: string;
  key: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ASRCreationAttributes = Optional<ASR, 'id'>;

export class ASRModel extends Model<ASR, ASRCreationAttributes> {
  declare id: number;
  declare name: string;
  declare provider: 'deepgram' | 'google';
  declare language: string;
  declare model: string;
  declare key: string;
  declare description: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ASRModel.init(
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
      type: DataTypes.ENUM('deepgram', 'google'),
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: 'asr',
    modelName: 'asr',
  },
);
