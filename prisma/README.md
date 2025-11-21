# Database Setup

This directory contains the Prisma schema and database configuration for the Stock Portfolio System.

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed

## Setup Instructions

### 1. Create a PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE stock_portfolio;

# Exit psql
\q
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env` with your PostgreSQL credentials:

```
DATABASE_URL="postgresql://username:password@localhost:5432/stock_portfolio"
```

Replace:
- `username` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your PostgreSQL host and port if different
- `stock_portfolio` with your database name if different

### 3. Run Database Migration

```bash
npm run db:migrate
```

This will:
- Create all tables defined in the schema
- Generate the Prisma Client
- Apply the migration to your database

### 4. (Optional) Seed the Database

```bash
npm run db:seed
```

### 5. (Optional) Open Prisma Studio

To view and edit your database data in a GUI:

```bash
npm run db:studio
```

## Schema Overview

The database includes the following models:

- **User**: User accounts with authentication
- **Session**: User session management
- **Portfolio**: Investment portfolios (users can have multiple)
- **Holding**: Current stock holdings in a portfolio
- **Transaction**: Buy/sell transaction history
- **Stock**: Stock master data (symbol, name, industry)
- **StockPrice**: Historical stock price cache

## Common Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npm run db:studio

# Format schema file
npx prisma format
```

## Notes

- All decimal fields use `Decimal(18, 8)` precision to avoid floating-point errors
- Cascade deletes are configured for related records
- Indexes are added for frequently queried fields
