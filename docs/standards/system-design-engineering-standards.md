# System Design Engineering Standards

## Purpose

This document defines general standards for designing scalable,
reliable, secure, maintainable, and production-ready software systems.

System design is not about drawing boxes.

It is about making explicit decisions about:

``` text
Requirements
+
Architecture
+
Data
+
APIs
+
Scaling
+
Reliability
+
Security
+
Operations
+
Trade-offs
```

The goal is to design a system that solves the actual problem without
introducing unnecessary complexity.

------------------------------------------------------------------------

# 1. Core System Design Principle

Start with requirements before choosing technologies.

Always identify:

``` text
Functional Requirements
        +
Non-Functional Requirements
        ↓
Architecture
        ↓
Components
        ↓
Data Model
        ↓
APIs
        ↓
Infrastructure
        ↓
Scaling / Reliability
```

Do not start with:

``` text
"Should I use Kafka?"
"Should I use microservices?"
"Should I use Kubernetes?"
```

Start with:

> What does the system need to do?

------------------------------------------------------------------------

# 2. Functional Requirements

Functional requirements describe what the system does.

Examples:

``` text
Users can register.
Users can create projects.
Users can upload files.
Users can send messages.
Admins can manage users.
```

Write requirements as concrete behaviors.

Example:

``` text
The system must allow a user to upload a PDF
and retrieve its processed content later.
```

Avoid vague requirements such as:

``` text
The system should be fast.
```

------------------------------------------------------------------------

# 3. Non-Functional Requirements

Non-functional requirements define system characteristics.

Important categories:

``` text
Availability
Scalability
Latency
Throughput
Durability
Consistency
Security
Reliability
Maintainability
Cost
```

Example:

``` text
Availability: 99.9%
p95 latency: < 300 ms
Traffic: 10,000 requests/sec
Data retention: 5 years
RPO: 5 minutes
RTO: 30 minutes
```

Requirements should drive architecture.

------------------------------------------------------------------------

# 4. Capacity Estimation

Before designing infrastructure, estimate scale.

Estimate:

``` text
Users
DAU / MAU
Requests/sec
Peak requests/sec
Read/write ratio
Storage
Bandwidth
Database size
Cache size
```

Example:

``` text
10 million users
×
10 requests/day

≈
100 million requests/day
```

Convert to approximate average and peak traffic.

The exact number does not need to be perfect.

The purpose is to identify the order of magnitude.

------------------------------------------------------------------------

# 5. Back-of-the-Envelope Calculations

Estimate:

### Requests per second

``` text
Daily requests / 86,400
```

Then estimate peak traffic:

``` text
Average RPS × Peak Factor
```

### Storage

``` text
Objects/day
×
Average object size
×
Retention period
```

### Bandwidth

``` text
Requests/sec
×
Average response size
```

These calculations help determine whether a simple architecture is
sufficient.

------------------------------------------------------------------------

# 6. Start Simple

Prefer:

``` text
Simple Monolith
```

before:

``` text
Microservices
```

A good evolution path:

``` text
Monolith
   ↓
Modular Monolith
   ↓
Scale Application
   ↓
Introduce Cache / Queue
   ↓
Read Replicas
   ↓
Extract Services When Necessary
```

Do not introduce distributed systems complexity without a real reason.

------------------------------------------------------------------------

# 7. High-Level Architecture

Start with a simple system diagram.

Example:

``` text
                 Users
                   ↓
                  CDN
                   ↓
             Load Balancer
                   ↓
              API Servers
              /    |    \
             /     |     \
          Redis   DB    Queue
                   |      |
                   |    Workers
                   |
              Object Storage
```

The diagram should communicate major responsibilities.

Do not put every class on the architecture diagram.

------------------------------------------------------------------------

# 8. Client Architecture

Consider:

``` text
Web
Mobile
Desktop
Third-party API
```

Decide:

-   Where authentication happens.
-   Where caching happens.
-   What is rendered client-side.
-   What is rendered server-side.
-   How clients communicate with APIs.
-   How offline behavior works if needed.

