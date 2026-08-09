# Software Engineering Practices Standards

## Purpose

This document defines general software engineering standards that apply
across frontend, backend, databases, infrastructure, AI, and distributed
systems.

These practices are the foundation underneath the other engineering
standards.

The goal is to build software that is:

``` text
Readable
+
Maintainable
+
Testable
+
Modular
+
Reviewable
+
Reliable
+
Easy to change
```

------------------------------------------------------------------------

# 1. Core Principles

1.  Prefer simple solutions.
2.  Optimize for maintainability, not cleverness.
3.  Keep responsibilities separated.
4.  Minimize unnecessary coupling.
5.  Make dependencies explicit.
6.  Write code for the next engineer, not only yourself.
7.  Automate repetitive processes.
8.  Review changes before merging.
9.  Refactor continuously.
10. Document decisions that are not obvious from the code.
11. Treat technical debt as something to manage deliberately.
12. Prefer small, reversible changes.

------------------------------------------------------------------------

# 2. Code Should Be Easy to Change

A useful test of code quality is:

> How difficult is it to change one behavior without breaking unrelated
> behavior?

Good architecture makes:

``` text
Small change
 ↓
Small affected area
 ↓
Small test surface
 ↓
Small deployment risk
```

Avoid designs where:

``` text
Small change
 ↓
Modify 15 files
 ↓
Break unrelated systems
```

------------------------------------------------------------------------

# 3. Separation of Concerns

Different responsibilities should live in appropriate layers.

Example:

``` text
Controller
 ↓
Application Service
 ↓
Domain Logic
 ↓
Repository
 ↓
Database
```

Avoid putting:

``` text
Validation
+
Business logic
+
SQL
+
HTTP response formatting
```

into one function.

------------------------------------------------------------------------

# 4. Single Responsibility

A module should have a focused responsibility.

Bad:

``` text
UserService
 ├── Authentication
 ├── Email
 ├── Payments
 ├── PDF generation
 └── Analytics
```

Prefer focused modules:

``` text
AuthService
EmailService
PaymentService
PdfService
AnalyticsService
```

Do not interpret this as "one function per file."

The goal is cohesive responsibilities.

------------------------------------------------------------------------

# 5. Cohesion

Cohesion measures how closely related the responsibilities inside a
module are.

High cohesion:

``` text
PaymentService
 ├── authorize
 ├── capture
 ├── refund
 └── payment status
```

Low cohesion:

``` text
Utils
 ├── calculateTax
 ├── sendEmail
 ├── parseCSV
 ├── createJWT
 └── resizeImage
```

Avoid dumping unrelated functionality into generic utility files.

------------------------------------------------------------------------

# 6. Coupling

Coupling describes how strongly components depend on each other.

Prefer:

``` text
Service A
 ↓
Small interface
 ↓
Service B
```

Avoid:

``` text
A
 ↕
B
 ↕
C
 ↕
D
```

where every component knows internal implementation details of the
others.

------------------------------------------------------------------------

# 7. Dependency Direction

Dependencies should point toward stable abstractions where practical.

Avoid:

``` text
Business Logic
 ↓
Specific Database Implementation
```

when the business layer does not need to know database details.

Prefer:

``` text
Business Logic
 ↓
Repository Interface
 ↓
Database Implementation
```

Do not introduce abstractions solely for theoretical purity.

------------------------------------------------------------------------

# 8. SOLID Principles

SOLID is a useful set of design principles.

``` text
S → Single Responsibility
O → Open/Closed
L → Liskov Substitution
I → Interface Segregation
D → Dependency Inversion
```

Use SOLID as a design tool, not as a reason to create unnecessary
classes.

------------------------------------------------------------------------

# 9. Open/Closed Principle

Software should be designed so behavior can often be extended without
modifying stable code excessively.

Example:

Instead of:

``` text
if paymentType == "stripe"
if paymentType == "razorpay"
if paymentType == "paypal"
```

everywhere, use a focused payment interface when multiple
implementations genuinely exist.

Avoid premature abstraction when only one implementation exists.

------------------------------------------------------------------------

# 10. Dependency Inversion

High-level business logic should not depend unnecessarily on low-level
implementation details.

Example:

``` text
OrderService
 ↓
PaymentGateway
 ↓
StripePaymentGateway
```

