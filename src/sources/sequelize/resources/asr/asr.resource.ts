import loggerFeature from '@adminjs/logger';

import { menu } from '../../../../admin/index.js';
import { disableBulkDelete } from '../../../../admin/fatures/disableBulkDelete.js';
import {
  componentLoader,
  CONTAINER_LOGS,
  EDIT_PASSWORD_PROPERTY,
  EDIT_PROPERTY,
} from '../../../../admin/components.bundler.js';
import { ResourceFunction } from '../../../../admin/types/index.js';
import {
  createAndStartContainer,
  ensureContainer,
  stopAndRemoveContainer,
  logContainer,
  statusContainer,
  validateKey,
  removeContainerKey,
} from '../../hooks/general/index.js';
import { ASRModel } from '../../models/index.js';
import { allModels } from './models/index.js';
import { allLanguages } from './languages/index.js';

const NAME = 'asr';

export const CreateASRResource: ResourceFunction<typeof ASRModel> = () => ({
  resource: ASRModel,
  features: [
    disableBulkDelete(),
    loggerFeature({
      componentLoader,
      propertiesMapping: {
        user: 'userId',
      },
    }),
  ],
  options: {
    listProperties: ['id', 'name', 'provider', 'model', 'language', 'status', 'description', 'createdAt'],
    editProperties: ['name', 'provider', 'key', 'model', 'language', 'description'],
    showProperties: ['id', 'name', 'provider', 'model', 'language', 'status', 'description', 'createdAt', 'updatedAt'],
    filterProperties: ['id', 'name', 'provider'],
    navigation: menu.providers,
    actions: {
      list: {
        after: [statusContainer(NAME)],
      },
      show: {
        after: [statusContainer(NAME)],
      },
      new: {
        after: [createAndStartContainer(NAME)],
      },
      edit: {
        after: [ensureContainer(NAME)],
      },
      delete: {
        before: [validateKey(NAME + 'Id')],
        after: [stopAndRemoveContainer(NAME), removeContainerKey(NAME)],
      },
      containerLogs: {
        actionType: 'record',
        icon: 'Eye',
        component: CONTAINER_LOGS,
        after: [logContainer(NAME)],
        handler: async (request, response, context) => {
          return {
            record: context.record.toJSON(),
          };
        },
      },
    },
    properties: {
      model: {
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          availableValues: allModels,
          providers: ['deepgram', 'google', 'elevenlabs'],
        },
      },
      language: {
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          availableValues: allLanguages,
          providers: ['deepgram', 'google', 'elevenlabs'],
        },
      },
      description: {
        type: 'textarea',
        props: {
          rows: 3,
        },
      },
      key: {
        type: 'password',
        components: {
          edit: EDIT_PASSWORD_PROPERTY,
        },
        custom: {
          providers: ['deepgram', 'google', 'elevenlabs'],
        },
      },
      status: {
        type: 'string',
      },
    },
  },
});
