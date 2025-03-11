import loggerFeature from '@adminjs/logger';

import { ResourceFunction } from '../../../../admin/types/index.js';
import { TTSModel } from '../../models/index.js';
import { menu } from '../../../../admin/index.js';
import { disableBulkDelete } from '../../../../admin/fatures/disableBulkDelete.js';
import {
  componentLoader,
  CONTAINER_LOGS,
  EDIT_PASSWORD_PROPERTY,
  EDIT_PROPERTY,
} from '../../../../admin/components.bundler.js';
import {
  createAndStartContainer,
  ensureContainer,
  logContainer,
  statusContainer,
  stopAndRemoveContainer,
  validateKey,
} from '../../hooks/general/index.js';
import { allModels } from './models/index.js';

const NAME = 'tts';

export const CreateTTSResource: ResourceFunction<typeof TTSModel> = () => ({
  resource: TTSModel,
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
    listProperties: ['id', 'name', 'provider', 'model', 'gender', 'speekingRate', 'status', 'description', 'createdAt'],
    editProperties: ['name', 'provider', 'key', 'model', 'voice', 'gender', 'speekingRate', 'description'],
    showProperties: [
      'id',
      'name',
      'provider',
      'model',
      'voice',
      'gender',
      'speekingRate',
      'status',
      'description',
      'createdAt',
      'updatedAt',
    ],
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
        after: [stopAndRemoveContainer(NAME)],
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
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          availableValues: allModels,
        },
      },
      voice: {
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          providers: ['elevenlabs'],
        },
      },
      gender: {
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          availableValues: [
            {
              value: 'FEMALE',
              label: 'google',
            },
            {
              value: 'MALE',
              label: 'google',
            },
          ],
          providers: ['google'],
        },
      },
      speekingRate: {
        isRequired: true,
        props: {
          type: 'number',
          min: 1,
          max: 100,
        },
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          providers: ['google'],
        },
      },
      key: {
        isRequired: true,
        type: 'password',
        components: {
          edit: EDIT_PASSWORD_PROPERTY,
        },
      },
      description: {
        type: 'textarea',
        props: {
          rows: 3,
        },
      },
      status: {
        type: 'string',
      },
    },
  },
});
