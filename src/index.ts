import dotenv from 'dotenv';
dotenv.config({
  path: `${process.cwd()}/.env`,
});

await import('./servers/express/index.js');
