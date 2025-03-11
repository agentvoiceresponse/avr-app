import { ActionRequest, Before, ErrorTypeEnum, RecordError, ValidationError } from 'adminjs';
import { CoreModel } from '../../models/core.model.js';

export const validateKey =
  (key: string): Before =>
  async (request: ActionRequest): Promise<ActionRequest> => {
    const { params } = request;
    const { recordId } = params;

    if (!recordId) {
      throw new ValidationError(
        {},
        {
          type: ErrorTypeEnum.Validation,
          message: 'Record ID is missing in the request parameters.',
        },
      );
    }

    const cores = await CoreModel.findAll({ attributes: ['id', 'name', key], where: { [key]: recordId } });

    if (cores.length > 0) {
      const error: RecordError = {
        type: ErrorTypeEnum.Validation,
        message:
          'The following entity are still associated with these AI Agents: ' +
          cores.map((core) => core.name).join(', '),
      };
      throw new ValidationError({}, error);
    }

    return request;
  };
