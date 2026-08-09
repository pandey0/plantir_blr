# Backend Engineering Standards

## Purpose

This document defines general backend engineering rules for building
maintainable, scalable, secure, and production-ready applications.

These rules are intentionally technology-agnostic. They can be applied
to Node.js, Next.js, Java, Python, Go, or other backend stacks.

------------------------------------------------------------------------

# 1. Core Principle: Separation of Concerns

Every part of the backend should have one clear responsibility.

A typical request flow should look like:

``` text
Client
  ↓
Route / Controller
  ↓
Validation / DTO
  ↓
Service / Use Case
  ↓
Domain Logic
  ↓
Repository / DAL
  ↓
Database
```

External services should be accessed through dedicated
adapters/services.

``` text
Service
 ├── Repository → Database
 ├── Payment Adapter → Stripe
 ├── Email Service → Email Provider
 └── Storage Adapter → S3 / Blob Storage
```

Avoid putting database queries, business rules, validation,
authentication, and external API calls into one route handler.

------------------------------------------------------------------------

# 2. Route / Controller Layer

The route/controller is responsible for HTTP concerns only.

It should:

-   Read request parameters/body.
-   Authenticate the request.
-   Validate or invoke input validation.
-   Call the appropriate service/use case.
-   Convert the result into an HTTP response.
-   Map known application errors to HTTP status codes.

It should NOT contain:

-   Complex business logic.
-   Direct database queries.
-   Large calculations.
-   Payment logic.
-   Email logic.
-   Large conditional workflows.

Preferred:

``` ts
export async function POST(req: Request) {
  const body = await req.json();

  const input = createOrderSchema.parse(body);
  const order = await createOrder(input);

  return Response.json(order, { status: 201 });
}
```

Avoid:

``` ts
export async function POST(req: Request) {
  // validation
  // database queries
  // pricing calculations
  // permissions
  // payment
  // email
  // business rules
  // response handling
}
```

------------------------------------------------------------------------

# 3. Validation

Never trust client input.

Validate:

-   Request body.
-   Query parameters.
-   Route parameters.
-   File uploads.
-   External API responses where appropriate.
-   Environment variables/configuration.

Use schemas where possible.

Example:

``` ts
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

Validation should happen near the system boundary.

Business rules should still be enforced inside the service/domain layer.

------------------------------------------------------------------------

# 4. DTOs

Use DTOs (Data Transfer Objects) to define the shape of data moving
between boundaries.

Examples:

``` text
CreateUserRequest
CreateUserResponse
UpdateOrderRequest
UserResponse
```

Do not automatically expose database entities directly to clients.

Bad:

``` ts
return user;
```

Better:

``` ts
return {
  id: user.id,
  name: user.name,
  email: user.email,
};
```

This prevents accidental exposure of internal fields.

------------------------------------------------------------------------

# 5. Service / Use-Case Layer

The service/use-case layer coordinates application behavior.

Example:

``` text
createOrder()
cancelOrder()
refundOrder()
scheduleInterview()
submitFeedback()
createProgram()
```

A service can:

-   Apply business rules.
-   Coordinate multiple repositories.
-   Call external services.
-   Start transactions.
-   Publish events.
-   Schedule background jobs.

Keep individual use cases focused.

Avoid creating one giant `UserService` or `OrderService` containing
hundreds of unrelated operations.

Prefer:

``` text
orders/
  create-order/
  cancel-order/
  refund-order/
```

when the application becomes sufficiently complex.

------------------------------------------------------------------------

# 6. Business / Domain Logic

Business rules should not depend on HTTP or database implementation
details.

Example:

``` ts
if (order.status === "SHIPPED") {
  throw new OrderCannotBeCancelledError();
}
```

The rule should remain valid regardless of whether the application uses:

-   REST
-   GraphQL
-   PostgreSQL
-   MongoDB
-   Prisma
-   Drizzle

Core business rules should be easy to unit test without infrastructure.

------------------------------------------------------------------------

# 7. Repository / DAL

DAL = Data Access Layer.

The repository/DAL is responsible for persistence operations.

Examples:

``` ts
userRepository.findById()
userRepository.create()
orderRepository.findPending()
orderRepository.updateStatus()
```

The repository should contain database-specific operations.

The service should describe WHAT it needs, while the repository handles
HOW the data is retrieved.

Example:

``` text
Service
  ↓
