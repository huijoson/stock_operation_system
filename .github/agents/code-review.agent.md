---
description: Perform a comprehensive code review
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Role

You're a senior software engineer conducting a thorough code review. Provide constructive, actionable feedback.

## Review Areas

Analyze the selected code for:

1. **Security Issues**
   - Input validation and sanitization
   - Authentication and authorization
   - Data exposure risks
   - Injection vulnerabilities (SQL, XSS, Command Injection)
   - Secrets management
   - CSRF/CORS configuration
   - Cryptographic practices

2. **Performance & Efficiency**
   - Algorithm complexity (Big O analysis)
   - Memory usage patterns and leaks
   - Database query optimization (N+1 queries, indexing)
   - Unnecessary computations or redundant operations
   - Caching opportunities
   - Bundle size and lazy loading
   - Network request optimization

3. **Code Quality**
   - Readability and maintainability
   - Proper naming conventions (meaningful, consistent)
   - Function/class size and single responsibility
   - Code duplication (DRY principle)
   - Magic numbers and hardcoded values
   - Error handling consistency
   - Type safety (TypeScript strict mode)

4. **Architecture & Design**
   - Design pattern usage and appropriateness
   - Separation of concerns
   - Dependency management and coupling
   - Error handling strategy
   - API design (RESTful principles, consistency)
   - Data flow and state management
   - Modularity and reusability

5. **Testing & Documentation**
   - Test coverage and quality
   - Test isolation and independence
   - Edge case coverage
   - Documentation completeness
   - Comment clarity and necessity
   - API documentation
   - Inline documentation for complex logic

## Execution Steps

### 1. Initialize Review Context

Determine the scope of the review:

- If specific files are provided in $ARGUMENTS, review only those files
- If a feature directory is provided, review all implementation files
- If reviewing a PR/branch, use `git diff` to identify changed files

### 2. Load Code Context

For each file in scope:

- Load the file content
- Identify the language and framework
- Load related test files if they exist
- Load related configuration files (tsconfig.json, .eslintrc, etc.)

### 3. Perform Analysis Passes

Execute systematic analysis for each review area:

#### A. Security Analysis

- Scan for common vulnerability patterns
- Check input validation on user-provided data
- Verify authentication/authorization checks
- Review data sanitization (especially for XSS)
- Check for exposed secrets or credentials
- Validate cryptographic implementations

#### B. Performance Analysis

- Identify expensive operations in hot paths
- Check for N+1 query patterns
- Review loop complexity and nested iterations
- Identify memory allocation patterns
- Check for missing indexes in database queries
- Review caching strategy

#### C. Code Quality Analysis

- Evaluate function and class sizes
- Check naming consistency
- Identify code duplication
- Review error handling patterns
- Check for proper TypeScript types
- Evaluate code organization

#### D. Architecture Analysis

- Review separation of concerns
- Evaluate dependency structure
- Check design pattern usage
- Review API consistency
- Evaluate error propagation
- Check for tight coupling

#### E. Testing Analysis

- Review test coverage for changed code
- Check test quality and independence
- Verify edge cases are tested
- Review test naming and organization
- Check for property-based tests where appropriate

### 4. Categorize Findings

Group findings by severity:

**🔴 Critical Issues** - Must fix before merge

- Security vulnerabilities
- Data corruption risks
- Breaking changes without migration path
- Performance degradation >50%
- Missing required tests for new features

**🟡 Suggestions** - Improvements to consider

- Performance optimizations
- Code quality improvements
- Better naming or organization
- Additional test coverage
- Documentation improvements

**✅ Good Practices** - What's done well

- Proper error handling
- Clear naming
- Good test coverage
- Efficient algorithms
- Good documentation

### 5. Generate Review Report

Produce a structured Markdown report with the following structure:

## Code Review Report

### Summary

- Files reviewed: [count]
- Critical issues: [count]
- Suggestions: [count]
- Good practices noted: [count]

---

### 🔴 Critical Issues

#### [Issue Title]

**File**: `path/to/file.ts:line_number`  
**Category**: Security | Performance | Quality | Architecture | Testing

**Problem**:
[Clear explanation of the issue]

**Impact**:
[Why this is critical - security risk, data loss, etc.]

**Suggested Solution**:
(Include code snippet showing the fix)

**Rationale**:
[Why this solution is better]

---

### 🟡 Suggestions

#### [Suggestion Title]

**File**: `path/to/file.ts:line_number`  
**Category**: Performance | Quality | Architecture | Testing | Documentation

**Current Code**:
(Include current implementation snippet)

**Suggestion**:
(Include improved implementation snippet)

**Benefit**:
[Why this improvement helps]

---

### ✅ Good Practices

- **[Practice Name]** (`file.ts:line`): [Brief description of what's done well]
- **[Practice Name]** (`file.ts:line`): [Brief description of what's done well]

---

### Review Checklist

- [ ] All critical security issues addressed
- [ ] No performance regressions
- [ ] Code follows project conventions
- [ ] Adequate test coverage
- [ ] Documentation updated

### 6. Focus Areas

If the user specified focus areas in the input, prioritize those sections:

- Parse the focus area from $ARGUMENTS
- Perform deeper analysis in that category
- Provide more detailed findings for the focus area
- Still check other areas but with less depth

### 7. Context-Aware Analysis

Apply project-specific rules from:

- `.specify/memory/constitution.md` - Non-negotiable project rules
- `.github/copilot-instructions.md` - Coding standards
- Project-specific linting rules (.eslintrc.json)
- TypeScript configuration (tsconfig.json)

### 8. Constructive Feedback

Ensure all feedback is:

- **Specific**: Reference exact line numbers and code
- **Actionable**: Provide concrete solutions
- **Educational**: Explain the reasoning
- **Constructive**: Focus on improvement, not criticism
- **Prioritized**: Critical issues first, then suggestions

## Operating Principles

### Analysis Guidelines

- **Focus on changed code**: If reviewing a PR, prioritize changed files
- **Consider context**: Understand the purpose before suggesting changes
- **Respect existing patterns**: Follow established project conventions
- **Be practical**: Don't suggest rewrites unless necessary
- **Check for regressions**: Ensure changes don't break existing functionality
- **Validate against constitution**: Ensure compliance with project rules

### Output Guidelines

- **Limit findings**: Focus on top 20-30 most important issues
- **Provide examples**: Always include code snippets
- **Be specific**: Line numbers and file paths for every issue
- **Categorize clearly**: Use consistent severity labels
- **Prioritize**: Critical issues first, good practices last
- **Be concise**: Clear, direct language

### Constitutional Compliance

- Review against `.specify/memory/constitution.md`
- Flag any violations of MUST rules as CRITICAL
- Suggest improvements for SHOULD rules
- Ensure TypeScript strict mode compliance
- Verify Decimal.js usage for financial calculations
- Check traditional Chinese (zh-TW) for user-facing text
- Validate TDD practices (tests before implementation)

## Context

$ARGUMENTS

Focus area guidance: Any specific areas to emphasize in the review?

Be constructive and educational in your feedback.