------------------------------------------------------------------------

# 9. API Gateway / Load Balancer

A system may place infrastructure in front of application servers:

``` text
Client
 ↓
CDN
 ↓
Load Balancer / API Gateway
 ↓
Application
```

Responsibilities may include:

-   TLS termination.
-   Routing.
-   Rate limiting.
-   Authentication integration.
-   Traffic distribution.
-   Request logging.
-   WAF integration.

Do not put business logic into infrastructure components unnecessarily.

------------------------------------------------------------------------

# 10. Stateless Application Servers

Prefer stateless application servers when practical.

Instead of:

``` text
Server A
stores user session locally
```

prefer:

``` text
Server A ─┐
Server B ─┼─→ Shared Session / DB / Cache
Server C ─┘
```

This makes horizontal scaling easier.

Avoid storing important application state only in local server memory.

------------------------------------------------------------------------

# 11. Horizontal Scaling

Horizontal scaling means adding more instances.

``` text
             Load Balancer
              /    |    \
             ↓     ↓     ↓
           API    API    API
```

Advantages:

-   More capacity.
-   Better fault tolerance.
-   Easier scaling.

Requirements:

-   Stateless application behavior.
-   Shared data/state.
-   Load balancing.
-   Good observability.

------------------------------------------------------------------------

# 12. Vertical Scaling

Vertical scaling means increasing the resources of one machine.

``` text
2 CPU → 8 CPU
8 GB RAM → 32 GB RAM
```

It is often simpler than horizontal scaling.

Use it when:

-   The workload is manageable.
-   The service is stateful.
-   Operational simplicity matters.

Do not assume horizontal scaling is always better.

------------------------------------------------------------------------

# 13. Database Architecture

A common architecture:

``` text
Application
     ↓
Primary Database
     ↓
Read Replicas
```

Writes:

``` text
Application
 ↓
Primary
```

Reads:

``` text
Application
 ↓
Read Replica
```

But replication introduces:

``` text
Replication Lag
```

Design around consistency requirements.

------------------------------------------------------------------------

# 14. Database Scaling Strategy

A reasonable progression:

``` text
Optimize Queries
 ↓
Indexes
 ↓
Connection Pooling
 ↓
Caching
 ↓
Vertical Scaling
 ↓
Read Replicas
 ↓
Partitioning
 ↓
Sharding
```

Do not jump directly to sharding.

------------------------------------------------------------------------

# 15. Caching

Caching reduces expensive repeated work.

Typical architecture:

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

-   Cache-aside.
-   TTL.
-   Invalidation.
-   Cache stampede.
-   Hot keys.
-   Stale data.

Caching introduces consistency complexity.

------------------------------------------------------------------------

# 16. CDN

Use a CDN for content that benefits from geographically distributed
delivery.

Examples:

``` text
Images
Videos
CSS
JavaScript
Static files
Public downloads
```

Architecture:

``` text
User
 ↓
Nearest CDN Edge
 ↓
Origin
```

Benefits:

-   Lower latency.
-   Reduced origin traffic.
-   Better global performance.

------------------------------------------------------------------------

# 17. Queues

Queues decouple producers and consumers.

``` text
API
 ↓
Queue
 ↓
Worker
```

Useful for:

-   Email.
-   Notifications.
-   Image processing.
-   AI processing.
-   Reports.
-   Video processing.
-   Imports.
-   Background jobs.

Queues improve responsiveness and resilience.

------------------------------------------------------------------------

# 18. Asynchronous Processing

Do not keep users waiting for work that does not need to finish before
responding.

Instead of:

``` text
Request
 ↓
Generate PDF
 ↓
Send email
 ↓
Process image
 ↓
Response
```

prefer:

``` text
Request
 ↓
Create job
 ↓
Response

Worker
 ↓
Generate PDF
 ↓
Send email
 ↓
Process image
```

------------------------------------------------------------------------

