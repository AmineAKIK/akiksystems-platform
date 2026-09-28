FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS build

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @akiksystems/web build \
  && pnpm --filter @akiksystems/web --prod deploy --legacy /prod/web

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --chown=node:node --from=build /prod/web /app

RUN printf '%s\n' '{"name":"akiksystems-web-runtime","private":true,"type":"module"}' > /app/package.json \
  && chown node:node /app/package.json

USER node

EXPOSE 3000

CMD ["node", "server.js"]
