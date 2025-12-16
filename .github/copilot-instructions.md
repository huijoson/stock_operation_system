# GitHub Copilot Context - Stock Portfolio System

**Project**: stock-portfolio-system  
**Last updated**: 2025-11-27

## Active Technologies

- TypeScript 5.3+ (strict mode) (001-portfolio-insights)
- Next.js 15 (App Router) + React 18 (001-portfolio-insights)
- PostgreSQL + Prisma ORM (001-portfolio-insights)
- Tailwind CSS (001-portfolio-insights)
- Decimal.js for financial calculations (001-portfolio-insights)
- Jest + fast-check (property-based testing) (001-portfolio-insights)
- Finnhub API + SEC EDGAR (news integration) (001-portfolio-insights)

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components (ui/, portfolio/, charts/, news/)
├── services/      # Business logic services
├── lib/           # Utilities and shared code
├── hooks/         # React hooks
└── types/         # TypeScript type definitions

prisma/            # Database schema and migrations
tests/
├── property/      # Property-based tests (fast-check)
└── unit/          # Unit tests
```

## Commands

```bash
npm test           # Run all tests
npm run lint       # ESLint check
npm run type-check # TypeScript check
npm run format     # Prettier formatting
npm run dev        # Start development server
npx prisma migrate dev  # Run database migrations
```

## Language Conventions

### TypeScript
- Strict mode required (`"strict": true`)
- No `any` types without justification
- Explicit return types on all functions
- Use Decimal.js for all financial calculations

### Testing
- TDD: Write tests before implementation
- Property-based testing with fast-check for financial calculations
- 80% coverage minimum for services

### UI
- All user-facing text in Traditional Chinese (zh-TW)
- Tailwind CSS for styling
- Keyboard accessible components

## Constitution

See `.specify/memory/constitution.md` for non-negotiable rules.

## Recent Changes

- 001-portfolio-insights: Added Realized P&L (FIFO), Risk Assessment, Holding Advice, News Integration

## Feature Specs

Current feature: [001-portfolio-insights](specs/001-portfolio-insights/plan.md)
- Realized P&L with FIFO calculation
- Risk assessment from technical indicators + news sentiment
- Holding advice (reduce/hold/add)
- News integration with credibility verification