# 19. Queue Reliability

Design for:

``` text
Retries
Backoff
Dead-letter queues
Duplicate messages
Out-of-order messages
Poison messages
Worker crashes
```

Workers should be idempotent where practical.

------------------------------------------------------------------------

# 20. Event-Driven Architecture

Events represent facts that happened.

Example:

``` text
OrderCreated
PaymentCompleted
UserRegistered
InterviewScheduled
```

Architecture:

``` text
Producer
   ↓
Event Bus
   ↓
 ┌───┼────┐
 ↓   ↓    ↓
Email Analytics Inventory
```

Benefits:

-   Loose coupling.
-   Independent consumers.
-   Async processing.

Costs:

-   Eventual consistency.
-   Debugging complexity.
-   Ordering concerns.
-   Duplicate processing.

------------------------------------------------------------------------

# 21. Kafka

Kafka is useful for high-throughput event streaming.

Understand:

``` text
Producer
 ↓
Topic
 ↓
Partition
 ↓
Consumer Group
 ↓
Consumer
```

Key concepts:

-   Partitions.
-   Offsets.
-   Consumer groups.
-   Ordering.
-   Retention.
-   Replication.
-   Rebalancing.

Do not use Kafka simply because the system has events.

------------------------------------------------------------------------

# 22. Message Queue vs Event Stream

A simplified distinction:

### Queue

Often focused on:

``` text
Do this work.
```

### Event stream

Often focused on:

``` text
This happened.
```

Choose based on processing and replay requirements.

------------------------------------------------------------------------

# 23. Consistency

Understand the tradeoff between:

``` text
Strong Consistency
```

and:

``` text
Eventual Consistency
```

Example:

Strong:

``` text
Write
 ↓
Read
 ↓
Immediately sees write
```

Eventual:

``` text
Write
 ↓
Replication
 ↓
Eventually visible
```

Not every system needs strong consistency everywhere.

------------------------------------------------------------------------

# 24. CAP Theorem

In the presence of a network partition, distributed systems must trade
between:

``` text
Consistency
Availability
```

under the CAP model.

Do not treat CAP as:

``` text
Pick any two permanently.
```

It is about system behavior during network partitions.

Understand what your system prioritizes during failures.

------------------------------------------------------------------------

# 25. Availability

Availability is the probability that the system is operational and
accessible.

Design techniques:

-   Redundant instances.
-   Load balancing.
-   Replication.
-   Health checks.
-   Failover.
-   Multi-zone deployment.
-   Graceful degradation.

Avoid single points of failure.

------------------------------------------------------------------------

# 26. High Availability

Example:

``` text
             Load Balancer
              /        \
             ↓          ↓
          Server A    Server B
             ↓          ↓
                Database
                  ↓
               Replica
```

If one application server fails, traffic can move to another.

Identify every potential single point of failure.

------------------------------------------------------------------------

# 27. Fault Tolerance

Ask:

``` text
What happens if:
```

-   Database goes down.
-   Redis goes down.
-   Queue goes down.
-   External API times out.
-   Worker crashes.
-   Network fails.
-   One server dies.
-   One availability zone fails.

The system should have deliberate behavior for important failures.

------------------------------------------------------------------------

# 28. Timeouts

Every network call should have an appropriate timeout.

Bad:

``` text
API
 ↓
External service
 ↓
Wait forever
```

Better:

``` text
API
 ↓
External service
 ↓
Timeout
 ↓
Fallback / Retry / Error
```

Timeouts prevent resource exhaustion.

------------------------------------------------------------------------

# 29. Retries

Retry transient failures when appropriate.

Use:

``` text
Exponential Backoff
+
Jitter
```

Avoid retrying permanent failures.

Be careful:

``` text
Retry
+
Non-idempotent operation
=
Duplicate side effects
```

------------------------------------------------------------------------

# 30. Circuit Breaker

When an external dependency repeatedly fails:

``` text
Application
 ↓
Dependency
 ❌
```