This improves:

``` text
Testing
Replacement
Isolation
```

------------------------------------------------------------------------

# 11. DRY

DRY means:

> Don't Repeat Yourself.

Do not duplicate the same business rule in multiple places.

Bad:

``` text
Frontend calculates tax
Backend calculates tax
Worker calculates tax
```

if these implementations can diverge.

Prefer a clear source of truth.

But avoid over-abstraction.

Two similar pieces of code are not automatically the same abstraction.

------------------------------------------------------------------------

# 12. KISS

Keep solutions simple.

Prefer:

``` text
One clear function
```

over:

``` text
Five abstraction layers
```

when the problem is simple.

Complexity should be earned by real requirements.

------------------------------------------------------------------------

# 13. YAGNI

YAGNI:

> You Aren't Gonna Need It.

Avoid building:

``` text
Plugin system
Multi-region architecture
Five database adapters
Ten feature flags
```

before the product actually needs them.

Build for known requirements while leaving reasonable extension points.

------------------------------------------------------------------------

# 14. Readability

Code should communicate intent.

Prefer:

``` typescript
const activeUsers = users.filter(user => user.isActive);
```

over clever transformations that require mental decoding.

Good code minimizes the amount of reasoning required by the reader.

------------------------------------------------------------------------

# 15. Naming

Names should describe intent.

Prefer:

``` text
calculateOrderTotal
getActiveUsers
sendPasswordResetEmail
```

over:

``` text
calc
getData
process
handle
doStuff
```

Avoid misleading names.

Names should remain accurate as behavior evolves.

------------------------------------------------------------------------

# 16. Boolean Naming

Boolean variables should read naturally.

Prefer:

``` text
isActive
hasPermission
canEdit
shouldRetry
```

Avoid:

``` text
activeFlag
permissionValue
check
```

------------------------------------------------------------------------

# 17. Function Size

There is no universal line limit.

A function should be small enough that its purpose is easy to
understand.

Extract code when:

``` text
Logic has a distinct responsibility
+
It is reusable
+
It is independently testable
+
The parent function becomes easier to understand
```

Do not extract every three lines into a new function without reason.

------------------------------------------------------------------------

# 18. Avoid Deep Nesting

Avoid deeply nested logic:

``` text
if
 └── if
      └── if
           └── if
```

Prefer:

``` text
Validate
 ↓
Return early
 ↓
Continue main flow
```

Guard clauses can improve readability.

------------------------------------------------------------------------

# 19. Error Handling

Errors should be handled intentionally.

Distinguish:

``` text
Expected business error
Validation error
Authentication error
Authorization error
Dependency failure
Programming bug
System failure
```

Do not catch every error and silently continue.

------------------------------------------------------------------------

# 20. Error Propagation

Do not hide failures.

Bad:

``` text
try {
   operation();
} catch {
   return null;
}
```

when the caller needs to know the operation failed.

Prefer meaningful propagation:

``` text
Operation
 ↓
Error
 ↓
Appropriate boundary handles it
```

------------------------------------------------------------------------

# 21. Error Messages

Errors should be:

``` text
Useful
Actionable
Safe
Consistent
```

Do not expose internal details to users.

Bad:

``` text
PrismaClientKnownRequestError P2002 at /home/server/src/db...
```

User-facing:

``` text
An account with this email already exists.
```

Internal logs can contain appropriate debugging information.

------------------------------------------------------------------------

# 22. Exception Boundaries

Handle errors at appropriate boundaries.

For example:

``` text
HTTP Controller
 ↓
Application Service
 ↓
Domain
 ↓
Repository
```

The HTTP layer can translate internal errors into HTTP responses.

Business logic should not need to know about HTTP status codes
unnecessarily.

------------------------------------------------------------------------

# 23. Logging

Logs should help answer:

``` text
What happened?
When?
Where?
For which request?
Why?
```

Useful fields:

``` text
timestamp
level
service
environment
request_id
trace_id
user/tenant identifier where appropriate
operation
error_code
```

------------------------------------------------------------------------

# 24. Log Levels

Use levels intentionally.

``` text
DEBUG
INFO
WARN
ERROR
```

Avoid logging everything at:

``` text
ERROR
```

and avoid logging sensitive data.

------------------------------------------------------------------------

# 25. Never Log Secrets

