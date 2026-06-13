FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=deps /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["node", "dist/main.js"]
