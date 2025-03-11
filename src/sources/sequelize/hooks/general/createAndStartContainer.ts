import { ActionRequest, ActionResponse, After } from 'adminjs';
import { createAndStartContainer as createAndStart } from '../../utils/docker.js';
import { getCoreConfig, getAsrConfig, getLlmConfig, getTtsConfig } from './config.js';

export const createAndStartContainer =
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
      const container = await createAndStart(containerName, config);
      console.log(`Container ${container.id} started successfully!`);
    } catch (err) {
      console.error('Error starting the container: ' + err.message);
    }

    return response;
  };
