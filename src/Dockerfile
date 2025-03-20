FROM node:23-alpine3.21 AS builder

WORKDIR /usr/src/cron-app/

COPY package*.json .

RUN npm install

COPY . .

RUN npm test
RUN npm run lint


# Final stage
FROM node:23-alpine3.21

WORKDIR /usr/src/cron-app/

COPY --from=builder package*.json .
COPY --from=builder cron.js .

RUN npm ci --only=production

EXPOSE 8080


CMD [ "node", "cron.js" ]