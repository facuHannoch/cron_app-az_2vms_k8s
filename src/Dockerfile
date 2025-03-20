FROM node:23-bullseye AS test-runner

WORKDIR /usr/src/cron-app/

COPY package*.json .

RUN npm install

COPY . .

RUN npm test
RUN npm run lint


FROM node:23-alpine3.21 as production

WORKDIR /usr/src/cron-app/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json .
# COPY --from=test-runner /usr/src/cron-app/node_modules ./node_modules
RUN npm ci --omit=dev
COPY cron.js .


USER appuser

# EXPOSE 8080


CMD [ "node", "cron.js" ]