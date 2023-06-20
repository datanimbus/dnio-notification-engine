FROM node:18-alpine

RUN apk update
RUN apk upgrade
RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

WORKDIR /app

COPY package.json package.json

RUN npm install -g npm
RUN npm install --production --no-audit
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY . .

ENV IMAGE_TAG=__image_tag__

EXPOSE 10010

CMD node app.js