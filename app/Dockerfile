FROM node:22-alpine

# Install build deps for better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
