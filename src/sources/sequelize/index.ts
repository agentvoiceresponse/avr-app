import { Sequelize } from 'sequelize';
import { ErrorTypeEnum, ValidationError } from 'adminjs';
import { ASRModel, LLMModel, CoreModel, TTSModel } from './models/index.js';

const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    dialect: 'mysql',
    logging: false,
  },
);

sequelize.query = async function () {
  try {
    // eslint-disable-next-line prefer-rest-params
    return await Sequelize.prototype.query.apply(this, arguments);
  } catch (err: any) {
    console.log('Error executing query:', err.message);
    throw new ValidationError(
      {
        id: {
          type: ErrorTypeEnum.Validation,
          message: 'Error executing query',
        },
      },
      {
        type: ErrorTypeEnum.Validation,
        message: err.message,
      },
    );
  }
};

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    setupAssociations();

    await sequelize.sync({ force: false });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
  }
}

function setupAssociations() {
  ASRModel.hasMany(CoreModel, { foreignKey: 'asrId', onDelete: 'RESTRICT' });
  CoreModel.belongsTo(ASRModel, { foreignKey: 'asrId' });

  LLMModel.hasMany(CoreModel, { foreignKey: 'llmId', onDelete: 'RESTRICT' });
  CoreModel.belongsTo(LLMModel, { foreignKey: 'llmId' });

  TTSModel.hasMany(CoreModel, { foreignKey: 'ttsId', onDelete: 'RESTRICT' });
  CoreModel.belongsTo(TTSModel, { foreignKey: 'ttsId' });
}

initializeDatabase();

export { sequelize };
