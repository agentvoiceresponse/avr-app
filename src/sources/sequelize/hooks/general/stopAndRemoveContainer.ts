import { ActionRequest, ActionResponse, After } from 'adminjs';
import { stopAndRemoveContainer as stopAndRemove } from '../../utils/docker.js';

export const stopAndRemoveContainer =
  (name: string): After<ActionResponse> =>
  async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { record, notice } = response;

    if (method !== 'post') return response;

    if (notice.type == 'error') return response;

    const { id } = record.params;

    try {
      const coreName = `avr-${name}-${id}`;
      stopAndRemove(coreName); // Don't wait for it to finish
    } catch (error) {
      console.error('Error stopping the container: ' + error.message);
    }

    return response;
  };
