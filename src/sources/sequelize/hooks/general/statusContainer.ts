import { ActionRequest, ActionResponse, After } from 'adminjs';
import { inspectContainer } from '../../utils/docker.js';

const updateRecord = (name: string) => async (record) => {
  const containerName = `avr-${name}-${record.params.id}`;
  const port = (+process.env.CORE_PORT_START || 5000) + Number(record.params.id);
  record.params.did = port;
  try {
    const inspect = await inspectContainer(containerName);
    record.params.status = inspect.State.Status;
  } catch (error) {
    record.params.status = 'no such container';
    console.error(`Error inspecting container ${containerName}:`, error.message);
  }
};

export const statusContainer =
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