Never log:

``` text
Passwords
Access tokens
Refresh tokens
API keys
Private keys
Database passwords
Session secrets
```

Be careful with:

``` text
Personal data
Payment information
Authorization headers
Cookies
```

------------------------------------------------------------------------

# 26. Configuration

Separate configuration from code.

Examples:

``` text
Database URL
API endpoints
Feature configuration
Service URLs
Runtime settings
```

Use environment-specific configuration.

Avoid hardcoding:

``` text
Production URLs
Secrets
Credentials
Environment-specific behavior
```

------------------------------------------------------------------------

# 27. Constants

Use constants when a value has meaning and is reused.

Example:

``` text
MAX_UPLOAD_SIZE
DEFAULT_PAGE_SIZE
PASSWORD_RESET_EXPIRY
```

Do not turn every literal number into a constant unnecessarily.

------------------------------------------------------------------------

# 28. Magic Numbers

Avoid unexplained values.

Bad:

``` text
if retries > 7
```

Better:

``` text
if retries > MAX_RETRIES
```

when the value represents an actual domain/system rule.

------------------------------------------------------------------------

# 29. Configuration vs Constants

Use configuration for values that change by environment or deployment.

Use constants for values intrinsic to the code/domain.

Example:

``` text
DATABASE_URL
→ configuration

MAX_PASSWORD_LENGTH
→ domain constant
```

------------------------------------------------------------------------

# 30. Project Structure

Organize code around understandable boundaries.

For larger applications, feature-based organization is often useful:

``` text
src/
├── features/
│   ├── users/
│   ├── auth/
│   ├── payments/
│   └── orders/
├── shared/
├── infrastructure/
└── config/
```

Avoid a giant:

``` text
utils/
services/
controllers/
```

folder containing hundreds of unrelated files.

Use the structure that makes ownership and boundaries clear.

------------------------------------------------------------------------

# 31. Module Boundaries

A module should expose a small public surface.

Prefer:

``` text
orders/
 ├── order.service
 ├── order.repository
 ├── order.schema
 └── index
```

where internal implementation details remain internal.

Do not allow every module to import everything from everywhere.

------------------------------------------------------------------------

# 32. Circular Dependencies

Avoid:

``` text
A → B
B → A
```

Circular dependencies make systems harder to:

``` text
Understand
Test
Build
Refactor
```

If circular dependencies appear repeatedly, reconsider module
boundaries.

------------------------------------------------------------------------

# 33. Dependency Management

Keep dependencies intentional.

Before adding a package, ask:

``` text
Do we really need it?
Is the project maintained?
Is the license appropriate?
Is there a security risk?
Can standard library code solve this?
Will it increase bundle/build size?
```

Remove unused dependencies.

------------------------------------------------------------------------

# 34. Lockfiles

Commit dependency lockfiles.

Examples:

``` text
package-lock.json
pnpm-lock.yaml
yarn.lock
poetry.lock
```

Use deterministic dependency installation in CI.

------------------------------------------------------------------------

# 35. Dependency Updates

Do not blindly update every dependency.

A good update process:

``` text
Update
 ↓
Read changelog
 ↓
Check breaking changes
 ↓
Run tests
 ↓
Run security checks
 ↓
Deploy
 ↓
Monitor
```

------------------------------------------------------------------------

# 36. Git

Git should be the source of truth for application code.

Avoid production code that exists only:

``` text
On a developer laptop
```

or:

``` text
On a production server
```

------------------------------------------------------------------------

# 37. Commit Standards

Commits should represent coherent changes.

Good:

``` text
Add password reset flow
Fix duplicate order creation
Add Redis cache for product lookup
```

Avoid:

``` text
changes
fix
stuff
final
final2
```

A commit should be understandable later.

------------------------------------------------------------------------

# 38. Atomic Commits

Prefer commits that are internally consistent.

Avoid:

``` text
Half feature
+
Unrelated formatting
+
Random dependency update
+
Debug code
```

in one commit.

Small coherent commits are easier to review and revert.

------------------------------------------------------------------------

# 39. Branching

A common workflow:

``` text
main
 ├── feature/*
 ├── fix/*
 └── chore/*
```

Use branch protection for important branches.

Do not create complicated branching strategies unless the team actually
needs them.

------------------------------------------------------------------------

