# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Express.js REST API for user acquisitions using Node.js ES modules, Drizzle ORM with PostgreSQL (Neon serverless), Zod validation, and Arcjet security.

## Development Commands

### Running the Application

```bash
npm run dev              # Start server with --watch (auto-restart on changes)
npm start                # Start server in production mode
npm run dev:docker       # Start with Docker + Neon Local (ephemeral branches)
npm run prod:docker      # Start with Docker + Neon Cloud
```

### Code Quality

```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting without changes
```

### Database Operations

```bash
npm run db:generate      # Generate Drizzle migration files from schema
npm run db:migrate       # Run pending migrations
npm run db:studio        # Open Drizzle Studio (database GUI)
```

## Architecture

### Module System

Uses ES modules (`"type": "module"`) with Node.js subpath imports defined in `package.json`:

- `#config/*` → `./src/config/*`
- `#controller/*` → `./src/controller/*`
- `#middleware/*` → `./src/middleware/*`
- `#models/*` → `./src/models/*`
- `#routes/*` → `./src/routes/*`
- `#services/*` → `./src/services/*`
- `#utils/*` → `./src/utils/*`
- `#validation/*` → `./src/validation/*`

### Application Bootstrap

- **Entry point**: `src/index.js` loads `dotenv/config` then imports `server.js`
- **App config**: `src/app.js` configures Express middleware and registers routes
- **Server**: `src/server.js` starts HTTP server on configured port

### Request Flow

1. **Middleware chain** (in order):
   - `helmet()` - Security headers
   - `cors()` - Cross-origin resource sharing
   - `express.json()` & `express.urlencoded()` - Body parsing
   - `cookieParser()` - Cookie parsing
   - `morgan()` - HTTP request logging (piped to Winston)
   - `securityMiddleware` - Arcjet security (shield, bot detection, rate limiting)

2. **Routes** (`src/routes/*.routes.js`) - Endpoint definitions
3. **Controllers** (`src/controller/*.controller.js`) - Request handlers:
   - Validate input using Zod `.safeParse()`
   - Call service layer
   - Format responses with appropriate status codes
4. **Services** (`src/services/*.service.js`) - Business logic:
   - Database queries via Drizzle ORM
   - Password hashing (bcrypt with 10 rounds)
   - Data transformations
5. **Models** (`src/models/*.model.js`) - Drizzle schema definitions

### Key Technologies

#### Database (Drizzle ORM + Neon)

- PostgreSQL with `@neondatabase/serverless` driver
- Database instance: `db` exported from `src/config/database.js`
- Development mode: Neon Local proxy at `http://neon-local:5432/sql` (Docker)
- Production mode: Direct Neon Cloud connection
- Migrations stored in `drizzle/` directory
- Schema location specified in `drizzle.config.js`

#### Authentication & Session Management

- JWT tokens with 1 day expiry (configured in `src/utils/jwt.js`)
- Tokens stored in httpOnly cookies (15 min expiry via `src/utils/cookies.js`)
- Cookie options: `httpOnly`, `secure` (production only), `sameSite: 'strict'`
- Password hashing: bcrypt with 10 rounds
- User roles: `user` (default), `admin`

#### Security (Arcjet)

- Configured in `src/config/arcjet.js` and applied via `src/middleware/security.middleware.js`
- **Bypassed in non-production** (`NODE_ENV !== 'production'`)
- Shield protection against common attacks
- Bot detection (allows search engines and preview services)
- Role-based rate limiting:
  - Guest: 5 requests/minute
  - User: 10 requests/minute
  - Admin: 20 requests/minute
- Whitelisted user agents: Postman, Insomnia, Thunder Client, HTTPie, curl, axios, node-fetch
- Required env var: `ARCJET_KEY`

#### Logging (Winston)

- Configured in `src/config/logger.js`
- File transports: `logs/error.lg` (errors only), `logs/combined.log` (all)
- Console transport in non-production
- Service name: `acquisition-api`
- Default level: `info` (override via `LOG_LEVEL` env var)

#### Validation (Zod)

- Schemas in `src/validations/*.validation.js`
- Use `.safeParse()` in controllers
- Format errors with `formatValidationError()` from `#utils/format.js`

### Docker Development

- Development uses `docker-compose.dev.yml` with Neon Local (ephemeral branches)
- Production uses `docker-compose.prod.yml` with Neon Cloud
- Scripts: `scripts/dev.sh` and `scripts/prod.sh`
- Development container mounts `./src` for hot-reloading and `./logs` for persistence

## Code Style

### ESLint (eslint.config.js)

- 2-space indentation, switch cases indented
- Single quotes, semicolons required
- Unix line endings
- Prefer const/arrow functions over var/function
- Unused vars allowed if prefixed with `_`
- No console warnings (allowed for Node.js apps)

### Prettier (.prettierrc)

- Single quotes, semicolons
- 80 character line width
- 2-space tabs (soft tabs)
- Trailing commas (ES5)
- Arrow function parens: avoid (e.g., `x => x`)

## Environment Variables

Required in `.env`, `.env.development`, or `.env.production`:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `ARCJET_KEY` - Arcjet API key (production only)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (`development`, `production`)
- `LOG_LEVEL` - Winston log level (default: `info`)

## Adding New Features

### Adding a New Route

1. Create Zod validation schema in `src/validations/<feature>.validation.js`
2. Create service functions in `src/services/<feature>.service.js`
3. Create controller in `src/controller/<feature>.controller.js`
   - Use `.safeParse()` for validation
   - Call service layer
   - Handle errors with appropriate status codes
4. Define routes in `src/routes/<feature>.routes.js`
5. Register routes in `src/app.js` using `app.use('/api/<feature>', <feature>Routes)`

### Adding Database Models

1. Define schema in `src/models/<model>.model.js` using Drizzle syntax
2. Run `npm run db:generate` to create migration files
3. Run `npm run db:migrate` to apply migrations
4. Import model in services: `import { modelName } from '#models/<model>.model.js'`

## Testing

No test framework currently configured. ESLint config includes Jest globals for future test implementation.
