import fs from 'fs';
import path from 'path';
import * as url from 'url';

import { ActionRequest, ActionResponse, After } from 'adminjs';
import { EndpointModel } from '../../models/index.js';
import { reloadModule } from '../../utils/asterisk.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Base template for Asterisk PJSIP configuration
const BASE_TEMPLATE = `[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060
external_media_address=127.0.0.1
external_signaling_address=127.0.0.1
external_signaling_port=5060
local_net=127.0.0.1/32

[endpoint-template](!)
type=endpoint
transport=transport-tcp
context=demo
disallow=all
allow=gsm
allow=ulaw
direct_media=no
force_rport=no
rewrite_contact=yes
rtp_symmetric=yes

; PJSIP endpoint configurations
{{ENDPOINTS}}
`;

/**
 * Generates the configuration for Asterisk PJSIP endpoints
 * and writes it to the pjsip.conf file
 */
export const createAsteriskPJSIPs = (): After<ActionResponse> => {
  return async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { notice } = response;

    // Only process on POST requests with successful notices
    if (method !== 'post' || notice.type === 'error') {
      return response;
    }

    try {
      // Generate the configuration with endpoints
      const config = await generatePJSIPConfig();

      // Write to pjsip.conf file
      const configPath = path.join(__dirname, '../../../../../asterisk/conf', 'pjsip.conf');
      fs.writeFileSync(configPath, config, 'utf8');

      // Reload the PJSIP module
      await reloadModule('res_pjsip.so');
    } catch (error) {
      console.error('Error creating Asterisk endpoints:', error);
    }

    return response;
  };
};

/**
 * Generates the complete PJSIP configuration with endpoint data
 */
async function generatePJSIPConfig(): Promise<string> {
  // Fetch endpoints and generate their configuration
  const endpointLines = await generateEndpointConfig();

  // Replace placeholder with endpoint configuration
  return BASE_TEMPLATE.replace('{{ENDPOINTS}}', endpointLines);
}

/**
 * Generates configuration for all endpoints
 */
async function generateEndpointConfig(): Promise<string> {
  const endpoints = await EndpointModel.findAll({
    attributes: ['id', 'name', 'internal', 'secret', 'updatedAt'],
  });

  return endpoints.map((endpoint) => formatEndpointConfig(endpoint)).join('\n\n');
}

/**
 * Formats the configuration for a single endpoint
 * @param endpoint The endpoint model instance
 * @returns Formatted PJSIP configuration for the endpoint
 */
function formatEndpointConfig(endpoint: any): string {
  return `; Endpoint: ${endpoint.name} - Internal: ${endpoint.internal} - Updated: ${endpoint.updatedAt}
[${endpoint.name}](endpoint-template)
auth=${endpoint.name}
aors=${endpoint.name}

[${endpoint.name}]
type=auth
auth_type=userpass
username=${endpoint.name}
password=${endpoint.secret}

[${endpoint.name}]
type=aor
max_contacts=10`;
}
