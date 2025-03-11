import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

type Session = {
  sid: number;
  expires: Date;
  data: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionCreationAttributes = Optional<Session, 'sid'>;

export class SessionModel extends Model<Session, SessionCreationAttributes> {
  declare sid: number;
  declare expires: Date;
  declare data: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

SessionModel.init(
  {
    sid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    modelName: 'session',
  },
);
