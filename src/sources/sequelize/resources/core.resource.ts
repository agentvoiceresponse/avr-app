import loggerFeature from '@adminjs/logger';

import { ResourceFunction } from '../../../admin/types/index.js';
import { CoreModel } from '../models/index.js';

import { componentLoader, CONTAINER_LOGS } from '../../../admin/components.bundler.js';
import { disableBulkDelete } from '../../../admin/fatures/disableBulkDelete.js';
import {
  createAndStartContainer,
  ensureContainer,
  logContainer,
  statusContainer,
  stopAndRemoveContainer,
  createAsteriskExtensions,
} from '../hooks/general/index.js';

const NAME = 'core';

export const CreateCoreResource: ResourceFunction<typeof CoreModel> = () => ({
  resource: CoreModel,
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
    listProperties: ['id', 'name', 'asrId', 'llmId', 'ttsId', 'stopAgent', 'status', 'did', 'createdAt'],
    editProperties: ['name', 'asrId', 'llmId', 'ttsId', 'firstMessage', 'stopAgent', 'description'],
    showProperties: [
      'id',
      'name',
      'asrId',
      'llmId',
      'ttsId',
      'status',
      'did',
      'firstMessage',
      'stopAgent',
      'description',
      'createdAt',
      'updatedAt',
    ],
    filterProperties: ['id', 'name', 'asrId', 'llmId', 'ttsId'],
    navigation: {
      name: null,
      icon: 'Folder',
    },
    actions: {
      list: {
        after: [statusContainer(NAME)],
      },
      show: {
        after: [statusContainer(NAME)],
      },
      new: {
        after: [createAndStartContainer(NAME), createAsteriskExtensions()],
      },
      edit: {
        after: [ensureContainer(NAME), createAsteriskExtensions()],
      },
      delete: {
        after: [stopAndRemoveContainer(NAME), createAsteriskExtensions()],
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
      firstMessage: {
        type: 'textarea',
        props: {
          rows: 3,
        },
      },
      stopAgent: {
        type: 'boolean',
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
      did: {
        type: 'number',
      },
    },
  },
});
