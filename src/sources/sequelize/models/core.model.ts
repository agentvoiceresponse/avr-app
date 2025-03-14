import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

type Core = {
  id: number;
  name: string;
  asrId: number;
  llmId: number;
  ttsId: number;
  firstMessage: string;
  stopAgent: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CoreCreationAttributes = Optional<Core, 'id'>;

export class CoreModel extends Model<Core, CoreCreationAttributes> {
  declare id: number;
  declare name: string;
  declare asrId: number;
  declare llmId: number;
  declare ttsId: number;
  declare firstMessage: string;
  declare stopAgent: boolean;
  declare description: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

CoreModel.init(
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
    asrId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    llmId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ttsId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    firstMessage: {
      type: DataTypes.TEXT,
    },
    stopAgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'core',
    modelName: 'core',
  },
);
