# Karama-Ko: the static site and its small Node API in one image.
#   docker build -t karama-ko .
#   docker run --rm -p 8787:8787 karama-ko

ARG NODE_VERSION=24
ARG PNPM_VERSION=12.14.0

# ---- Dependencies, shared by the next two stages -------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION} && npm cache clean --force
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# ---- Everything needed to build (dev dependencies included) --------------------------------------
FROM base AS build
# Installed before the code is copied: the layer is reused as long as the lockfile does not change.
RUN pnpm install --frozen-lockfile
COPY . .
# Type check, site, server bundle, 404 and /admin pages.
RUN pnpm build

# ---- Only what the server needs at run time ------------------------------------------------------
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

# ---- The image that runs: small, no build tools, not root ----------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
# tini is PID 1: it forwards signals and reaps processes, so `docker stop` is immediate.
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.mjs"]