A circuit breaker can temporarily stop sending requests.

Conceptually:

``` text
Closed
 ↓ failures
Open
 ↓ timeout
Half-Open
 ↓ success
Closed
```

This protects the application from cascading failures.

------------------------------------------------------------------------

# 31. Rate Limiting

Protect systems from excessive traffic.

Possible dimensions:

``` text
IP
User
Tenant
API Key
Endpoint
```

Algorithms include:

-   Token bucket.
-   Leaky bucket.
-   Fixed window.
-   Sliding window.

Apply stricter limits to expensive operations.

------------------------------------------------------------------------

# 32. Backpressure

When consumers cannot keep up with producers:

``` text
Producer
 ↓↓↓↓↓↓↓
Queue
 ↓
Slow Worker
```

The system needs backpressure.

Possible responses:

-   Queue.
-   Rate limit producers.
-   Reject work.
-   Batch processing.
-   Autoscale consumers.

Without backpressure, queues and memory can grow indefinitely.

------------------------------------------------------------------------

# 33. Idempotency

A request may be retried.

Example:

``` text
Client
 ↓
Payment Request
 ↓
Timeout
 ↓
Client retries
```

Without idempotency:

``` text
Two payments
```

With idempotency:

``` text
Same operation
→ Same result
```

Use idempotency keys for operations where duplicate effects are
dangerous.

------------------------------------------------------------------------

# 34. Distributed Locks

Sometimes only one process should perform an operation.

Examples:

``` text
Generate monthly report
Run scheduled cleanup
Process unique resource
```

Possible mechanisms:

-   Database locks.
-   Redis-based locks.
-   Leader election.

Distributed locks are difficult to implement correctly.

Use them only when necessary.

------------------------------------------------------------------------

# 35. Distributed Transactions

Avoid distributed transactions when possible.

Prefer:

``` text
Local transaction
+
Event
+
Idempotent consumer
```

For multi-service workflows, understand:

-   Saga pattern.
-   Compensating actions.
-   Outbox pattern.

------------------------------------------------------------------------

# 36. Transactional Outbox

A common reliability problem:

``` text
Database transaction succeeds
BUT
Event publish fails
```

The outbox pattern solves this by storing the event in the same database
transaction.

``` text
Transaction
 ├── Update business data
 └── Insert outbox event
          ↓
      Outbox Worker
          ↓
       Event Bus
```

This provides more reliable event publication.

------------------------------------------------------------------------

# 37. Saga Pattern

For workflows spanning multiple services:

``` text
Order
 ↓
Payment
 ↓
Inventory
 ↓
Shipping
```

If one step fails, use compensating actions.

Example:

``` text
Payment succeeds
 ↓
Inventory fails
 ↓
Refund payment
```

Sagas trade transaction simplicity for workflow complexity.

------------------------------------------------------------------------

# 38. API Design

Design APIs around resources and business operations.

Use:

``` text
GET
POST
PUT
PATCH
DELETE
```

where appropriate.

Define:

-   Request schema.
-   Response schema.
-   Error schema.
-   Authentication requirements.
-   Authorization requirements.
-   Pagination.
-   Rate limits.
-   Idempotency.

------------------------------------------------------------------------

# 39. API Versioning

API changes can break existing clients.

Strategies include:

``` text
/api/v1/users
/api/v2/users
```

or compatible evolution.

Prefer backward-compatible changes when possible.

Avoid breaking existing clients unnecessarily.

------------------------------------------------------------------------

# 40. API Gateway

For larger architectures:

``` text
Clients
   ↓
API Gateway
   ↓
Services
```

The gateway may handle:

-   Routing.
-   Authentication integration.
-   Rate limiting.
-   Request transformation.
-   Logging.
-   TLS.

Do not turn the gateway into a giant business-logic service.

------------------------------------------------------------------------

# 41. Microservices

Microservices can provide:

-   Independent deployment.
-   Independent scaling.
-   Team ownership.
-   Fault isolation.

But introduce:

-   Network failures.
-   Distributed debugging.
-   Data consistency challenges.
-   Deployment complexity.
-   Operational overhead.

Use microservices when organizational or technical requirements justify
them.

------------------------------------------------------------------------

# 42. Service Boundaries

Good service boundaries usually follow meaningful business domains.

Example:

``` text
Users
Billing
Orders
Inventory
Notifications
```

Avoid splitting services based purely on database tables.

Bad:

``` text
UserTableService
OrderTableService
AddressTableService
```

unless there is a genuine reason.

------------------------------------------------------------------------

# 43. Domain-Driven Design

For complex systems, model around domain concepts.

Identify:

``` text
Entities
Value Objects
Aggregates
Repositories
Domain Events
Bounded Contexts
```

DDD is especially useful when business rules are complex.

Do not introduce DDD terminology just for documentation.

Use it when it improves understanding.

------------------------------------------------------------------------

# 44. Data Ownership

In distributed systems, each service should have clear ownership of its
data.

Avoid:

``` text
Service A
Service B
Service C

all directly modifying
the same database tables
```

Prefer:

``` text
Service A → owns data A
Service B → owns data B
Service C → owns data C
```

Other services communicate through APIs/events.

------------------------------------------------------------------------

# 45. Caching Strategy

For each cache ask:

``` text
What is cached?
Who owns the source of truth?
How long can it be stale?
How is it invalidated?
What happens on cache miss?
What happens if cache is unavailable?
```

Never introduce caching without understanding invalidation.

------------------------------------------------------------------------

# 46. Storage

Different data types may require different storage systems.

``` text
Relational data → PostgreSQL
Cache → Redis
Files → Object Storage
Search → Search Engine
Events → Kafka
Analytics → Warehouse
```

Do not force one database to solve every problem.

But also do not introduce five databases unnecessarily.

------------------------------------------------------------------------

# 47. Object Storage

For large files:

``` text
Client
 ↓
Object Storage
 ↓
Metadata in Database
```

Store metadata in SQL:

``` text
file_id
owner_id
storage_key
size
mime_type
created_at
```

Store the actual file in object storage.

------------------------------------------------------------------------

# 48. Search Architecture

For advanced search:

``` text
Primary Database
       ↓
Search Index
       ↓
Search Service
```

Understand that search indexes may be eventually consistent with the
primary database.

The primary database remains the source of truth unless deliberately
designed otherwise.

------------------------------------------------------------------------

# 49. Real-Time Systems

For real-time features:

``` text
Client
 ↕
WebSocket
 ↕
Realtime Service
 ↕
Event / PubSub
```

Use:

-   WebSockets.
-   Server-Sent Events.
-   Pub/Sub.
-   Redis.
-   Kafka.

Consider:

-   Connection management.
-   Reconnection.
-   Ordering.
-   Duplicate events.
-   Presence.
-   Backpressure.

------------------------------------------------------------------------

# 50. Notifications

Notification architecture:

``` text
Business Event
      ↓
Notification Service
      ↓
 ┌────┼─────┐
 ↓    ↓     ↓
Email Push  SMS
```

Use queues for asynchronous delivery.

Track:

``` text
Pending
Sent
Failed
Retrying
```

------------------------------------------------------------------------

# 51. Observability

Every production system should provide:

``` text
Logs
Metrics
Traces
```

### Logs

Explain what happened.

### Metrics

Measure system behavior.

### Traces

Show request flow across components.

Use correlation/request IDs.

Example:

``` text
Request ID: abc123

API
 ↓
Order Service
 ↓
Postgres
 ↓
Payment
 ↓
Queue
```

------------------------------------------------------------------------

# 52. Service Level Objectives

Define reliability targets.

### SLI

What you measure.

Example:

``` text
Successful requests / total requests
```

### SLO

Target.

``` text
99.9% successful requests
```

### SLA

External/business commitment.

SLOs should influence engineering decisions.

------------------------------------------------------------------------

# 53. Disaster Recovery

