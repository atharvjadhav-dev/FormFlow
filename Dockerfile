# ==============================================================================
# Multi-stage Dockerfile for FormFlow Next.js Production Web Application
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# Install libc6-compat for Alpine compatibility with native bindings / SWC
RUN apk add --no-cache libc6-compat

# ------------------------------------------------------------------------------
# Stage 2: Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for the build phase)
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 3: Builder
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Build environment configuration
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Client-side publishable key for Clerk (public frontend key, not a secret)
# Allows Next.js static asset compilation and Clerk middleware validation
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZGVmaW5pdGUtY3JhbmUtMzI3OC5jbGVyay5hY2NvdW50cy5kZXYk
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Build the application using the existing production build script
# (next build && npm run build:standalone)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 4: Production Runner
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Security: Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Production runtime configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy runtime assets and standalone build output from builder stage
# Account for public/, .next/standalone, .next/static, and runtime files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Security: Run as non-root user
USER nextjs

# Expose web application port
EXPOSE 3000

# Required runtime command: node .next/standalone/server.js
CMD ["node", ".next/standalone/server.js"]
