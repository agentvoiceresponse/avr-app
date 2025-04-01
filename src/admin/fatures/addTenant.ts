import { buildFeature, FeatureType, ActionRequest, Before, ErrorTypeEnum, ValidationError } from 'adminjs';
import { Model } from 'sequelize';

interface ExtendedActionRequest extends ActionRequest {
  kauth?: {
    grant?: {
      access_token?: {
        content?: {
          preferred_username?: string;
        };
      };
    };
  };
}

export const hookAddTenant =
  (model: any): Before =>
  async (request: ExtendedActionRequest): Promise<ActionRequest> => {
    const { method, params } = request;
    const tenant = request.kauth?.grant?.access_token?.content?.preferred_username;

    if (method == 'get') {
      request.query['filters.tenant'] = tenant;
    }

    if (method == 'post') {
      request.payload.tenant = tenant;
    }

    if (['delete', 'edit', 'show'].includes(params.action)) {
      const record = await model.findOne({ where: { id: request.params.recordId } });

      if (!record || record.tenant !== tenant) {
        throw new ValidationError(
            {},
            {
              type: ErrorTypeEnum.Forbidden,
              message: 'Unauthorized: You cannot access this record',
            },
          );
       
      }
    }
    return request;
  };

export const addTenant = ({ model }): FeatureType => {
  return buildFeature({
    actions: {
      list: {
        before: [hookAddTenant(model)],
      },
      show: {
        before: [hookAddTenant(model)],
      },
      edit: {
        before: [hookAddTenant(model)],
      },
      new: {
        before: [hookAddTenant(model)],
      },
      delete: {
        before: [hookAddTenant(model)],
      },
    },
  });
};
