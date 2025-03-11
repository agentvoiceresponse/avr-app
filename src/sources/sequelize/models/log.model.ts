import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

type Log = {
  id: number;
  action: string;
  resource: string;
  userId: number;
  recordId: number;
  recordTitle: string;
  difference: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LogCreationAttributes = Optional<Log, 'id'>;

export class LogModel extends Model<Log, LogCreationAttributes> {
  declare id: number;
  declare recordId: number;
  declare recordTitle: string | null;
  declare difference: Record<string, unknown> | null;
  declare action: string;
  declare resource: string;
  declare userId: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

LogModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    action: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    resource: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recordTitle: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    difference: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'logs',
    modelName: 'log',
  },
);
