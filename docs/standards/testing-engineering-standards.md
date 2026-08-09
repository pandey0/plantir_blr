# Testing Engineering Standards

## Purpose

This document defines general standards for testing production software
across frontend, backend, APIs, databases, distributed systems, and
end-to-end user workflows.

The goal is not to maximize the number of tests.

The goal is to build confidence that:

``` text
The software does what it should
+
Important failures are handled
+
Changes do not unexpectedly break existing behavior
+
Production-critical workflows are protected
```

------------------------------------------------------------------------

# 1. Core Testing Principles

Follow these principles:

1.  Test behavior, not implementation details.
2.  Test important business rules.
3.  Prefer deterministic tests.
4.  Keep tests isolated.
5.  Make tests readable.
6.  Keep tests fast where possible.
7.  Use realistic integration tests where necessary.
8.  Test failure paths, not only success paths.
9.  Do not chase 100% coverage blindly.
10. Every production bug should trigger consideration of a regression
    test.

------------------------------------------------------------------------

# 2. Testing Pyramid

A healthy test suite generally contains more fast tests than expensive
tests.

``` text
             E2E
            /   \
           /     \
      Integration
         /       \
        /         \
      Unit / Component
```

Typical distribution:

``` text
Many
 ↓
Unit / Component
 ↓
Integration
 ↓
API / Contract
 ↓
Few but important
E2E
```

This is a guideline, not a strict mathematical rule.

------------------------------------------------------------------------

# 3. Test Types

A production application can use:

``` text
Unit Tests
Component Tests
Integration Tests
API Tests
Contract Tests
End-to-End Tests
Visual Tests
Accessibility Tests
Performance Tests
Load Tests
Security Tests
Regression Tests
Smoke Tests
```

Each solves a different problem.

------------------------------------------------------------------------

# 4. Unit Tests

Unit tests verify small pieces of logic in isolation.

Good candidates:

-   Pure functions.
-   Business rules.
-   Calculations.
-   Parsers.
-   Validators.
-   Formatters.
-   State transformations.

Example:

``` ts
calculateDiscount(price, percentage)
```

Test:

``` text
100 + 10%
→ 90
```

Also test:

``` text
0
negative values
maximum values
invalid values
rounding
```

Unit tests should generally be:

-   Fast.
-   Deterministic.
-   Independent.
-   Easy to diagnose.

------------------------------------------------------------------------

# 5. What NOT to Unit Test

Do not unit test every trivial line of code just for coverage.

For example:

``` ts
function getName(user) {
  return user.name;
}
```

may not need its own elaborate test.

Prioritize:

``` text
Business logic
Edge cases
Complex transformations
Security-sensitive logic
Important state transitions
```

------------------------------------------------------------------------

# 6. Component Tests

Frontend component tests verify meaningful UI behavior.

Example:

``` text
LoginForm
```

Test:

``` text
User enters invalid email
→ validation error appears
```

and:

``` text
User enters valid credentials
→ submit occurs
→ loading state appears
```

Test behavior rather than internal implementation.

Avoid tests that assert:

``` text
useState was called
```

when what actually matters is:

``` text
The UI shows the expected state.
```

------------------------------------------------------------------------

# 7. Integration Tests

Integration tests verify that multiple components work together.

Examples:

``` text
Service
 +
Repository
 +
Database
```

or:

``` text
Frontend
 +
API
```

or:

``` text
Authentication
 +
Authorization
 +
Database
```

Integration tests catch problems that isolated unit tests cannot.

------------------------------------------------------------------------

# 8. Database Integration Tests

When testing database behavior, prefer a real test database where
practical.

Test:

-   Constraints.
-   Foreign keys.
-   Transactions.
-   Unique constraints.
-   Query behavior.
-   Repository behavior.
-   Migrations.
-   Concurrency-sensitive behavior.

Do not mock the database for every test.

Mocks cannot prove that the real SQL/database behavior is correct.

------------------------------------------------------------------------

# 9. API Tests

API tests verify HTTP contracts.

Example:

``` text
POST /api/orders
```

Test:

``` text
Valid request
→ 201
```

Also:

``` text
Invalid input
→ 400/422

Unauthenticated
→ 401

Unauthorized
→ 403

Missing resource
→ 404

Conflict
→ 409

Unexpected failure
→ 500
```

