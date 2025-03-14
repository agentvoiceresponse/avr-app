FROM node:20-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src /usr/src/app/src

COPY tsconfig.json /usr/src/app/tsconfig.json

RUN npm i -g typescript

RUN npm run build

# BUILD FOR PRODUCTION

FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node --from=development /usr/src/app/dist ./dist

COPY --chown=node:node --from=development /usr/src/app/package.json ./

COPY --chown=node:node public ./public

RUN mkdir -p /usr/src/app/.adminjs && chown -R node:node /usr/src/app/.adminjs

USER node

CMD [ "node", "dist/index.js" ]