FROM node:22-alpine AS deps
WORKDIR /app
# Puppeteer's bundled Chromium download is a glibc build and does not run
# on Alpine's musl libc anyway — skip it here (this stage only needs
# node_modules to compile TypeScript, never launches a browser). The
# runner stage below installs Alpine's own musl-native `chromium` apk
# package instead and points Puppeteer at it via PUPPETEER_EXECUTABLE_PATH.
ENV PUPPETEER_SKIP_DOWNLOAD=true
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
# Document Library PDF rendering (PdfRenderService) needs a real browser.
# `chromium` here is Alpine's musl-native build; nss/freetype/harfbuzz/
# ttf-freefont are its runtime deps for headless rendering + font
# shaping (Vietnamese diacritics need a real font, not just a bare
# Chromium binary). ca-certificates is required for any HTTPS the
# process makes elsewhere (Gemini, R2) — not by Chromium itself, since
# the PDF template has no external network resources.
RUN apk add --no-cache \
    su-exec \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
