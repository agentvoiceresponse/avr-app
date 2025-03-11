import { type PageHandler } from 'adminjs';
import { ASRModel, CoreModel, LLMModel, TTSModel } from '../sources/sequelize/models/index.js';
import { DASHBOARD } from './components.bundler.js';

export const dashboardOptions: {
  handler?: PageHandler;
  component?: string;
} = {
  component: DASHBOARD,
  handler: async (req, res, context) => {
    const cores = await CoreModel.count();
    const asr = await ASRModel.count();
    const llm = await LLMModel.count();
    const tts = await TTSModel.count();
    res.json({
      cores,
      asr,
      llm,
      tts,
    });
  },
};