# 40. Pull Requests

A good PR should communicate:

``` text
What changed?
Why?
How was it tested?
Any migration?
Any risk?
```

A useful template:

``` text
## Summary

## Why

## Changes

## Testing

## Migration

## Risks / Rollback
```

------------------------------------------------------------------------

# 41. PR Size

Avoid giant PRs.

Prefer:

``` text
Small
Focused
Reviewable
Tested
```

A large change may need to be split into:

``` text
Refactor
 ↓
Infrastructure
 ↓
Feature
 ↓
Cleanup
```

where practical.

------------------------------------------------------------------------

# 42. Code Review

Review for:

``` text
Correctness
Security
Architecture
Maintainability
Tests
Performance
Error handling
Observability
```

Do not focus only on formatting if automated tooling can handle it.

------------------------------------------------------------------------

# 43. Review Comments

Good review comments explain:

``` text
What is wrong
+
Why it matters
+
Possible direction
```

Avoid:

``` text
"I don't like this."
```

Prefer:

``` text
"This couples the service to PostgreSQL. Could we keep the repository boundary here so the business logic remains independent?"
```

------------------------------------------------------------------------

# 44. Automated Formatting

Use formatters where appropriate.

Examples:

``` text
Prettier
ESLint
Black
Ruff
gofmt
rustfmt
```

Automate formatting in CI/pre-commit workflows.

Do not waste code-review time debating formatting that a tool can
decide.

------------------------------------------------------------------------

# 45. Static Analysis

Use static analysis appropriate to the language.

Examples:

``` text
TypeScript compiler
ESLint
Ruff
SonarQube
Semgrep
CodeQL
```

Static analysis should catch:

``` text
Type errors
Suspicious patterns
Security issues
Unused code
Potential bugs
```

------------------------------------------------------------------------

# 46. Testing Expectations

Code changes should include appropriate tests.

Depending on the change:

``` text
Unit test
Integration test
API test
End-to-end test
Regression test
```

Do not chase 100% coverage blindly.

Test important behavior and failure modes.

------------------------------------------------------------------------

# 47. Testability

Code is easier to test when dependencies are explicit.

Prefer:

``` text
Service
 ↓
Dependency
```

that can be controlled in tests.

Avoid hidden global state.

------------------------------------------------------------------------

# 48. Refactoring

Refactor when:

``` text
Code is difficult to understand
Duplication is harmful
Responsibilities are mixed
Tests are difficult
Change is becoming risky
```

Refactor incrementally.

Avoid combining:

``` text
Huge refactor
+
Huge feature
+
Database migration
```

unless there is a strong reason.

------------------------------------------------------------------------

# 49. Refactoring Safety

Use:

``` text
Tests
 ↓
Small change
 ↓
Tests
 ↓
Small change
 ↓
Tests
```

Do not refactor large sections without safety nets.

------------------------------------------------------------------------

# 50. Technical Debt

Technical debt is not automatically bad.

Some debt is deliberate:

``` text
Ship simple version
 ↓
Validate product
 ↓
Improve architecture later
```

Bad debt is:

``` text
Untracked
+
Unowned
+
Growing
+
Blocking development
```

Track important debt explicitly.

------------------------------------------------------------------------

# 51. Technical Debt Prioritization

Prioritize debt that causes:

``` text
Security risk
Reliability risk
High development cost
Frequent bugs
Performance problems
Operational pain
```

Do not spend months cleaning code that has no meaningful impact.

------------------------------------------------------------------------

# 52. Documentation

Document:

``` text
Why
```

more than:

``` text
What
```

Code should explain what it does.

Documentation should explain:

``` text
Why it works this way
What constraints exist
What trade-offs were made
How to operate it
```

------------------------------------------------------------------------

# 53. README

A useful README should answer:

``` text
What is this?
How do I run it?
What are the prerequisites?
How is it configured?
How do I test it?
How do I deploy it?
Where is the architecture documented?
```

------------------------------------------------------------------------

# 54. Architecture Decision Records

Use ADRs for important architectural decisions.

Example:

``` text
ADR-001: Use PostgreSQL as primary database
ADR-002: Use Kafka for event streaming
ADR-003: Use Redis for distributed rate limiting
```

An ADR should capture:

``` text
Context
Decision
Alternatives
Consequences
```