Test both response shape and important behavior.

------------------------------------------------------------------------

# 10. Contract Testing

Contract tests verify that systems agree on API contracts.

Example:

``` text
Frontend
   ↓
GET /api/users
   ↓
Backend
```

The contract defines:

``` json
{
  "id": "string",
  "name": "string",
  "email": "string"
}
```

Contract testing helps prevent:

``` text
Backend changes response
        ↓
Frontend silently breaks
```

Use shared/generated schemas where practical.

------------------------------------------------------------------------

# 11. End-to-End Tests

E2E tests verify complete user workflows.

Example:

``` text
Open application
 ↓
Login
 ↓
Create project
 ↓
Invite user
 ↓
User accepts invite
 ↓
Verify project
```

E2E tests should focus on critical workflows.

Good E2E candidates:

-   Login.
-   Signup.
-   Checkout.
-   Payments.
-   Core CRUD workflow.
-   Permissions.
-   Critical onboarding.
-   Major business workflows.

Do not make every tiny UI interaction an E2E test.

------------------------------------------------------------------------

# 12. Smoke Tests

Smoke tests verify that the system is basically alive.

Examples:

``` text
Homepage loads
Login works
Health endpoint responds
Database connection works
Critical API responds
```

Run smoke tests after deployments.

A smoke test should quickly answer:

> Is the application fundamentally working?

------------------------------------------------------------------------

# 13. Regression Tests

Whenever a bug is discovered:

``` text
Bug
 ↓
Fix
 ↓
Regression test
```

The test should fail before the fix and pass after the fix when
practical.

This prevents the same bug from returning.

------------------------------------------------------------------------

# 14. Happy Path vs Failure Path

Do not test only successful behavior.

For every important feature, consider:

``` text
Happy Path
Validation Failure
Authentication Failure
Authorization Failure
Not Found
Conflict
Network Failure
Timeout
Database Failure
External Service Failure
Duplicate Request
```

Example:

``` text
Create Order
```

Test:

``` text
Valid order
Empty cart
Invalid product
Insufficient inventory
Unauthorized user
Duplicate request
Payment failure
Database failure
```

------------------------------------------------------------------------

# 15. Edge Cases

Edge cases often contain the most valuable bugs.

Consider:

``` text
0
1
maximum value
empty string
null
undefined
empty array
very large input
duplicate data
special characters
unicode
timezone boundaries
date boundaries
concurrent requests
expired sessions
```

Do not test only the normal case.

------------------------------------------------------------------------

# 16. Boundary Testing

Test around limits.

If a rule says:

``` text
Username: 3–30 characters
```

test:

``` text
2
3
4
29
30
31
```

Boundary tests are often more valuable than random tests.

------------------------------------------------------------------------

# 17. Equivalence Classes

Group inputs that should behave similarly.

Example:

``` text
Age 18–100 → valid
Age <18 → invalid
Age >100 → invalid
```

You do not necessarily need to test every possible number.

Test representative values from each meaningful class.

------------------------------------------------------------------------

# 18. Property-Based Testing

For complex algorithms, test properties rather than only specific
examples.

Example:

``` text
Sorting a list should produce
a result that is ordered
and contains the same elements.
```

Useful for:

-   Algorithms.
-   Parsers.
-   Serialization.
-   Data transformations.
-   Mathematical logic.

Use when the problem benefits from generated inputs.

------------------------------------------------------------------------

# 19. Test Data

Keep test data intentional.

Prefer:

``` text
Factory
Fixture
Builder
```

Example:

``` ts
createUser({
  role: "admin"
});
```

instead of manually constructing huge objects everywhere.

Avoid sharing mutable test data between tests.

------------------------------------------------------------------------

# 20. Test Isolation

Each test should be independent.

Avoid:

``` text
Test A creates user
 ↓
Test B assumes user exists
 ↓
Test C modifies user
```

Instead:

``` text
Test A → own data
Test B → own data
Test C → own data
```

Tests should be runnable individually and in any reasonable order.

------------------------------------------------------------------------

# 21. Determinism

Tests should produce the same result consistently.

Avoid uncontrolled dependencies on:

-   Current time.
-   Random numbers.
-   External APIs.
-   Network conditions.
-   Machine-specific behavior.
-   Test execution order.

Use controlled clocks and deterministic random seeds where appropriate.

------------------------------------------------------------------------

# 22. Mocking

Mocks replace real dependencies.

Useful for:

``` text
External payment provider
Email provider
Third-party API
Expensive service
Unreliable dependency
```

Do not mock everything.

Over-mocking can create:

``` text
Tests pass
+
Real system fails
```

Mock at meaningful boundaries.

------------------------------------------------------------------------

# 23. Stubs, Fakes, and Mocks

Understand the difference.

### Stub

Provides predefined responses.

### Fake

Simplified working implementation.

Example:

``` text
In-memory repository
```

### Mock

Verifies interactions.

Use the simplest test double that provides confidence.

------------------------------------------------------------------------

# 24. External API Testing

Do not make your test suite depend on real third-party APIs unless there
is a deliberate reason.

Instead:

``` text
Application
 ↓
Adapter
 ↓
Mock/Fake Provider
```

Then have a smaller number of integration/contract tests against the
actual provider where necessary.

------------------------------------------------------------------------

# 25. Testing Authentication

Authentication tests should cover:

``` text
Valid login
Invalid password
Unknown user
Expired session
Logout
Password reset
Email verification
OAuth callback
Token expiration
Refresh token
Session revocation
```

Also test:

``` text
Can unauthenticated users access protected resources?
```

------------------------------------------------------------------------

# 26. Testing Authorization

Authorization deserves explicit tests.

For every protected resource consider:

``` text
Unauthenticated
Authenticated but unauthorized
Authorized
Resource owner
Different tenant
Admin
Non-admin
```

Example:

``` text
User A
 ↓
Project A → allowed

User A
 ↓
Project B → forbidden
```

This should be tested explicitly.

------------------------------------------------------------------------

# 27. Multi-Tenant Testing

For SaaS systems:

``` text
Tenant A
Tenant B
```

must remain isolated.

Test:

``` text
Tenant A user
 ↓
Request Tenant B resource
 ↓
Denied
```

Also test:

``` text
Tenant A search
→ only Tenant A data
```

This is one of the highest-priority security test categories for
multi-tenant applications.

------------------------------------------------------------------------

# 28. Security Testing

Test for:

-   Broken authorization.
-   Authentication bypass.
-   IDOR/BOLA.
-   Input injection.
-   XSS.
-   CSRF where applicable.
-   SSRF where applicable.
-   Rate-limit bypass.
-   File upload vulnerabilities.
-   Session problems.
-   Secret exposure.

Automated security scanning should complement, not replace, manual
security review.

------------------------------------------------------------------------

# 29. Accessibility Testing

Frontend applications should test:

-   Keyboard navigation.
-   Form labels.
-   Focus behavior.
-   Accessible names.
-   ARIA usage.
-   Color contrast.
-   Screen-reader behavior where appropriate.

Automated accessibility tools are useful but cannot detect every
accessibility problem.

------------------------------------------------------------------------

# 30. Visual Regression Testing

Visual regression tests compare UI screenshots or rendered output.

Useful for:

-   Design systems.
-   Critical pages.
-   Complex dashboards.
-   Responsive layouts.
-   Shared components.

Be careful about false positives caused by:

-   Fonts.
-   Rendering differences.
-   Browser versions.
-   Dynamic content.

------------------------------------------------------------------------

# 31. Cross-Browser Testing

For browser applications, test the browsers your users actually use.

Consider:

``` text
Chrome
Firefox
Safari
Edge
Mobile browsers
```

Do not test every browser combination unless the product requires it.

Prioritize based on real user traffic and business requirements.

------------------------------------------------------------------------

# 32. Responsive Testing

Test important breakpoints:

``` text
Mobile
Tablet
Desktop
Large screen
```

Check:

-   Navigation.
-   Forms.
-   Tables.
-   Dialogs.
-   Touch interactions.
-   Text wrapping.
-   Overflow.

Do not assume that a responsive CSS framework guarantees a responsive
UI.

------------------------------------------------------------------------

# 33. Performance Testing

Performance tests measure system behavior under realistic workloads.

Measure:

