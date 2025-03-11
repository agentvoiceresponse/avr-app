import { ActionRequest, ActionResponse, After } from 'adminjs';
import { ensureContainer as ensure } from '../../utils/docker.js';
import { getCoreConfig, getAsrConfig, getLlmConfig, getTtsConfig } from './config.js';

export const ensureContainer =
  (name: string): After<ActionResponse> =>
  async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { record, notice } = response;

    if (method !== 'post') return response;

    if (notice.type == 'error') return response;

    try {
      let containerName, config;
      switch (name) {
        case 'core':
          ({ containerName, config } = getCoreConfig(record.params));
          break;
        case 'asr':
          ({ containerName, config } = getAsrConfig(record.params));
          break;
        case 'llm':
          ({ containerName, config } = getLlmConfig(record.params));
          break;
        case 'tts':
          ({ containerName, config } = getTtsConfig(record.params));
          break;
        default:
          throw new Error(`Unknown name: ${name}`);
      }
      await ensure(containerName, config);
      console.log('Container updated successfully!');
    } catch (err) {
      console.error('Error updating the container: ' + err.message);
    }

    return response;
  };