Define:

### RPO

Maximum acceptable data loss.

### RTO

Maximum acceptable recovery time.

Example:

``` text
RPO = 5 minutes
RTO = 30 minutes
```

Architecture should support these requirements.

------------------------------------------------------------------------

# 54. Backup and Restore

Backups are not enough.

Test:

``` text
Backup
 ↓
Restore
 ↓
Verify
```

Understand:

-   Backup frequency.
-   Retention.
-   Encryption.
-   Point-in-time recovery.
-   Cross-region recovery where required.

------------------------------------------------------------------------

# 55. Security Architecture

Every system should identify:

``` text
Authentication
Authorization
Trust Boundaries
Secrets
Encryption
Network Security
Rate Limiting
Audit Logging
```

Never assume internal services are automatically trustworthy.

Use service authentication where required.

------------------------------------------------------------------------

# 56. Multi-Tenancy

Choose a strategy:

``` text
Shared database
Shared schema
Tenant ID
```

or:

``` text
Separate schema
```

or:

``` text
Separate database
```

based on:

-   Security.
-   Scale.
-   Compliance.
-   Cost.
-   Operational complexity.

Tenant isolation must be explicit.

------------------------------------------------------------------------

# 57. Cost Architecture

System design is also cost design.

Estimate:

``` text
Compute
Database
Storage
Bandwidth
Cache
Queue
Observability
Third-party APIs
```

Do not optimize only for performance.

Consider:

``` text
Performance
+
Reliability
+
Security
+
Cost
```

------------------------------------------------------------------------

# 58. Architecture Trade-offs

Every major decision should explain:

``` text
Decision
Why
Alternatives
Trade-offs
Consequences
```

Example:

``` text
Decision:
Use PostgreSQL.

Why:
Strong relational requirements.

Alternative:
MongoDB.

Trade-off:
PostgreSQL gives stronger relational guarantees,
but requires a more structured schema.
```

There is rarely a universally correct architecture.

------------------------------------------------------------------------

# 59. Architecture Decision Records

For important decisions, create an ADR.

Example:

``` text
# ADR-001: Use PostgreSQL

Status:
Accepted

Context:
The system has strong relational requirements.

Decision:
Use PostgreSQL.

Consequences:
Transactions and relational queries are straightforward.
Horizontal database scaling may become more complex at extreme scale.
```

------------------------------------------------------------------------

# 60. Architecture Diagrams

Use multiple diagram levels.

### Context Diagram

``` text
Users
 ↓
System
 ↓
External Systems
```

### Container / Service Diagram

``` text
Frontend
 ↓
API
 ↓
Services
 ↓
Database / Queue
```

### Component Diagram

``` text
Order Service
 ├── Controller
 ├── Service
 ├── Repository
 └── Event Publisher
```

### Sequence Diagram

Show important request flows:

``` text
Client → API
API → Database
API → Payment
Payment → API
API → Client
```

Use the appropriate level of detail.

------------------------------------------------------------------------

# 61. Sequence Diagrams

Use sequence diagrams for workflows involving multiple components.

Example:

``` text
User
 │
 │ Create Order
 ↓
API
 │
 │ Create Order
 ↓
Database
 │
 │ Success
 ↓
API
 │
 │ Create Payment
 ↓
Payment Provider
 │
 │ Success
 ↓
API
 │
 │ Response
 ↓
User
```

Sequence diagrams are especially useful for:

-   Payments.
-   Authentication.
-   Webhooks.
-   Async workflows.
-   Distributed transactions.

------------------------------------------------------------------------

# 62. State Machines

Use state machines when an entity has meaningful lifecycle states.

Example:

``` text
Order

PENDING
  ↓
PAID
  ↓
PROCESSING
  ↓
SHIPPED
  ↓
DELIVERED
```

Invalid transitions should be rejected.

Example:

``` text
DELIVERED
 ↓
PAID
```

should not be possible.

State machines reduce ambiguous business logic.

