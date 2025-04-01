import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

type Core = {
  id: number;
  name: string;
  tenant: string;
  asrId: number;
  llmId: number;
  ttsId: number;
  firstMessage: string;
  stopAgent: boolean;
  did: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CoreCreationAttributes = Optional<Core, 'id'>;

export class CoreModel extends Model<Core, CoreCreationAttributes> {
  declare id: number;
  declare name: string;
  declare tenant: string;
  declare asrId: number;
  declare llmId: number;
  declare ttsId: number;
  declare firstMessage: string;
  declare stopAgent: boolean;
  declare did: number;
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
    tenant: {
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
    did: {
      type: DataTypes.VIRTUAL,
      get() {
        return (+process.env.CORE_PORT_START || 5000) + Number(this.id);
      },
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
    indexes: [
      {
        unique: false,
        fields: ['tenant'],
      },
    ],
  },
);
