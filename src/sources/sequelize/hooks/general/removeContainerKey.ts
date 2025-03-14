import path from 'path';
import * as url from 'url';
import fs from 'fs';

import { ActionRequest, ActionResponse, After } from 'adminjs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const removeContainerKey =
  (name: string): After<ActionResponse> =>
  async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { record, notice } = response;

    if (method !== 'post') return response;

    if (notice.type == 'error') return response;

    const { id } = record.params;

    try {
      const googleCredentialsPath = path.join(__dirname, '../../../../../keys', `avr-${name}-${id}.json`);
      if (fs.existsSync(googleCredentialsPath)) {
        fs.unlinkSync(googleCredentialsPath);
      }
    } catch (error) {
      console.error('Error delete key: ' + error.message);
    }

    return response;
  };