------------------------------------------------------------------------

# 63. Data Flow

Understand how data moves:

``` text
Client
 ↓
API
 ↓
Service
 ↓
Database
 ↓
Event
 ↓
Worker
 ↓
External System
```

For sensitive data, document:

-   Where it enters.
-   Where it is stored.
-   Who can access it.
-   Where it leaves the system.
-   How long it is retained.

------------------------------------------------------------------------

# 64. Backward Compatibility

Production systems often have multiple application versions running
simultaneously.

Design APIs and schemas so that:

``` text
Old Client
+
New Backend
```

and:

``` text
New Client
+
Old Backend
```

remain compatible during deployments where necessary.

Avoid breaking changes without a migration strategy.

------------------------------------------------------------------------

# 65. Deployment Strategy

Common strategies:

``` text
Rolling
Blue/Green
Canary
Feature Flag
```

Example canary:

``` text
New Version
 ↓
5% traffic
 ↓
Monitor
 ↓
25%
 ↓
50%
 ↓
100%
```

Use gradual rollout for high-risk changes.

------------------------------------------------------------------------

# 66. Zero-Downtime Deployment

Plan for:

``` text
Old Version
+
New Version
```

running simultaneously.

This affects:

-   API contracts.
-   Database migrations.
-   Events.
-   Caches.
-   Sessions.

Use backward-compatible migrations.

------------------------------------------------------------------------

# 67. Failure Mode Analysis

For every major component ask:

``` text
What if it fails?
```

Example:

``` text
Redis fails
 ↓
Can application still work?
```

Possible design:

``` text
Redis unavailable
 ↓
Fall back to database
```

But not every dependency needs a fallback.

Define acceptable degradation.

------------------------------------------------------------------------

# 68. Graceful Degradation

A system does not always need to be fully operational to remain useful.

Example:

``` text
Recommendation Service
        ↓
      Fails
        ↓
Show default results
```

The core product remains available.

Use graceful degradation for non-critical functionality.

------------------------------------------------------------------------

# 69. Single Points of Failure

Identify:

``` text
Database
Queue
Load Balancer
Authentication Provider
DNS
Storage
Third-party APIs
```

For each, ask:

``` text
Can this fail?
What happens?
How does the system recover?
```

Not every component needs redundancy, but the decision should be
intentional.

------------------------------------------------------------------------

# 70. Capacity Planning

As usage grows:

``` text
10K users
 ↓
100K users
 ↓
1M users
 ↓
10M users
```

ask:

``` text
What becomes the bottleneck?
```

Potential bottlenecks:

``` text
CPU
Memory
Database
Network
Storage
Queue
Third-party API
```

Optimize the actual bottleneck.

------------------------------------------------------------------------

# 71. Hotspots

A system may have:

``` text
Hot database rows
Hot Redis keys
Hot Kafka partitions
Hot tenants
Hot API endpoints
```

Hotspots can create disproportionate load.

Identify and distribute load where appropriate.

------------------------------------------------------------------------

# 72. Consistent Hashing

Useful for distributing data/work across nodes.

Conceptually:

``` text
Key
 ↓
Hash
 ↓
Node
```

When nodes change, consistent hashing minimizes unnecessary
reassignment.

Understand its use in:

-   Distributed caches.
-   Sharded systems.
-   Distributed storage.

------------------------------------------------------------------------

# 73. Load Balancing

Load balancers distribute traffic.

Strategies include:

``` text
Round Robin
Least Connections
Weighted
Hash-based
```

Understand:

-   Health checks.
-   Session affinity.
-   TLS termination.
-   Failure handling.

Prefer stateless services to reduce dependence on sticky sessions.

------------------------------------------------------------------------

# 74. Geographic Distribution

For global applications:

``` text
User
 ↓
Nearest Region
 ↓
Application
 ↓
Regional Data
```

Consider:

-   Latency.
-   Data residency.
-   Replication.
-   Failover.
-   Cost.
-   Consistency.

Multi-region architecture adds significant complexity.

