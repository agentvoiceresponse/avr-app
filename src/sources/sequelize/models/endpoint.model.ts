import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../index.js';

type Endpoint = {
  id: number;
  name: string;
  secret: string;
  internal: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EndpointCreationAttributes = Optional<Endpoint, 'id'>;

export class EndpointModel extends Model<Endpoint, EndpointCreationAttributes> {
  declare id: number;
  declare name: string;
  declare secret: string;
  declare internal: number;
  declare description: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

EndpointModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value: string) {
        this.setDataValue('name', value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
      },
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    internal: {
      type: DataTypes.VIRTUAL,
      get() {
        return (+process.env.ENDPOINT_INTERNAL_START || 999) + Number(this.id);
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
    tableName: 'endpoints',
    modelName: 'endpoints',
  },
);