orderRepository.findById()
  ↓
Prisma
  ↓
PostgreSQL
```

Do not scatter Prisma/SQL queries throughout controllers and services.

------------------------------------------------------------------------

# 8. Database Rules

Follow these principles:

-   Use migrations.
-   Add appropriate indexes.
-   Use foreign keys where appropriate.
-   Use database constraints for critical invariants.
-   Avoid unnecessary duplicated data.
-   Avoid N+1 queries.
-   Select only required columns when practical.
-   Use pagination for large datasets.
-   Use transactions for atomic operations.
-   Understand connection pooling.
-   Monitor slow queries.

Do not assume application-level validation is enough for critical data
integrity.

------------------------------------------------------------------------

# 9. Transactions

Use transactions when multiple database operations must succeed or fail
together.

Example:

``` text
Create Order
   +
Create Order Items
   +
Update Inventory
```

These should be atomic when the business requirement demands it.

``` ts
await db.$transaction(async (tx) => {
  // operations
});
```

Do not keep transactions open while making slow external API calls
unless there is a specific reason.

------------------------------------------------------------------------

# 10. Authentication

Authentication answers:

> Who is this user?

Common mechanisms:

-   Sessions
-   Cookies
-   JWT
-   OAuth 2.0
-   OpenID Connect
-   API keys

Rules:

-   Never store passwords in plaintext.
-   Hash passwords using an appropriate password hashing algorithm.
-   Protect authentication endpoints from brute force.
-   Keep access tokens short-lived where appropriate.
-   Protect refresh tokens.
-   Never log secrets or tokens.
-   Use secure cookies when using cookie-based authentication.

------------------------------------------------------------------------

# 11. Authorization

Authorization answers:

> What is this user allowed to do?

Authentication alone is not authorization.

Implement:

-   RBAC where appropriate.
-   Resource-level permissions.
-   Ownership checks.
-   Tenant isolation for multi-tenant applications.
-   Server-side authorization.

Never rely on frontend UI restrictions.

Bad:

``` text
Hide Delete button
→ assume user cannot delete
```

Correct:

``` text
DELETE request
→ authenticate
→ authorize
→ perform operation
```

------------------------------------------------------------------------

# 12. Middleware

Middleware should handle cross-cutting concerns.

Good examples:

-   Authentication.
-   Request IDs.
-   Logging.
-   Rate limiting.
-   CORS.
-   Security headers.
-   Request context.

Avoid putting core business logic inside generic middleware.

------------------------------------------------------------------------

# 13. Error Handling

Use predictable application errors.

Example categories:

``` text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessRuleError
ExternalServiceError
DatabaseError
```

Do not expose internal stack traces or database errors to clients.

Standardize API error responses.

Example:

``` json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found"
  }
}
```

Log the detailed internal error separately.

------------------------------------------------------------------------

# 14. API Design

Design APIs consistently.

Use:

-   Correct HTTP methods.
-   Correct HTTP status codes.
-   Consistent response structures.
-   Pagination.
-   Filtering.
-   Sorting.
-   Versioning when needed.
-   Idempotency for operations where retries are possible.

Example:

``` text
GET    /orders
GET    /orders/:id
POST   /orders
PATCH  /orders/:id
DELETE /orders/:id
```

Avoid inconsistent naming such as:

``` text
/getAllOrders
/createNewOrder
/removeOrder
```

------------------------------------------------------------------------

# 15. Idempotency

Important operations should be safe to retry when appropriate.

This is especially important for:

-   Payments.
-   Orders.
-   Webhooks.
-   External API calls.

Example:

``` text
Request
Idempotency-Key: abc123
```

If the same request is retried, the system should not accidentally
create two payments or two orders.

------------------------------------------------------------------------

# 16. Caching

Use caching when repeated reads make database access unnecessarily
expensive.

Common pattern:

``` text
Request
  ↓