------------------------------------------------------------------------

# 55. Comments

Comments should explain non-obvious reasoning.

Good:

``` text
// We intentionally keep this retry below 3 attempts
// because the payment provider charges per request.
```

Bad:

``` text
// Increment i
i++;
```

Avoid comments that become stale quickly.

------------------------------------------------------------------------

# 56. TODOs

TODOs should be meaningful.

Bad:

``` text
// TODO fix this
```

Better:

``` text
// TODO: Replace temporary polling with webhook once provider supports it.
```

For important work, use an issue/ticket instead of leaving permanent
TODOs.

------------------------------------------------------------------------

# 57. Feature Flags

Use feature flags when gradual rollout is genuinely useful.

Example:

``` text
Deploy
 ↓
Feature OFF
 ↓
Internal users
 ↓
10%
 ↓
100%
```

Remove obsolete flags.

Feature flags should not become permanent architecture.

------------------------------------------------------------------------

# 58. Backward Compatibility

When changing APIs or events:

``` text
Old clients
+
New clients
```

may coexist.

Prefer additive changes where practical.

For breaking changes:

``` text
Version
Migrate
Deprecate
Remove
```

------------------------------------------------------------------------

# 59. API Contracts

Treat APIs as contracts.

Document:

``` text
Inputs
Outputs
Errors
Authentication
Authorization
Pagination
Rate limits
Versioning
```

Avoid breaking clients without a migration strategy.

------------------------------------------------------------------------

# 60. Database Contracts

Application code should not casually depend on undocumented database
behavior.

Important schema changes should be:

``` text
Versioned
Migrated
Reviewed
Tested
```

Follow backward-compatible migration patterns where deployments are
rolling.

------------------------------------------------------------------------

# 61. Event Contracts

Events are also APIs.

Define:

``` text
Event name
Version
Schema
Producer
Consumers
Compatibility
```

Changing an event without considering consumers can cause distributed
failures.

------------------------------------------------------------------------

# 62. Performance

Do not optimize blindly.

Use:

``` text
Measure
 ↓
Identify bottleneck
 ↓
Optimize
 ↓
Measure again
```

Look at:

``` text
CPU
Memory
Database queries
Network
Latency
Throughput
```

------------------------------------------------------------------------

# 63. Premature Optimization

Avoid optimizing based on assumptions.

Example:

``` text
We need Redis because PostgreSQL will be slow.
```

Instead:

``` text
Measure
 ↓
Find bottleneck
 ↓
Choose solution
```

Complexity should be justified by actual requirements.

------------------------------------------------------------------------

# 64. Security by Default

Engineering decisions should default toward secure behavior.

Examples:

``` text
HTTPS
Least privilege
Input validation
Parameterized queries
Secure cookies
Secrets management
Dependency scanning
Rate limiting
Audit logging
```

Security should not be an afterthought.

------------------------------------------------------------------------

# 65. Input Validation

Validate input at boundaries:

``` text
HTTP
Message queue
Kafka
CLI
File upload
External API
```

Do not assume internal callers are always correct.

Validate:

``` text
Type
Range
Format
Length
Allowed values
Authorization
```

------------------------------------------------------------------------

# 66. Data Validation vs Business Validation

Separate:

``` text
Schema validation
```

from:

``` text
Business rules
```

Example:

``` text
email must be valid
```

is schema validation.

``` text
user cannot refund an already-refunded order
```

is business validation.

Both are required.

------------------------------------------------------------------------

# 67. Transactions

Use transactions when multiple changes must maintain a consistency
boundary.

Example:

``` text
Create order
+
Create order item
+
Update inventory
```

should be designed with explicit consistency requirements.

Do not wrap huge workflows in one database transaction unnecessarily.

------------------------------------------------------------------------

# 68. Concurrency

Assume concurrent requests can happen.

Examples:

``` text
Two users buy last item
Two workers process same job
Two requests update same record
```

Use appropriate:

``` text
Database constraints
Transactions
Locks
Optimistic concurrency
Idempotency
```

Do not rely on timing assumptions.

------------------------------------------------------------------------

# 69. Race Conditions

A race occurs when correctness depends on operation order.

Bad:

``` text
Check balance
 ↓
Subtract balance
```

when another request can modify the balance between those operations.

