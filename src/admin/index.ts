import { Database as SequelizeDatabase, Resource as SequelizeResource } from '@adminjs/sequelize';
import { dark, light, noSidebar } from '@adminjs/themes';
import AdminJS, { AdminJSOptions, ResourceOptions } from 'adminjs';

import packageJSON from '../../package.json' with { type: 'json' };

import {
  CreateCoreResource,
  CreateASRResource,
  CreateLLMResource,
  CreateTTSResource,
  CreateLogResource,
  CreateEndpointResource,
} from '../sources/sequelize/resources/index.js';

import { componentLoader } from './components.bundler.js';
import { locale } from './locale/index.js';
import { dashboardOptions } from './dashboard.js';
// import pages from './pages/index.js';
// import { customTheme } from '../themes/index.js';

AdminJS.registerAdapter({ Database: SequelizeDatabase, Resource: SequelizeResource });

export const menu: Record<string, ResourceOptions['navigation']> = {
  providers: { name: 'cloudProviders', icon: 'Cloud' },
  pbx: { name: 'pbx', icon: 'Phone' },
};

export const generateAdminJSConfig: () => AdminJSOptions = () => ({
  version: { admin: false, app: packageJSON.version },
  rootPath: '/admin',
  locale,
  assets: {
    styles: ['/custom.css'],
    scripts: process.env.NODE_ENV === 'development' ? [] : ['/gtm.js'],
  },
  branding: {
    companyName: 'Agent Voice Response',
    favicon: '/favicon.ico',
    theme: {
      colors: { primary100: '#4D70EB' },
    },
    withMadeWithLove: false,
    logo: '/avr.png',
  },
  dashboard: dashboardOptions,
  defaultTheme: 'light',
  availableThemes: [light, dark, noSidebar],
  componentLoader,
  // pages,
  env: {
    GITHUB_URL: process.env.GITHUB_URL || 'https://github.com/agentvoiceresponse',
    DOCUMENTATION_URL: process.env.DOCUMENTATION_URL || 'https://wiki.agentvoiceresponse.com',
    DISCORD_URL: process.env.DISCORD_URL || 'https://discord.gg/mzsZ4Unk',
  },
  resources: [
    CreateCoreResource(),
    CreateASRResource(),
    CreateLLMResource(),
    CreateTTSResource(),
    CreateEndpointResource(),
    CreateLogResource(),
  ],
});