Cache
  ├── Hit → Return
  └── Miss
        ↓
      Database
        ↓
      Cache
        ↓
      Return
```

Understand:

-   TTL.
-   Cache invalidation.
-   Cache-aside.
-   Cache stampedes.
-   Redis.
-   Distributed caching.

Do not cache everything by default.

------------------------------------------------------------------------

# 17. Background Jobs

Long-running or non-critical work should often be moved outside the
request lifecycle.

Example:

``` text
API
 ↓
Create Order
 ↓
Queue Job
 ↓
Return Response

Worker
 ↓
Send Email
 ↓
Generate Invoice
 ↓
Update Analytics
```

Use queues for:

-   Emails.
-   Notifications.
-   Image processing.
-   PDF generation.
-   AI processing.
-   Data imports.
-   Scheduled work.

Understand:

-   Retries.
-   Backoff.
-   Dead-letter queues.
-   Job status.
-   Duplicate jobs.
-   Idempotent workers.

------------------------------------------------------------------------

# 18. Events

Use events when multiple parts of a system need to react to something.

Example:

``` text
OrderCreated
     ↓
 ┌───┼────────┐
 ↓   ↓        ↓
Email Inventory Analytics
```

Events should represent meaningful facts:

``` text
UserRegistered
OrderCreated
PaymentCompleted
InterviewScheduled
```

Avoid creating events for every trivial internal operation.

------------------------------------------------------------------------

# 19. External Services

Never tightly couple your core business logic to a third-party provider
when abstraction is useful.

Instead of:

``` text
Business Logic
    ↓
Stripe SDK everywhere
```

prefer:

``` text
Business Logic
    ↓
Payment Interface
    ↓
Stripe Adapter
```

This makes providers easier to replace and simplifies testing.

The same principle applies to:

-   Email.
-   Storage.
-   Payments.
-   AI providers.
-   SMS.
-   Authentication providers.

------------------------------------------------------------------------

# 20. Security

Always assume external input is hostile.

Protect against:

-   SQL injection.
-   XSS.
-   CSRF.
-   SSRF.
-   Broken authentication.
-   Broken authorization.
-   Brute force.
-   Malicious file uploads.
-   Excessive request sizes.
-   Credential leakage.

Rules:

-   Validate input.
-   Sanitize where appropriate.
-   Use parameterized queries.
-   Store secrets securely.
-   Never commit secrets.
-   Use HTTPS.
-   Limit permissions.
-   Rate-limit sensitive endpoints.
-   Keep dependencies updated.

------------------------------------------------------------------------

# 21. Logging

Logs should help answer:

-   What happened?
-   When did it happen?
-   Which request caused it?
-   Which user/resource was involved?
-   Why did it fail?

Use structured logging.

Example:

``` json
{
  "level": "error",
  "event": "payment_failed",
  "orderId": "123",
  "requestId": "abc",
  "errorCode": "PAYMENT_DECLINED"
}
```

Never log:

-   Passwords.
-   Access tokens.
-   Refresh tokens.
-   API keys.
-   Sensitive personal information unless required and properly
    controlled.

------------------------------------------------------------------------

# 22. Observability

Production systems should provide:

``` text
Logs
Metrics
Traces
```

Track useful metrics such as:

-   Request rate.
-   Error rate.
-   Latency.
-   p50/p95/p99 response time.
-   Database latency.
-   Queue depth.
-   Job failure rate.
-   CPU/memory.
-   Cache hit rate.

Use request/correlation IDs to trace a request across services.

------------------------------------------------------------------------

# 23. Reliability

External systems fail.

Design for:

-   Timeouts.
-   Retries.
-   Exponential backoff.
-   Circuit breakers.
-   Graceful degradation.
-   Health checks.
-   Graceful shutdown.
-   Idempotency.
-   Dead-letter queues.

Never retry blindly.

A retry without idempotency can create duplicate operations.

------------------------------------------------------------------------

# 24. Performance

Measure before optimizing.

Common areas:

``` text
Application
 ↓
Database
 ↓
Network
 ↓
External APIs
 ↓
