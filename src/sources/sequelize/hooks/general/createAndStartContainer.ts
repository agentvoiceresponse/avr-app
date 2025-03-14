import path from 'path';
import * as url from 'url';
import fs from 'fs';
import tarStream from 'tar-stream';
import tarFs from 'tar-fs';

import { ActionRequest, ActionResponse, After } from 'adminjs';
import { createAndStartContainer as createAndStart } from '../../utils/docker.js';
import { getCoreConfig, getAsrConfig, getLlmConfig, getTtsConfig } from './config.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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

      if (record.params.provider == 'google') {
        const googleCredentialsPath = path.join(__dirname, '../../../../../keys', `${containerName}.json`);
        const pack = tarStream.pack();
        pack.entry({ name: 'google.json' }, fs.readFileSync(googleCredentialsPath));
        pack.finalize();
        await container.putArchive(pack, { path: '/usr/src/app' });
        console.log(`Container ${container.id} credentials copied successfully!`);
      }

      if (record.params.provider == 'openai-assistant') {
        const functionsPath = path.join(__dirname, '../../../../../functions');
        const pack = tarFs.pack(functionsPath);
        await container.putArchive(pack, { path: '/usr/src/app/functions' });
        console.log(`Container ${container.id} functions copied successfully!`);
      }
    } catch (err) {
      console.error('Error starting the container: ' + err.message);
    }

    return response;
  };
