import { createLoggerResource } from '@adminjs/logger';
import { LogModel } from '../models/log.model.js';
import { ResourceFunction } from '../../../admin/types/index.js';
import { componentLoader } from '../../../admin/components.bundler.js';

export const CreateLogResource: ResourceFunction<typeof LogModel> = () => {
  return createLoggerResource({
    componentLoader,
    resource: LogModel,
    featureOptions: {
      propertiesMapping: {
        user: 'userId',
      },
      componentLoader,
    },
  });
};
