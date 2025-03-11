import { models as deepgramModels } from './deepgram.js';
import { models as googleModels } from './google.js';

export const allModels = [...deepgramModels, ...googleModels];
