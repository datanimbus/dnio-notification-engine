FROM node:18.7.0-alpine3.16

RUN apk update
RUN apk upgrade
RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

WORKDIR /app

COPY package.json package.json

RUN npm install -g npm@8.10.0
RUN npm install --production
RUN npm audit fix
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY . .

ENV IMAGE_TAG=__image_tag__

EXPOSE 10010

CMD node app.js