Serialization
```

Watch for:

-   N+1 queries.
-   Missing indexes.
-   Large payloads.
-   Unnecessary API calls.
-   Slow external services.
-   Excessive database round trips.
-   Blocking operations.

Use profiling and metrics rather than guessing.

------------------------------------------------------------------------

# 25. Testing

Use multiple levels of testing.

``` text
Unit Tests
    ↓
Integration Tests
    ↓
API Tests
    ↓
End-to-End Tests
    ↓
Load / Performance Tests
```

### Unit

Test pure business logic independently.

### Integration

Test components together, especially database/repository behavior.

### API

Test HTTP contracts and authorization.

### E2E

Test important user workflows.

### Performance

Test behavior under realistic load.

Do not aim for 100% coverage blindly. Prioritize important behavior and
business rules.

------------------------------------------------------------------------

# 26. Configuration

Keep configuration separate from application code.

Examples:

``` text
DATABASE_URL
REDIS_URL
JWT_SECRET
STRIPE_SECRET_KEY
```

Rules:

-   Validate environment variables at startup.
-   Never hardcode secrets.
-   Separate development/staging/production configuration.
-   Do not expose server secrets to the client.

------------------------------------------------------------------------

# 27. File Uploads

Treat uploaded files as untrusted input.

Validate:

-   File size.
-   MIME type.
-   Extension.
-   Content where necessary.

Consider:

``` text
Client
 ↓
API
 ↓
Object Storage
 ↓
Background Processing
```

Avoid storing large files directly inside your relational database
unless there is a strong reason.

------------------------------------------------------------------------

# 28. Pagination

Never return unlimited records.

For large datasets prefer cursor pagination where appropriate.

Offset:

``` text
?page=10&limit=20
```

Cursor:

``` text
?cursor=eyJpZCI6MTIzfQ==
```

Cursor pagination is often more reliable for large or frequently
changing datasets.

------------------------------------------------------------------------

# 29. Multi-Tenancy

For SaaS applications, every request must be associated with the correct
tenant/company.

Example:

``` text
Request
 ↓
Authenticated User
 ↓
Tenant
 ↓
Authorization
 ↓
Database Query
```

Never rely only on the frontend to supply a tenant ID.

Every relevant database query must enforce tenant boundaries.

------------------------------------------------------------------------

# 30. Architecture Evolution

Prefer:

``` text
Simple Monolith
      ↓
Modular Monolith
      ↓
Extract services only when justified
```

Do not introduce microservices just because they sound more scalable.

Start with clear module boundaries.

Example:

``` text
src/
├── modules/
│   ├── users/
│   ├── orders/
│   ├── payments/
│   └── notifications/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   └── storage/
│
├── middleware/
├── config/
└── shared/
```

------------------------------------------------------------------------

# 31. Clean / Hexagonal Architecture

For larger systems, consider stronger boundaries.

A conceptual structure:

``` text
             Domain
               ↑
          Application
               ↑
      Infrastructure
               ↑
        Controllers
```

The core business logic should not depend directly on frameworks or
infrastructure.

Do not introduce Clean Architecture mechanically. Use it when the
complexity justifies it.

------------------------------------------------------------------------

# 32. Distributed Systems

Learn these when systems grow:

-   Load balancing.
-   Horizontal scaling.
-   Replication.
-   Sharding.
-   Partitioning.
-   Distributed locks.
-   Eventual consistency.
-   CAP theorem.
-   Message queues.
-   Leader/follower systems.
-   Consistent hashing.
-   Failure recovery.

Do not optimize for distributed systems before you actually have a
distributed problem.

------------------------------------------------------------------------

# 33. Deployment

A production backend should have:

``` text
Code
 ↓
Git
 ↓
CI
 ↓
Tests
 ↓
Build
 ↓
Deploy
 ↓