``` text
Latency
Throughput
CPU
Memory
Database load
Network
Error rate
```

Important metrics:

``` text
p50
p95
p99
```

Do not rely only on average latency.

------------------------------------------------------------------------

# 34. Load Testing

Load testing asks:

> How does the application behave under expected traffic?

Example:

``` text
100 users
500 users
1,000 users
10,000 users
```

Test realistic scenarios rather than hitting one endpoint repeatedly
without context.

------------------------------------------------------------------------

# 35. Stress Testing

Stress testing asks:

> What happens when the system exceeds its expected capacity?

Observe:

``` text
Failure point
Recovery behavior
Error rate
Queue growth
Database saturation
Memory behavior
```

A good system should fail predictably rather than catastrophically.

------------------------------------------------------------------------

# 36. Soak Testing

Soak testing runs a realistic workload for an extended period.

Useful for detecting:

-   Memory leaks.
-   Connection leaks.
-   Queue buildup.
-   Resource exhaustion.
-   Gradual performance degradation.

------------------------------------------------------------------------

# 37. Concurrency Testing

Test operations that can happen simultaneously.

Examples:

``` text
Two users buy the last item
Two requests update the same record
Two webhooks arrive simultaneously
Two password reset requests
Two workers process the same job
```

Verify:

``` text
No duplicate state
No lost updates
No broken invariants
```

------------------------------------------------------------------------

# 38. Distributed System Testing

For distributed systems, test failures such as:

``` text
Database unavailable
Redis unavailable
Queue unavailable
External API timeout
Network timeout
Worker crashes
Duplicate message
Out-of-order event
Partial deployment
```

Systems should degrade or recover predictably.

------------------------------------------------------------------------

# 39. Queue / Worker Testing

For background jobs, test:

``` text
Job succeeds
Job fails
Job retries
Job times out
Job is duplicated
Job is delayed
Job exceeds retry count
Dead-letter behavior
```

Workers should be idempotent where possible.

------------------------------------------------------------------------

# 40. Webhook Testing

Test:

``` text
Valid webhook
Invalid signature
Malformed payload
Duplicate webhook
Delayed webhook
Out-of-order webhook
Unknown event
Provider retry
```

Verify that duplicate events do not create duplicate effects.

------------------------------------------------------------------------

# 41. Testing Payments

Payment flows require extra care.

Test:

``` text
Payment success
Payment failure
Payment cancellation
Webhook success
Webhook duplicate
Webhook invalid signature
Delayed webhook
Client closes browser
Payment succeeds but frontend fails
Order creation fails after payment
```

Never rely only on frontend tests for payment correctness.

------------------------------------------------------------------------

# 42. Test Environments

Maintain clear environments:

``` text
Local
 ↓
CI/Test
 ↓
Staging
 ↓
Production
```

Avoid using production data in ordinary development/testing.

If production-like data is required, anonymize it appropriately.

------------------------------------------------------------------------

# 43. Test Database

Use isolated test databases.

Possible approaches:

``` text
Docker PostgreSQL
Testcontainers
Ephemeral database
Dedicated CI database
```

Do not run destructive integration tests against production.

------------------------------------------------------------------------

# 44. Migrations Testing

Test:

``` text
Fresh database
 ↓
Run migrations
 ↓
Seed
 ↓
Run tests
```

Also test migrations against existing data for risky schema changes.

------------------------------------------------------------------------

# 45. CI Testing

A typical CI pipeline:

``` text
Pull Request
 ↓
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
Build
 ↓
E2E / Critical Tests
 ↓
Security Checks
 ↓
Deploy
```

Fast feedback should happen early.

------------------------------------------------------------------------

# 46. Test Parallelization

Independent tests can run in parallel.

Example:

``` text
Unit Tests ─────┐
Lint ───────────┼──→ Build
Type Check ─────┤
Integration ────┘
```

But ensure tests do not share mutable resources unsafely.

------------------------------------------------------------------------

# 47. Flaky Tests

A flaky test passes and fails without a meaningful code change.

Common causes:

-   Timing assumptions.
-   Shared state.
-   Race conditions.
-   External dependencies.
-   Randomness.
-   Poor cleanup.
-   Test ordering.

Do not simply retry flaky tests forever.

Find and fix the root cause.

