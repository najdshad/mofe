ARG NEXT_PUBLIC_WS_URL

FROM node:22-slim AS builder
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL required by Prisma engine binary
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma runtime — schema, seed, CLI, and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/tsconfig.json ./tsconfig.json
RUN npm install --no-save --no-package-lock --ignore-scripts \
    prisma @prisma/adapter-pg \
    tsx dotenv bcryptjs 2>&1 && \
    chown -R nextjs:nodejs /app/node_modules

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
