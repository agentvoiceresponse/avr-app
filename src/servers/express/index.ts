import express, { Express } from 'express';
import cors from 'cors';
import AdminJS from 'adminjs';
import path from 'path';
import * as url from 'url';

import { generateAdminJSConfig } from '../../admin/index.js';
import { expressAuthenticatedRouter } from '../../admin/router.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const attachAdminJS = async (app: Express) => {
  const config = generateAdminJSConfig();
  const adminJS = new AdminJS(config);

  if (process.env.NODE_ENV === 'production') await adminJS.initialize();
  else adminJS.watch();

  const adminRouter = expressAuthenticatedRouter(adminJS);

  app.use(adminJS.options.rootPath, adminRouter);
  app.get('/', (req, res) => res.redirect(adminJS.options.rootPath));
  app.use(express.static(path.join(__dirname, '../../../public')));
};

const start = async () => {
  const app = express();
  app.enable('trust proxy');
  app.use(cors({ credentials: true, origin: true }));

  await attachAdminJS(app);

  const port = process.env.PORT || 3000;
  app.listen(port, async () => {
    console.log(`AVR is under http://localhost:${port}`);
  });
};

start();