Monitoring
```

Understand:

-   Docker.
-   CI/CD.
-   Reverse proxies.
-   Load balancers.
-   DNS.
-   TLS.
-   Environment management.
-   Secrets.
-   Health checks.
-   Rolling deployments.
-   Blue/green deployments.
-   Canary deployments.

------------------------------------------------------------------------

# 34. Code Quality Rules

Prefer:

-   Small functions.
-   Clear names.
-   Explicit dependencies.
-   Single responsibility.
-   Strong typing.
-   Consistent error handling.
-   Reusable abstractions only when justified.
-   Small modules.
-   Low coupling.
-   High cohesion.

Avoid:

-   God classes.
-   God services.
-   God controllers.
-   Giant route files.
-   Deep nesting.
-   Duplicate business rules.
-   Magic numbers.
-   Hidden side effects.
-   Premature abstractions.

------------------------------------------------------------------------

# 35. Recommended Request Flow

For a typical production endpoint:

``` text
HTTP Request
     ↓
Middleware
     ↓
Authentication
     ↓
Authorization
     ↓
Input Validation
     ↓
Controller / Route
     ↓
Use Case / Service
     ↓
Domain Rules
     ↓
Repository / DAL
     ↓
Database
     ↓
Service
     ↓
DTO / Response Mapper
     ↓
HTTP Response
```

For asynchronous work:

``` text
API
 ↓
Service
 ↓
Database
 ↓
Event / Queue
 ↓
Worker
 ↓
External Service
```

------------------------------------------------------------------------

# 36. Practical Priority

Do not try to learn everything simultaneously.

## Tier 1 --- Core Backend

Learn these first:

-   HTTP.
-   REST.
-   Request/response lifecycle.
-   Validation.
-   Controllers/routes.
-   Services/use cases.
-   Repository/DAL.
-   SQL.
-   Database design.
-   Transactions.
-   Authentication.
-   Authorization.
-   Error handling.
-   Testing.

## Tier 2 --- Production Backend

Then:

-   Redis.
-   Caching.
-   Queues.
-   Background workers.
-   Webhooks.
-   Rate limiting.
-   Logging.
-   Monitoring.
-   Docker.
-   CI/CD.
-   Idempotency.

## Tier 3 --- Strong SDE / System Design

Then:

-   Kafka.
-   Event-driven architecture.
-   Load balancing.
-   Horizontal scaling.
-   Replication.
-   Sharding.
-   Distributed systems.
-   Consistency.
-   Failure handling.

## Tier 4 --- Advanced Architecture

Finally:

-   Clean Architecture.
-   Hexagonal Architecture.
-   Domain-Driven Design.
-   Kubernetes.
-   Advanced distributed systems.
-   Service-oriented architecture.
-   Microservices.

------------------------------------------------------------------------

# 37. Golden Rules

1.  Keep HTTP concerns out of business logic.
2.  Keep database concerns out of controllers.
3.  Keep business rules independent from frameworks where practical.
4.  Validate all external input.
5.  Never trust the client.
6.  Authenticate before authorizing.
7.  Enforce authorization on the server.
8.  Use transactions for atomic operations.
9.  Make retryable operations idempotent.
10. Move slow work to background jobs.
11. Use caching intentionally, not everywhere.
12. Design for failures in external dependencies.
13. Never expose secrets.
14. Never return internal errors directly to clients.
15. Log enough to debug production issues.
16. Measure performance before optimizing.
17. Test business-critical behavior.
18. Prefer modular monoliths before microservices.
19. Keep modules cohesive and loosely coupled.
20. Add architectural complexity only when it solves a real problem.

------------------------------------------------------------------------

# 38. Final Mental Model

When designing any backend feature, ask:

``` text
1. What is the API contract?
2. What input must be validated?
3. Who is authenticated?
4. Is the user authorized?
5. What business rules apply?
6. What data must be read/written?
7. Does it require a transaction?
8. Should anything happen asynchronously?
9. Can this operation be retried safely?
10. Does it need caching?
11. What happens if an external service fails?
12. What should be logged?
13. What metrics should be tracked?
14. How will this be tested?
15. Can the feature remain modular as it grows?
```

The goal is not to use every pattern.

The goal is to build a backend where:

``` text
Responsibilities are clear
        +
Dependencies are controlled
        +
Business rules are testable
        +
Data access is isolated
        +
Failures are handled
        +
Security is enforced
        +
Production behavior is observable
```

That is the foundation of production-grade backend engineering.
