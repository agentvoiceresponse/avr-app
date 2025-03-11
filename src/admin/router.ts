import AdminJSExpress from '@adminjs/express';
import AdminJS from 'adminjs';
import session from 'express-session';
import SessionStore from 'connect-session-sequelize';
import { Router } from 'express';
import { sequelize } from '../sources/sequelize/index.js';

const SequelizeSessionStore = SessionStore(session.Store);

export const authenticateUser = async (email: string, password: string) => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Admin credentials not set. Please configure ADMIN_EMAIL and ADMIN_PASSWORD in the .env file.');
  }

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return { id: 1, email, password };
  }
  return null;
};

export const expressAuthenticatedRouter = (adminJs: AdminJS, router: Router | null = null) => {
  const sessionStore = new SequelizeSessionStore({ db: sequelize, tableName: 'sessions' });
  return AdminJSExpress.buildAuthenticatedRouter(
    adminJs,
    {
      authenticate: authenticateUser,
      cookieName: 'avr-app',
      cookiePassword: process.env.SESSION_SECRET ?? 'sessionsecret',
    },
    router,
    {
      store: sessionStore,
      resave: false, // It will not rewrite the req.session.cookie object. the initial req.session.cookie remains as it is.
      proxy: true,
      secret: process.env.SESSION_SECRET ?? 'sessionsecret',
      saveUninitialized: false, // It means that Your session is only Stored into your storage, when any of the Property is modified in req.session
      name: 'avr-app',
    },
  );
};
