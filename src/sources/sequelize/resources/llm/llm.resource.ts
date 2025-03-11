import loggerFeature from '@adminjs/logger';

import { menu } from '../../../../admin/index.js';
import { LLMModel } from '../../models/index.js';
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
  logContainer,
  statusContainer,
  stopAndRemoveContainer,
  validateKey,
} from '../../hooks/general/index.js';
import { allModels } from './models/index.js';

const NAME = 'llm';

export const CreateLLMResource: ResourceFunction<typeof LLMModel> = () => ({
  resource: LLMModel,
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
    listProperties: ['id', 'name', 'provider', 'model', 'status', 'description', 'createdAt'],
    editProperties: ['name', 'provider', 'key', 'model', 'systemPrompt', 'assistant', 'description'],
    showProperties: [
      'id',
      'name',
      'provider',
      'model',
      'systemPrompt',
      'assistant',
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
      systemPrompt: {
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          providers: ['openai', 'openrouter'],
        },
      },
      assistant: {
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          providers: ['openai-assistant'],
        },
      },
      model: {
        isRequired: true,
        components: {
          edit: EDIT_PROPERTY,
        },
        custom: {
          availableValues: allModels,
          providers: ['openai', 'openrouter'],
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
          providers: ['openai', 'openai-assistant', 'openrouter'],
        },
      },
      status: {
        type: 'string',
      },
    },
  },
});