Use appropriate atomicity/locking/constraints.

------------------------------------------------------------------------

# 70. Resource Management

Every external resource should have a lifecycle.

Examples:

``` text
Database connection
File
Socket
Redis connection
HTTP response
Worker
Temporary file
```

Pattern:

``` text
Acquire
 ↓
Use
 ↓
Release
```

Even on failure.

------------------------------------------------------------------------

# 71. Graceful Shutdown

Services should:

``` text
Stop accepting new work
 ↓
Finish in-flight work
 ↓
Close resources
 ↓
Exit
```

This matters for:

``` text
Deployments
Autoscaling
Crashes
Maintenance
```

------------------------------------------------------------------------

# 72. Observability by Design

Important operations should produce enough information to debug.

Use:

``` text
Logs
Metrics
Traces
Request IDs
Correlation IDs
```

Do not wait until production breaks to discover that the system cannot
be diagnosed.

------------------------------------------------------------------------

# 73. Operational Ownership

Every important service should have:

``` text
Owner
Documentation
Monitoring
Alerting
Runbook
Deployment process
Recovery process
```

Unknown ownership creates slow incident response.

------------------------------------------------------------------------

# 74. Small Changes

Prefer:

``` text
Small PR
 ↓
Review
 ↓
Test
 ↓
Deploy
```

over:

``` text
3 months of changes
 ↓
One giant release
```

Small changes reduce:

``` text
Risk
Debugging surface
Rollback complexity
Review difficulty
```

------------------------------------------------------------------------

# 75. Release Discipline

A release should be:

``` text
Identifiable
Tested
Observable
Reversible
Documented
```

Track:

``` text
Commit
Build
Artifact
Environment
Deployment time
```

------------------------------------------------------------------------

# 76. Engineering Definition of Done

A feature is not done merely because code works locally.

A useful definition:

``` text
[ ] Requirements implemented
[ ] Code reviewed
[ ] Tests added
[ ] Error cases handled
[ ] Security considered
[ ] Logging/observability added
[ ] Documentation updated
[ ] Migration handled
[ ] CI passes
[ ] Deployment plan understood
[ ] Rollback considered
```

Adapt this to the project.

------------------------------------------------------------------------

# 77. Code Review Checklist

``` text
[ ] Is the behavior correct?
[ ] Is the design understandable?
[ ] Are responsibilities separated?
[ ] Is there unnecessary complexity?
[ ] Are errors handled?
[ ] Are security implications considered?
[ ] Are tests sufficient?
[ ] Are edge cases covered?
[ ] Is observability sufficient?
[ ] Are APIs/contracts preserved?
[ ] Is the change backward compatible?
[ ] Are migrations safe?
[ ] Is documentation needed?
```

------------------------------------------------------------------------

# 78. Repository Health Checklist

Periodically check:

``` text
[ ] Unused dependencies removed
[ ] Dead code removed
[ ] Outdated TODOs reviewed
[ ] Security vulnerabilities addressed
[ ] CI remains healthy
[ ] Documentation remains accurate
[ ] Build remains reproducible
[ ] Technical debt reviewed
[ ] Architecture still fits requirements
```

------------------------------------------------------------------------

# 79. Common Anti-Patterns

Avoid:

### God Classes

``` text
One class
 ↓
Everything
```

### God Modules

``` text
utils.ts
 ↓
500 unrelated functions
```

### Giant Functions

``` text
500-line function
```

### Hidden Global State

``` text
Anything
 ↓
Global mutable object
```

### Circular Dependencies

``` text
A ↔ B ↔ C
```

### Silent Errors

``` text
catch {}
```

### Copy-Paste Business Logic

Same rules implemented differently across services.

### Premature Abstraction

Building interfaces and frameworks before requirements justify them.

### Premature Microservices

Splitting a small application into many services without operational
need.

### Giant PRs

Hard to review and hard to debug.

### Permanent Feature Flags

Old flags accumulating indefinitely.

### Undocumented Production Changes

Manual changes that cannot be reproduced.

------------------------------------------------------------------------

# 80. Engineering Decision Framework

Before introducing complexity, ask:

``` text
What problem are we solving?
 ↓
How frequently does it occur?
 ↓
What is the simplest solution?
 ↓
What are the failure modes?
 ↓
What will this cost?
 ↓
How will we test it?
 ↓
How will we operate it?
 ↓
How will we remove it later?
```

