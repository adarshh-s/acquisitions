# Docker Setup Guide

This guide explains how to run the Acquisitions API using Docker with different configurations for development and production environments.

## Overview

The application uses different database configurations based on the environment:

- **Development**: Uses [Neon Local](https://neon.com/docs/local/neon-local) with ephemeral branches that are created when Docker starts and deleted when it stops
- **Production**: Connects directly to Neon Cloud database

## Prerequisites

- Docker and Docker Compose installed
- Neon account with a project created
- Required Neon credentials:
  - `NEON_API_KEY`: Your Neon API key
  - `NEON_PROJECT_ID`: Your Neon project ID
  - `PARENT_BRANCH_ID`: The branch ID to use as parent for ephemeral branches (usually your main branch)

### Getting Neon Credentials

1. **API Key**: Visit [Neon Console → Account Settings → API Keys](https://console.neon.tech/app/settings/api-keys)
2. **Project ID**: Found in your project's connection string or dashboard URL
3. **Branch ID**: Available in Neon Console → Your Project → Branches

## Development Setup

### Step 1: Set Environment Variables

Create a `.env` file in the project root with your Neon credentials:

```bash
# Required for Neon Local
NEON_API_KEY=your_neon_api_key
NEON_PROJECT_ID=your_neon_project_id
PARENT_BRANCH_ID=your_main_branch_id

# Optional: Update JWT secret
JWT_SECRET=your-dev-jwt-secret-change-me
```

Or export them in your shell:

```bash
export NEON_API_KEY=your_neon_api_key
export NEON_PROJECT_ID=your_neon_project_id
export PARENT_BRANCH_ID=your_main_branch_id
```

### Step 2: Start Development Environment

```bash
# Build and start both the app and Neon Local
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

This will:

1. Start the Neon Local proxy container
2. Create an ephemeral database branch from your parent branch
3. Start your application connected to this ephemeral branch
4. Expose the API on `http://localhost:3000`

### Step 3: Run Database Migrations (First Time)

After the containers are running, execute migrations:

```bash
# Run migrations inside the app container
docker exec acquisitions-app-dev npm run db:migrate
```

### Step 4: Access Your Application

- API: `http://localhost:3000`
- Logs: Check `./logs/` directory or use `docker-compose -f docker-compose.dev.yml logs -f app`

### Step 5: Stop Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

**Note**: When you stop the containers, the ephemeral database branch is automatically deleted by Neon Local.

## Production Setup

### Step 1: Configure Production Environment

Edit `.env.production` with your actual Neon Cloud credentials:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration - Use your actual Neon Cloud connection string
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST.neon.tech/neondb?sslmode=require

# JWT Configuration - Use a strong secret
JWT_SECRET=your-production-jwt-secret-use-secrets-manager

# Arcjet
ARCJET_KEY=your-production-arcjet-key
```

**Security Best Practice**: In production deployments (e.g., Kubernetes, AWS ECS), inject secrets via environment variables or secret managers instead of using `.env.production` files.

### Step 2: Build Production Image

```bash
# Build the production image
docker-compose -f docker-compose.prod.yml build
```

### Step 3: Start Production Environment

```bash
# Start in detached mode
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 4: Run Database Migrations

```bash
# Run migrations in production container
docker exec acquisitions-app-prod npm run db:migrate
```

### Step 5: Health Check

The production setup includes automatic health checks. Verify the app is healthy:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3000/health
```

### Step 6: Stop Production Environment

```bash
docker-compose -f docker-compose.prod.yml down
```

## Architecture

### Docker Files

- **`Dockerfile`**: Multi-stage build optimized for production
- **`docker-compose.dev.yml`**: Development setup with Neon Local
- **`docker-compose.prod.yml`**: Production setup with Neon Cloud
- **`.dockerignore`**: Excludes unnecessary files from build context

### Environment Files

- **`.env.development`**: Development configuration (connects to Neon Local)
- **`.env.production`**: Production configuration (connects to Neon Cloud)

### How Neon Local Works

Neon Local acts as a proxy that:

1. Creates a temporary database branch when the container starts
2. Routes all PostgreSQL connections to this ephemeral branch
3. Automatically deletes the branch when the container stops

This ensures:

- Fresh database state for each development session
- No manual cleanup required
- Isolated development environments
- Production-like database features (via Neon)

## Useful Commands

### Development

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart only the app (keep database running)
docker-compose -f docker-compose.dev.yml restart app

# Execute commands in the app container
docker exec -it acquisitions-app-dev sh

# Check Neon Local connection
docker exec acquisitions-neon-local pg_isready

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml up --build
```

### Production

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats acquisitions-app-prod

# Execute commands in the app container
docker exec -it acquisitions-app-prod sh

# Update and restart
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Database Operations

```bash
# Generate new migration
docker exec acquisitions-app-dev npm run db:generate

# Run migrations
docker exec acquisitions-app-dev npm run db:migrate

# Open Drizzle Studio (development only)
docker exec -it acquisitions-app-dev npm run db:studio
```

## Troubleshooting

### Neon Local won't start

**Problem**: Container exits immediately or shows authentication errors.

**Solution**:

- Verify `NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID` are correct
- Check Neon API key has proper permissions
- View logs: `docker-compose -f docker-compose.dev.yml logs neon-local`

### App can't connect to database

**Problem**: Connection refused or timeout errors.

**Solution**:

- Ensure Neon Local is healthy: `docker ps` (should show "healthy" status)
- Check network connectivity: `docker exec acquisitions-app-dev ping neon-local`
- Verify DATABASE_URL in logs doesn't expose actual credentials

### Port already in use

**Problem**: `Error: bind: address already in use`

**Solution**:

- Check if port 3000 or 5432 is already in use: `lsof -i :3000` or `lsof -i :5432`
- Stop conflicting services or change ports in docker-compose files

### Migrations fail

**Problem**: Migration errors or schema mismatches.

**Solution**:

- Ensure database is accessible
- Check migration files in `drizzle/` directory
- Run migrations manually: `docker exec -it acquisitions-app-dev npm run db:migrate`

## Cloud Deployment

### Using Docker Image in Production

1. **Build the image**:

```bash
docker build -t acquisitions-api:latest .
```

2. **Push to registry** (e.g., Docker Hub, AWS ECR, GCP Artifact Registry):

```bash
docker tag acquisitions-api:latest your-registry/acquisitions-api:latest
docker push your-registry/acquisitions-api:latest
```

3. **Deploy with environment variables**:

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV="production" \
  your-registry/acquisitions-api:latest
```

### Kubernetes Deployment

See example Kubernetes manifests:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: acquisitions-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: acquisitions-api
  template:
    metadata:
      labels:
        app: acquisitions-api
    spec:
      containers:
        - name: api
          image: your-registry/acquisitions-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: neon-db-secret
                  key: connection-string
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: secret
            - name: NODE_ENV
              value: 'production'
```

## Additional Resources

- [Neon Local Documentation](https://neon.com/docs/local/neon-local)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Neon Database Documentation](https://neon.tech/docs)
