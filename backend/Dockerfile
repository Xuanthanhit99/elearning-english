FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache su-exec

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# RUN mkdir -p uploads/community && chown -R node:node /app/uploads
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/storage \
    && chown -R node:node /app/storage

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
EXPOSE 3002
CMD ["node", "dist/src/main.js"]
