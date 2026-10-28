FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
# shortcut: npm install because npm 10 rejects the current lock; return to npm ci after regenerating the lock with Node 20/npm 10.
RUN npm install --no-audit --no-fund

COPY frontend ./

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/next.config.ts ./next.config.ts

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
