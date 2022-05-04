FROM node:16-alpine

RUN apk update
RUN apk upgrade
RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

WORKDIR /app

COPY package.json package.json

RUN npm install --production
RUN npm audit fix

COPY . .

ENV IMAGE_TAG=__image_tag__

EXPOSE 10010

CMD node app.js