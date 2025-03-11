import { models as deepgramModels } from './deepgram.js';
import { models as googleModels } from './google.js';
import { models as elevenlabsModels } from './elevenlabs.js';

export const allModels = [...deepgramModels, ...googleModels, ...elevenlabsModels];