Do not adopt technology simply because it is popular.

------------------------------------------------------------------------

# 81. When to Introduce Abstraction

Introduce an abstraction when there is a real reason:

``` text
Multiple implementations
Repeated business behavior
Testing boundary
Stable contract
Complexity isolation
```

Avoid:

``` text
Interface
 ↓
One implementation
 ↓
No actual variation
```

unless the boundary provides meaningful value.

------------------------------------------------------------------------

# 82. When to Split a Module

Consider splitting when:

``` text
Different responsibilities
Different change frequencies
Different ownership
Large dependency surface
Difficult testing
High coupling
```

Do not split purely because a file is long.

------------------------------------------------------------------------

# 83. When to Split a Service

A service boundary may make sense when there is:

``` text
Independent scaling
Independent deployment
Clear domain boundary
Different reliability requirements
Different ownership
Strong isolation requirement
```

Do not split a monolith into microservices simply because the codebase
is large.

------------------------------------------------------------------------

# 84. Monolith vs Microservices

A modular monolith can be a very good architecture.

Example:

``` text
Application
├── Auth Module
├── Orders Module
├── Payments Module
└── Notifications Module
```

with clear internal boundaries.

Move to separate services when the benefits justify:

``` text
Network complexity
Deployment complexity
Observability
Data consistency challenges
Operational overhead
```

------------------------------------------------------------------------

# 85. Documentation Standards

For significant systems, maintain:

``` text
README
Architecture documentation
API documentation
Database documentation
Deployment documentation
Runbooks
ADRs
```

Keep documentation close to the code or project where practical.

------------------------------------------------------------------------

# 86. Change Management

For risky changes:

``` text
Understand impact
 ↓
Plan
 ↓
Test
 ↓
Deploy gradually
 ↓
Monitor
 ↓
Rollback / continue
```

Risky changes include:

``` text
Database migrations
Authentication changes
Payment changes
Infrastructure changes
Large dependency upgrades
Model upgrades
```

------------------------------------------------------------------------

# 87. Engineering Maturity

A mature codebase tends toward:

``` text
Manual
 ↓
Documented
 ↓
Automated
 ↓
Tested
 ↓
Observable
 ↓
Reproducible
```

The objective is to reduce dependence on individual knowledge.

------------------------------------------------------------------------

# 88. Final Golden Rules

1.  Keep code simple.
2.  Separate responsibilities.
3.  Favor high cohesion and low coupling.
4.  Use SOLID principles pragmatically.
5.  Avoid unnecessary abstraction.
6.  Do not repeat business rules.
7.  Name things clearly.
8.  Keep functions focused.
9.  Handle errors intentionally.
10. Never silently swallow important failures.
11. Never log secrets.
12. Keep configuration outside code.
13. Keep dependencies intentional.
14. Commit lockfiles.
15. Keep Git history understandable.
16. Make PRs small and focused.
17. Automate formatting and static analysis.
18. Review for correctness, security, and maintainability.
19. Test important behavior and failure modes.
20. Refactor incrementally.
21. Track meaningful technical debt.
22. Document important decisions.
23. Treat APIs and events as contracts.
24. Validate all external input.
25. Design for concurrency.
26. Manage resources explicitly.
27. Make services gracefully shut down.
28. Build observability into important workflows.
29. Prefer small, reversible changes.
30. Do not add architecture before requirements justify it.
31. Prefer modular monoliths over premature microservices.
32. Make production changes reproducible.
33. Keep ownership clear.
34. Automate repetitive work.
35. Optimize based on measurements.
36. Design systems that the next engineer can understand.

------------------------------------------------------------------------

# 89. Final Mental Model

For every piece of software, ask:

``` text
Can I understand this?
        ↓
Can I change this safely?
        ↓
Can I test this?
        ↓
Can I observe this?
        ↓
Can I deploy this?
        ↓
Can I roll it back?
        ↓
Can another engineer operate it?
        ↓
Can it handle failure?
```

Good software engineering is not about writing the most sophisticated
code.

It is about creating systems that remain understandable and reliable as:

``` text
Code grows
+
Users grow
+
Teams grow
+
Requirements change
+
Failures happen
```

That is the foundation of professional software engineering.
