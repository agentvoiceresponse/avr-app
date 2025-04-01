import Keycloak from 'keycloak-connect';
import { sessionStore } from './session.js';

const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'avr',
  'auth-server-url': process.env.KEYCLOAK_AUTH_SERVER_URL || 'https://auth.agentvoiceresponse.com',
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'avr-app',
  'public-client': true,
  'confidential-port': 0
};

const keycloak = new Keycloak({ 
  store: sessionStore
}, keycloakConfig);

export { keycloak };
