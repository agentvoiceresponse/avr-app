import { ActionRequest, ActionResponse, After } from 'adminjs';
import { logContainer as log } from '../../utils/docker.js';

const updateRecord = (name: string) => async (record) => {
  const containerName = `avr-${name}-${record.params.id}`;
  try {
    const logs = await log(containerName);
    record.params.logs = logs.toString();
  } catch (error) {
    record.params.logs = 'no logs to show';
    console.error(`Error inspecting container ${containerName}:`, error.message);
  }
};

export const logContainer =
  (name: string): After<ActionResponse> =>
  async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { record } = response;
    if (method !== 'get') return response;

    if (response.records) {
      await Promise.all(response.records.map(updateRecord(name)));
    } else if (record) {
      await updateRecord(name)(record);
    }

    return response;
  };