------------------------------------------------------------------------

# 48. Test Timeouts

Every asynchronous test should have sensible timeouts.

Avoid tests that hang indefinitely.

Timeouts should be:

``` text
Long enough for legitimate execution
+
Short enough to detect failure quickly
```

Do not solve slow tests by blindly increasing timeouts.

------------------------------------------------------------------------

# 49. Test Naming

Test names should explain behavior.

Good:

``` text
should reject order creation when inventory is insufficient
```

Bad:

``` text
test1
works
shouldTestOrder
```

A useful test name answers:

``` text
Given
When
Then
```

Example:

``` text
Given an expired session
When the user requests a protected resource
Then the API returns 401
```

------------------------------------------------------------------------

# 50. Arrange / Act / Assert

A useful test structure:

``` text
Arrange
 ↓
Act
 ↓
Assert
```

Example:

``` ts
// Arrange
const user = createUser();

// Act
const result = await createOrder(user);

// Assert
expect(result.status).toBe("created");
```

Keep tests easy to scan.

------------------------------------------------------------------------

# 51. Given / When / Then

For business behavior:

``` text
Given
When
Then
```

Example:

``` text
Given a shipped order
When the user attempts cancellation
Then cancellation is rejected
```

This is especially useful for acceptance and behavior-driven testing.

------------------------------------------------------------------------

# 52. Assertions

Assertions should verify meaningful outcomes.

Prefer:

``` text
expect(order.status).toBe("cancelled")
```

over:

``` text
expect(mockService.cancel).toHaveBeenCalled()
```

when the actual business result is what matters.

Interaction assertions are useful when the interaction itself is part of
the contract.

------------------------------------------------------------------------

# 53. Test Coverage

Track coverage, but do not worship it.

Coverage can measure:

``` text
Lines
Branches
Functions
Statements
```

High coverage does not guarantee good tests.

Example:

``` text
100% coverage
+
poor assertions
=
low confidence
```

Prioritize:

``` text
Business-critical code
Security-sensitive code
Complex logic
Failure handling
```

------------------------------------------------------------------------

# 54. Mutation Testing

Mutation testing intentionally changes code to see whether tests detect
the change.

Conceptually:

``` text
Original code
 ↓
Introduce small bug
 ↓
Run tests
 ↓
Tests should fail
```

Useful for evaluating test quality, especially for critical logic.

Use selectively because it can be computationally expensive.

------------------------------------------------------------------------

# 55. Contract and Schema Testing

Validate that API contracts remain compatible.

Test:

``` text
Request schema
Response schema
Error schema
Enum values
Pagination
Authentication requirements
```

For shared schemas, consider generating types from a single source of
truth.

------------------------------------------------------------------------

# 56. Snapshot Testing

Snapshots can be useful for:

-   Stable structured output.
-   Complex serialized data.
-   Carefully selected UI output.

Do not use snapshots as a replacement for meaningful assertions.

Huge snapshots are difficult to review and can allow accidental changes
to pass.

------------------------------------------------------------------------

# 57. Test Maintainability

Tests are production code too.

Keep them:

-   Readable.
-   Organized.
-   DRY where useful.
-   Explicit.
-   Fast.
-   Stable.

Avoid creating elaborate test frameworks that are harder to understand
than the application.

------------------------------------------------------------------------

# 58. Test Folder Structure

A possible structure:

``` text
src/
├── features/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── auth.test.ts
│   │
│   └── orders/
│       ├── order.service.ts
│       └── order.test.ts
│
tests/
├── integration/
├── api/
├── e2e/
├── fixtures/
├── factories/
└── helpers/
```

Choose one consistent convention.

------------------------------------------------------------------------

# 59. Testing Production Bugs

When production breaks:

``` text
Incident
 ↓
Reproduce
 ↓
Write regression test
 ↓
Fix
 ↓
Verify
 ↓
Deploy
```

The regression test becomes permanent protection.

------------------------------------------------------------------------

# 60. Release Testing

Before a significant release:

``` text
[ ] Unit tests pass
[ ] Integration tests pass
[ ] API tests pass
[ ] Critical E2E tests pass
[ ] Build succeeds
[ ] Migrations tested
[ ] Security checks pass
[ ] Accessibility checks pass
[ ] Performance acceptable
[ ] Smoke tests pass
```

