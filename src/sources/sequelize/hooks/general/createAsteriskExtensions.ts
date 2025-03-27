import fs from 'fs';
import path from 'path';
import * as url from 'url';

import { ActionRequest, ActionResponse, After } from 'adminjs';
import { CoreModel, EndpointModel } from '../../models/index.js';
import { reloadModule } from '../../utils/asterisk.js';

// Constants
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const ASTERISK_CONF_DIR = path.join(__dirname, '../../../../../asterisk/conf');
const EXTENSIONS_CONF_PATH = path.join(ASTERISK_CONF_DIR, 'extensions.conf');
const ASTERISK_MODULE = 'pbx_config.so';

// Base template for Asterisk extensions configuration
const BASE_TEMPLATE = `[avr]
exten => s,1,Answer()
 same => n,Ringing()
 same => n,Set(UUID=\${SHELL(uuidgen | tr -d '\\n')})
 same => n,AudioSocket(\${UUID},\${ARG1})
 same => n,Hangup()

[demo]

; Core extensions for AVR AI agents
{{GOSUBS}}

; Endpoint extensions for PJSIP endpoints
{{ENDPOINTS}}
`;

/**
 * Hook that generates Asterisk extensions configuration and reloads Asterisk
 * when changes are made through the admin panel
 *
 * @returns An After hook for AdminJS
 */
export const createAsteriskExtensions = (): After<ActionResponse> => {
  return async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { notice } = response;

    // Only process on POST requests with successful notices
    if (method !== 'post' || notice.type === 'error') {
      return response;
    }

    try {
      // Generate a filled template with cores and endpoints
      const template = await generateExtensionsTemplate();

      // Write to extensions.conf file
      fs.writeFileSync(EXTENSIONS_CONF_PATH, template, 'utf8');

      // Reload the Asterisk module
      await reloadModule(ASTERISK_MODULE);
    } catch (error) {
      console.error('Error creating Asterisk extensions:', error);
    }

    return response;
  };
};

/**
 * Generates the complete extensions template with core and endpoint data
 *
 * @returns Promise resolving to the complete extensions.conf content
 */
async function generateExtensionsTemplate(): Promise<string> {
  let template = BASE_TEMPLATE;

  // Add core extensions
  const gosubLines = await generateCoreExtensions();
  template = template.replace('{{GOSUBS}}', gosubLines);

  // Add endpoint extensions
  const endpointLines = await generateEndpointExtensions();
  template = template.replace('{{ENDPOINTS}}', endpointLines);

  return template;
}

/**
 * Generates extensions for AI cores
 *
 * @returns Promise resolving to formatted core extensions
 */
async function generateCoreExtensions(): Promise<string> {
  const cores = await CoreModel.findAll({
    attributes: ['id', 'name', 'did', 'updatedAt'],
  });

  if (cores.length === 0) {
    return '; No AI cores configured';
  }

  return cores
    .map(
      (core) => `; AI Agent: ${core.name} - Updated: ${core.updatedAt}
exten => ${core.did},1,GoSub(avr,s,1(avr-core-${core.id}:${core.did}))`,
    )
    .join('\n\n');
}

/**
 * Generates extensions for PJSIP endpoints
 *
 * @returns Promise resolving to formatted endpoint extensions
 */
async function generateEndpointExtensions(): Promise<string> {
  const endpoints = await EndpointModel.findAll({
    attributes: ['id', 'name', 'internal', 'updatedAt'],
  });

  if (endpoints.length === 0) {
    return '; No endpoints configured';
  }

  return endpoints
    .map((endpoint) => {
      let line = `; Endpoint: ${endpoint.name} - Internal: ${endpoint.internal} - Updated: ${endpoint.updatedAt}
exten => ${endpoint.name},1,Dial(PJSIP/${endpoint.name})`;

      if (String(endpoint.internal) !== endpoint.name) {
        line += `\nexten => ${endpoint.internal},1,Dial(PJSIP/${endpoint.name})`;
      }

      return line;
    })
    .join('\n\n');
}
