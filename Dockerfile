FROM node:14.19.0-alpine3.15

RUN apk update
RUN apk upgrade
RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

WORKDIR /app

COPY package.json /app

RUN npm install --production
RUN npm audit fix

COPY api /app/api
COPY app.js /app
COPY db-factory.js /app
COPY config /app/config

ENV IMAGE_TAG=__image_tag__

EXPOSE 10010

#RUN adduser -D appuser
#RUN chown -R appuser /app
# RUN chmod -R 777 /app
#USER appuser

CMD node app.js