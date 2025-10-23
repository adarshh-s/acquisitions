# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an Express.js REST API for user acquisitions using Node.js ES modules, Drizzle ORM with PostgreSQL (Neon serverless), and Zod for validation.

## Development Commands

### Running the Application
```bash
npm run dev              # Start server with --watch (auto-restart on changes)
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
- Uses ES modules (`"type": "module"`)
- Import path aliases defined in `package.json` using Node.js subpath imports:
  - `#config/*` → `./src/config/*`
  - `#controller/*` → `./src/controller/*`
  - `#middleware/*` → `./src/middleware/*`
  - `#models/*` → `./src/models/*`
  - `#routes/*` → `./src/routes/*`
  - `#services/*` → `./src/services/*`
  - `#utils/*` → `./src/utils/*`
  - `#validation/*` → `./src/validation/*`

### Directory Structure
```
src/
├── app.js              # Express app configuration & middleware setup
├── index.js            # Entry point (loads dotenv & server)
├── server.js           # HTTP server initialization
├── config/             # Configuration (database, logger)
├── controller/         # Request handlers
├── services/           # Business logic layer
├── routes/             # Route definitions
├── models/             # Drizzle ORM schemas
├── validations/        # Zod validation schemas
├── middleware/         # Express middleware (currently empty)
└── utils/              # Utility functions (jwt, cookies, format)
```

### Request Flow
1. **Routes** (`src/routes/*.routes.js`) define endpoints
2. **Controllers** (`src/controller/*.controller.js`) handle requests:
   - Validate input using Zod schemas from `src/validations/`
   - Call service layer functions
   - Format responses
3. **Services** (`src/services/*.service.js`) contain business logic:
   - Database interactions using Drizzle ORM
   - Password hashing (bcrypt)
   - Data transformations
4. **Models** (`src/models/*.model.js`) define database schemas using Drizzle

### Key Technologies & Patterns

#### Database (Drizzle ORM)
- PostgreSQL with Neon serverless driver (`@neondatabase/serverless`)
- Schema-first approach: models in `src/models/*.model.js`
- Database instance exported from `src/config/database.js`
- Migrations stored in `drizzle/` directory

#### Authentication
- JWT tokens stored in httpOnly cookies (15 min expiry)
- Password hashing via bcrypt (10 rounds)
- JWT utilities in `src/utils/jwt.js`
- Cookie utilities in `src/utils/cookies.js`

#### Logging (Winston)
- Configured in `src/config/logger.js`
- Logs to `logs/error.lg` and `logs/combined.log`
- Console logging in non-production environments
- Service name: `acquisition-api`

#### Validation (Zod)
- All validation schemas in `src/validations/`
- Use `.safeParse()` in controllers
- Format errors with `formatValidationError()` from `#utils/format.js`

## Code Style

### ESLint Rules
- 2-space indentation
- Single quotes
- Semicolons required
- Unix line endings
- Prefer const/arrow functions over var/function
- Unused vars allowed if prefixed with `_`

### Prettier Configuration
- Single quotes, semicolons
- 80 character line width
- 2-space tabs, no hard tabs
- Trailing commas (ES5)
- Arrow function parens: avoid

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (affects logging and cookie security)
- `LOG_LEVEL` - Winston log level (default: 'info')

## Adding New Features

### Adding a New Route
1. Create validation schema in `src/validations/<feature>.validation.js`
2. Create service functions in `src/services/<feature>.service.js`
3. Create controller in `src/controller/<feature>.controller.js`
4. Define routes in `src/routes/<feature>.routes.js`
5. Register routes in `src/app.js`

### Adding Database Models
1. Define schema in `src/models/<model>.model.js` using Drizzle syntax
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply migration
4. Import model in services using `#models/<model>.model.js`

## Testing

No test framework is currently configured. Before adding tests, check for existing test commands in `package.json` or consult the team.
