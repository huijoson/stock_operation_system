<!--
╔══════════════════════════════════════════════════════════════════════════════╗
║ SYNC IMPACT REPORT                                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Version change: 1.0.0 → 1.1.0 (New principle added)                          ║
║                                                                              ║
║ Added Principles:                                                            ║
║   - V. Documentation Language (zh-TW for specs, plans, user-facing docs)    ║
║                                                                              ║
║ Modified Principles: None                                                    ║
║                                                                              ║
║ Removed Sections: None                                                       ║
║                                                                              ║
║ Templates Status:                                                            ║
║   ⚠ plan-template.md - Requires zh-TW content when filled                   ║
║   ⚠ spec-template.md - Requires zh-TW content when filled                   ║
║   ✅ tasks-template.md - Phase structure supports TDD workflow               ║
║                                                                              ║
║ Deferred Items: None                                                         ║
║                                                                              ║
║ Note: Templates remain in English as structural templates.                   ║
║       Actual specs/plans generated from templates MUST use zh-TW.            ║
╚══════════════════════════════════════════════════════════════════════════════╝
-->

# Stock Portfolio Management System Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

TypeScript MUST be used with strict mode enabled for all source files.
All financial calculations MUST use `Decimal.js` to prevent floating-point precision errors.

**Rules**:
- All functions MUST have explicit return types declared
- No `any` types allowed except in exceptional cases with documented justification
- ESLint rules MUST pass with zero warnings before merge
- Prettier formatting MUST be applied consistently (run `npm run format`)
- All business logic MUST reside in `/src/services/` with clear separation of concerns
- Database queries MUST use Prisma ORM - no raw SQL without security review

**Rationale**: Financial applications demand precision and maintainability.
Type safety catches errors at compile time, and Decimal.js ensures accurate currency handling.

### II. Testing Standards (NON-NEGOTIABLE)

All new features MUST follow Test-Driven Development (TDD).
Property-based testing with `fast-check` is REQUIRED for calculation and data-transformation logic.

**Rules**:
- Tests MUST be written before implementation (Red-Green-Refactor)
- Unit tests reside in `/tests/unit/`, property tests in `/tests/property/`
- Coverage threshold: 80% for services, 70% overall
- All financial calculation functions MUST have property-based tests verifying:
  - Commutativity where applicable
  - Boundary conditions (zero, negative, max values)
  - Round-trip consistency
- Integration tests MUST cover API endpoints and database operations
- Tests MUST run in under 60 seconds for the full suite

**Rationale**: TDD ensures code is designed for testability.
Property-based testing catches edge cases that example-based tests miss, critical for financial calculations.

### III. User Experience Consistency

UI components MUST follow established design patterns using Tailwind CSS utility classes.
All user-facing text MUST support Traditional Chinese (zh-TW) localization.

**Rules**:
- Reusable components MUST reside in `/src/components/ui/`
- Domain-specific components belong in `/src/components/{domain}/` (e.g., portfolio, charts)
- Loading states MUST be handled with `/src/app/loading.tsx` pattern
- Error states MUST follow the UX guidelines in `/docs/error-handling-ux-guide.md`
- All interactive elements MUST be keyboard accessible (a11y compliance)
- Charts and visualizations MUST use consistent color schemes across the application
- Form validation MUST use the `useFormValidation` hook for consistency

**Rationale**: Consistency reduces cognitive load for users.
A11y compliance ensures the application is usable by investors with disabilities.

### IV. Performance Requirements

API responses MUST complete within 200ms for standard operations.
Initial page load MUST complete within 3 seconds on 4G connections.

**Rules**:
- Database queries MUST be optimized with appropriate indexes (review Prisma migrations)
- API routes MUST NOT perform N+1 queries
- Heavy calculations MUST be cached using indicator-cache.service pattern
- React components MUST avoid unnecessary re-renders (use React.memo where appropriate)
- Image and chart assets MUST be lazy-loaded
- Bundle size for initial load MUST NOT exceed 500KB gzipped
- Long-running operations MUST show progress feedback via loading states

**Rationale**: Portfolio management requires responsive data access.
Investors need real-time feedback when making financial decisions.

### V. Documentation Language (NON-NEGOTIABLE)

All specifications, plans, and user-facing documentation MUST be written in Traditional Chinese (zh-TW).
Code comments and technical documentation (README, API docs) MAY remain in English for developer accessibility.

**Rules**:
- Feature specifications in `/specs/` MUST use zh-TW
- Implementation plans MUST use zh-TW
- User-facing documentation in `/docs/` MUST use zh-TW
- UI text, labels, and messages MUST use zh-TW
- Error messages displayed to users MUST use zh-TW
- Code comments MAY use English for technical clarity
- README.md and technical setup guides MAY use English or zh-TW

**Rationale**: This system is designed for Taiwan investors.
Native language documentation reduces friction and improves comprehension for the target user base.

## Technology Stack

**Runtime & Framework**:
- Vite 6 with React Router v7 (React SPA) + Express backend
- React 18 with TypeScript
- Node.js (LTS version)

**Styling**:
- Tailwind CSS for utility-first styling
- PostCSS for processing

**Data Layer**:
- PostgreSQL database
- Prisma ORM for type-safe database access
- Decimal.js for precise financial calculations

**Testing**:
- Jest as test runner
- fast-check for property-based testing

**Quality Tools**:
- ESLint for linting
- Prettier for code formatting
- TypeScript strict mode

## Development Workflow

**Before Starting Work**:
1. Pull latest changes from main branch
2. Run `npm install` to ensure dependencies are current
3. Run `npm run type-check` to verify TypeScript compilation
4. Run `npm test` to ensure existing tests pass

**During Development**:
1. Write failing tests first (TDD)
2. Implement minimal code to pass tests
3. Refactor while keeping tests green
4. Run `npm run lint` and fix all issues
5. Run `npm run format` before committing

**Before Merge**:
- All tests MUST pass (`npm test`)
- Lint MUST pass with zero warnings (`npm run lint`)
- Type check MUST pass (`npm run type-check`)
- Database migrations MUST be reviewed for performance impact

## Governance

This constitution supersedes all other development practices in this repository.
All code reviews MUST verify compliance with these principles.

**Amendment Process**:
1. Propose changes via pull request to `.specify/memory/constitution.md`
2. Changes MUST include rationale and impact assessment
3. Breaking changes require MAJOR version bump
4. New principles or significant expansions require MINOR version bump
5. Clarifications and typo fixes require PATCH version bump

**Compliance Review**:
- Constitution check is a gate before feature planning begins
- Violations MUST be documented in plan.md with justification
- Unjustified violations are grounds for blocking merge

**Version**: 1.1.0 | **Ratified**: 2025-11-27 | **Last Amended**: 2025-11-27
