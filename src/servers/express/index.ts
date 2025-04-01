import express, { Express, Router } from 'express';
import AdminJS from 'adminjs';
import path from 'path';
import * as url from 'url';
import session from 'express-session';
import cors from 'cors';

import { generateAdminJSConfig } from '../../admin/index.js';
import { expressRouter } from '../../admin/router.js';
import { keycloak } from './keycloak.js';
import { sessionStore } from './session.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const attachAdminJS = async (app: Express) => {
  const config = generateAdminJSConfig();
  const adminJS: AdminJS = new AdminJS(config);

  if (process.env.NODE_ENV === 'development') adminJS.watch();
  else await adminJS.initialize();

  const adminRouter: Router = expressRouter(adminJS);

  // Protect AdminJS
  app.use(
    keycloak.middleware({
      logout: adminJS.options.logoutPath,
      admin: adminJS.options.rootPath,
    }),
  );

  // Protect AdminJS
  app.use(adminJS.options.rootPath, keycloak.protect(), adminRouter);

  // Redirect to AdminJS
  app.get('/', (req, res) => res.redirect(adminJS.options.rootPath));

  // Get current user
  app.get('/me', (req: any, res) => {
    res.send(req.kauth?.grant?.access_token?.content);
  });

  // Serve static files
  app.use(express.static(path.join(__dirname, '../../../public')));
};

const start = async () => {
  const app = express();
  app.enable('trust proxy');
  app.use(cors());
  app.use(
    session({
      name: 'avr-app',
      secret: process.env.SESSION_SECRET ?? 'xYVxU03RBSu8aa+7hiw/Xw==',
      resave: false,
      saveUninitialized: true,
      store: sessionStore
    }),
  );

  await attachAdminJS(app);

  const port = process.env.PORT || 3000;
  app.listen(port, async () => {
    console.log(`AVR is under 0.0.0.0:${port}`);
  });
};

start();

