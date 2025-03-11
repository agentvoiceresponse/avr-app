import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../index.js';

type TTS = {
  id: number;
  name: string;
  provider: 'deepgram' | 'google';
  voice: string;
  model: string;
  gender: 'FEMALE' | 'MALE';
  speekingRate: number;
  key: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TTSCreationAttributes = Optional<TTS, 'id'>;

export class TTSModel extends Model<TTS, TTSCreationAttributes> {
  declare id: number;
  declare name: string;
  declare provider: 'deepgram' | 'google';
  declare voice: string;
  declare model: string;
  declare gender: 'FEMALE' | 'MALE';
  declare speekingRate: number;
  declare key: string;
  declare description: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TTSModel.init(
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
    voice: {
      type: DataTypes.STRING,
    },
    model: {
      type: DataTypes.STRING,
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('FEMALE', 'MALE'),
      defaultValue: 'FEMALE',
    },
    speekingRate: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
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
    tableName: 'tts',
    modelName: 'tts',
  },
);
