FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

WORKDIR /app
COPY server.mjs provider-room-inventory.mjs provider-property-services.mjs /app/
USER root
EXPOSE 8080
CMD ["node", "/app/server.mjs"]
