FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

RUN pnpm fetch

COPY apps/frontend/package.json apps/frontend/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --frozen-lockfile --offline

COPY apps/frontend/ apps/frontend/
COPY packages/types/ packages/types/
COPY packages/utils/ packages/utils/
COPY packages/ui/ packages/ui/

RUN pnpm run build --filter=@smartpos/frontend

FROM nginx:alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'echo "Starting Smart POS Frontend..."' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]