Do not introduce it without a real requirement.

------------------------------------------------------------------------

# 75. Eventual Consistency

When data is replicated asynchronously:

``` text
Write
 ↓
Primary
 ↓
Replication
 ↓
Replica
```

there may be temporary disagreement.

Design UX around this.

Examples:

``` text
"Processing..."
"Updating..."
```

rather than assuming every read immediately reflects the latest write.

------------------------------------------------------------------------

# 76. System Design Review

Before implementation, review:

``` text
Requirements
Capacity
Architecture
Database
APIs
Caching
Queues
Security
Failure modes
Observability
Deployment
Cost
```

Ask another engineer to challenge assumptions.

------------------------------------------------------------------------

# 77. Common Anti-Patterns

Avoid:

### Premature Microservices

``` text
Small product
 ↓
15 services
```

### Premature Kafka

``` text
Simple CRUD
 ↓
Kafka everywhere
```

### Shared Database Across Services

``` text
Service A ─┐
Service B ─┼→ Same tables
Service C ─┘
```

### No Failure Planning

``` text
External API fails
 ↓
Entire application fails
```

### No Capacity Estimates

``` text
"It should scale."
```

without defining what scale means.

### Overengineering

``` text
10 users
 ↓
Kubernetes + Kafka + 8 databases
```

------------------------------------------------------------------------

# 78. Recommended Design Process

Use this sequence for most system design problems:

``` text
1. Clarify Requirements
        ↓
2. Define Scale
        ↓
3. Identify Core Entities
        ↓
4. Define APIs
        ↓
5. Draw High-Level Architecture
        ↓
6. Design Database
        ↓
7. Identify Bottlenecks
        ↓
8. Add Cache / Queue Where Needed
        ↓
9. Design Failure Handling
        ↓
10. Design Security
        ↓
11. Design Observability
        ↓
12. Define Deployment
        ↓
13. Review Trade-offs
```

Do not skip directly to technology selection.

------------------------------------------------------------------------

# 79. System Design Interview Structure

For system design interviews:

``` text
1. Requirements
2. Scale estimation
3. Core APIs
4. High-level architecture
5. Database
6. Deep dive
7. Scaling
8. Reliability
9. Security
10. Trade-offs
```

Do not spend the entire interview drawing boxes.

Explain why each decision exists.

------------------------------------------------------------------------

# 80. Example: Simple SaaS Architecture

A reasonable starting architecture:

``` text
                    Users
                      ↓
                    CDN
                      ↓
               Load Balancer
                      ↓
                Next.js / API
                 /     |     \
                /      |      \
             Redis   PostgreSQL  Queue
                        |          |
                        |        Workers
                        |
                  Object Storage
                        |
                  External APIs
```

Possible responsibilities:

``` text
CDN
→ Static assets

Frontend
→ UI / rendering

API
→ Business logic

PostgreSQL
→ Source of truth

Redis
→ Cache / ephemeral state

Queue
→ Async work

Workers
→ Background processing

Object Storage
→ Files

External APIs
→ Payments / email / AI / etc.
```

------------------------------------------------------------------------

# 81. Final Mental Model

When designing any system, ask:

``` text
1. What problem are we solving?
2. Who uses the system?
3. What are the functional requirements?
4. What are the non-functional requirements?
5. How much traffic and data will exist?
6. What are the core entities?
7. What are the APIs?
8. What is the source of truth?
9. What should be synchronous?
10. What should be asynchronous?
11. Where does caching help?
12. Where can the system fail?
13. What happens when dependencies fail?
14. How does the system scale?
15. What is the bottleneck?
16. How is data protected?
17. How is the system observed?
18. How is it deployed safely?
19. How is it recovered?
20. What are the trade-offs?
```

The goal is not:

``` text
Most complicated architecture
```

The goal is:

``` text
Right architecture
+
For the actual requirements
+
With explicit trade-offs
+
That can evolve safely
```

That is the foundation of production-grade system design.