For risky releases:

``` text
Deploy
 ↓
Smoke tests
 ↓
Monitor
 ↓
Gradual rollout
 ↓
Full rollout
```

------------------------------------------------------------------------

# 61. Feature Flags

Feature flags can reduce release risk.

Example:

``` text
Feature deployed
 ↓
Flag OFF
 ↓
Test in production environment
 ↓
Enable for internal users
 ↓
Enable for 10%
 ↓
Enable for 50%
 ↓
Enable for everyone
```

Test both:

``` text
Flag ON
Flag OFF
```

Do not let feature flags accumulate indefinitely.

------------------------------------------------------------------------

# 62. Production Smoke Testing

After deployment, verify:

``` text
Application loads
Authentication works
Critical API works
Database works
Critical workflow works
```

Then monitor:

``` text
Error rate
Latency
Database
Queues
External services
```

------------------------------------------------------------------------

# 63. Testing Checklist by Feature

For every feature, consider:

``` text
[ ] Happy path
[ ] Validation failure
[ ] Empty state
[ ] Loading state
[ ] Error state
[ ] Authentication
[ ] Authorization
[ ] Resource ownership
[ ] Multi-tenant isolation
[ ] Duplicate request
[ ] Concurrency
[ ] External dependency failure
[ ] Database failure
[ ] Edge cases
[ ] Accessibility
[ ] Responsive UI
[ ] Performance
[ ] Regression coverage
```

Not every feature needs every item, but the checklist forces the team to
think about them.

------------------------------------------------------------------------

# 64. Testing Priorities

When time is limited, prioritize:

## Tier 1 --- Critical

``` text
Authentication
Authorization
Payments
Data integrity
Core business rules
Critical workflows
Security boundaries
```

## Tier 2 --- Important

``` text
Major CRUD flows
API contracts
Database repositories
Important UI components
Error handling
```

## Tier 3 --- Nice to have

``` text
Minor UI states
Rare edge cases
Low-risk formatting
Non-critical visual details
```

------------------------------------------------------------------------

# 65. Golden Rules

1.  Test behavior, not implementation details.
2.  Test business-critical behavior first.
3.  Test both success and failure paths.
4.  Keep tests deterministic.
5.  Keep tests isolated.
6.  Avoid unnecessary mocking.
7.  Use real databases for important database integration tests.
8.  Test authentication and authorization explicitly.
9.  Test resource ownership and tenant isolation.
10. Test concurrency where state can conflict.
11. Make background jobs idempotent and test retries.
12. Test webhook duplication and invalid signatures.
13. Test payment flows server-side.
14. Add regression tests for production bugs.
15. Do not chase 100% coverage blindly.
16. Fix flaky tests instead of hiding them with retries.
17. Keep E2E tests focused on critical workflows.
18. Run fast tests early in CI.
19. Test migrations before production.
20. Test security boundaries explicitly.
21. Test accessibility for important UI flows.
22. Measure performance under realistic workloads.
23. Keep test data isolated.
24. Never use production data casually in tests.
25. Make tests understandable to another developer.
26. Use feature flags carefully and test both states.
27. Verify deployments with smoke tests.
28. Treat tests as production code.
29. Prefer a smaller trustworthy suite over a huge fragile suite.
30. Every important bug should become an opportunity for permanent
    regression coverage.

------------------------------------------------------------------------

# 66. Final Testing Mental Model

For every feature, ask:

``` text
1. What should happen?
2. What should never happen?
3. What happens with invalid input?
4. What happens when the user is not authenticated?
5. What happens when the user is authenticated but unauthorized?
6. What happens when the data does not exist?
7. What happens when the request is repeated?
8. What happens when two requests happen simultaneously?
9. What happens when the database fails?
10. What happens when an external service fails?
11. What happens when the network fails?
12. What happens when the system is under load?
13. What happens on mobile/accessibility interfaces?
14. What happens after deployment?
15. What test will prevent this behavior from breaking later?
```

The goal is not:

``` text
"100% test coverage"
```

The goal is:

``` text
High confidence
+
Fast feedback
+
Important behavior protected
+
Failures understood
+
Regression prevented
```

That is the foundation of production-grade testing.
