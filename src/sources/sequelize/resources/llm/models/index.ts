import { models as openRouterModels } from './openrouter.js';
import { models as openaiModels } from './openai.js';

export const allModels = [...openRouterModels, ...openaiModels];
