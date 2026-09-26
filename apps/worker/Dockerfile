FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS build

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @akiksystems/core build \
  && pnpm --filter @akiksystems/db build \
  && pnpm --filter @akiksystems/worker build

FROM base AS runtime

ENV NODE_ENV=production

COPY --chown=node:node --from=build /app /app

USER node

CMD ["pnpm", "--filter", "@akiksystems/worker", "start"]
