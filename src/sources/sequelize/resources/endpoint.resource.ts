import loggerFeature from '@adminjs/logger';

import { ResourceFunction } from '../../../admin/types/index.js';
import { EndpointModel } from '../models/index.js';

import { disableBulkDelete, addTenant } from '../../../admin/fatures/index.js';

import { menu } from '../../../admin/index.js';

import { createAsteriskExtensions, createAsteriskPJSIPs } from '../hooks/general/index.js';

export const CreateEndpointResource: ResourceFunction<typeof EndpointModel> = () => ({
  resource: EndpointModel,
  features: [
    disableBulkDelete(),
    addTenant({ model: EndpointModel }),
  ],
  options: {
    listProperties: ['id', 'internal', 'name', 'createdAt'],
    editProperties: ['name', 'secret', 'description'],
    showProperties: ['id', 'internal', 'name', 'description', 'createdAt', 'updatedAt'],
    filterProperties: ['id', 'name'],
    navigation: menu.pbx,
    actions: {
      list: {
        after: [],
      },
      show: {
        after: [],
      },
      new: {
        after: [createAsteriskPJSIPs(), createAsteriskExtensions()],
      },
      edit: {
        after: [createAsteriskPJSIPs(), createAsteriskExtensions()],
      },
      delete: {
        after: [createAsteriskPJSIPs(), createAsteriskExtensions()],
      },
    },
    properties: {
      description: {
        type: 'textarea',
        props: {
          rows: 3,
        },
      },
      secret: {
        type: 'password',
      },
      internal: {
        type: 'number',
      },
    },
  },
});
