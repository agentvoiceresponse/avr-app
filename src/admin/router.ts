import AdminJSExpress from '@adminjs/express';
import AdminJS from 'adminjs';
import { Router } from 'express';
import { componentLoader } from './components.bundler.js';
import { sessionStore } from '../servers/express/session.js';

export const expressRouter = (adminJs: AdminJS, router?: Router | null): Router => {
  return AdminJSExpress.buildRouter(adminJs, router);
};
