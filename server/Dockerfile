# The V Russia server as a container. Multi-stage: the build tools stay in the first stage; the image that runs has only the built
# JavaScript, the production packages, the migrations and the e-mail templates, and runs as the unprivileged "node" user.
# Build:  docker build -t vrussia-server ./server        Run: see docs/DEPLOY_VPS.md (needs the environment variables of .env.example)
FROM node:24.14.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY tsconfig.build.json ./
RUN npx tsc -p tsconfig.build.json && npm prune --omit=dev

FROM node:24.14.1-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/dist ./dist
COPY --chown=root:root package.json ./
COPY --chown=root:root migrations ./migrations
COPY --chown=root:root templates ./templates
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/src/main.js"]
