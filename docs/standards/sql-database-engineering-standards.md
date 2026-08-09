# SQL & Database Engineering Standards

## Purpose

This document defines general standards for designing, querying,
operating, and scaling databases in production applications.

The principles are primarily relational/SQL-focused, especially
PostgreSQL, but most apply to other relational databases as well.

The goal is not merely to make queries work. The goal is to build
databases that are:

``` text
Correct
+
Consistent
+
Performant
+
Secure
+
Maintainable
+
Observable
+
Scalable
```

------------------------------------------------------------------------

# 1. Core Principle

Treat the database as a critical part of the application's architecture.

Do not think of the database as:

``` text
"Just where we store data."
```

Think of it as:

``` text
Data Model
    ↓
Integrity Constraints
    ↓
Transactions
    ↓
Queries
    ↓
Indexes
    ↓
Concurrency
    ↓
Performance
    ↓
Backups / Recovery
```

Application code and database design should work together.

------------------------------------------------------------------------

# 2. Choose the Database Based on Requirements

Do not choose a database because it is popular.

Evaluate:

-   Data relationships.
-   Query patterns.
-   Transaction requirements.
-   Scale.
-   Consistency requirements.
-   Read/write ratio.
-   Data structure.
-   Operational complexity.
-   Team familiarity.
-   Cost.
-   Ecosystem.

For many SaaS applications:

``` text
PostgreSQL
+
Redis
+
Object Storage
```

is already an excellent starting architecture.

Do not introduce MongoDB, DynamoDB, Kafka, or another specialized system
without a real requirement.

------------------------------------------------------------------------

# 3. Schema First

Design the data model before blindly creating tables.

Identify:

-   Entities.
-   Relationships.
-   Attributes.
-   Constraints.
-   Cardinality.
-   Access patterns.
-   Ownership.
-   Lifecycle.

Example:

``` text
User
 │
 ├── creates
 │
 ▼
Organization
 │
 ├── contains
 │
 ▼
Project
 │
 ├── contains
 │
 ▼
Task
```

Think about both:

``` text
How is the data stored?
```

and:

``` text
How will the application query it?
```

------------------------------------------------------------------------

# 4. Naming Conventions

Choose one convention and use it consistently.

Example:

``` text
users
organizations
projects
project_members
created_at
updated_at
organization_id
```

Prefer clear names.

Avoid:

``` text
tbl_usr
usr_dt
x1
data2
```

Use consistent conventions for:

-   Tables.
-   Columns.
-   Foreign keys.
-   Indexes.
-   Constraints.
-   Enum values.

Example index naming:

``` text
idx_users_email
idx_orders_user_id
idx_orders_status_created_at
```

------------------------------------------------------------------------

# 5. Primary Keys

Every major entity should generally have a stable primary key.

Common options:

``` text
BIGINT
UUID
ULID
```

Choose based on requirements.

The primary key should:

-   Uniquely identify the record.
-   Be stable.
-   Not encode business meaning unnecessarily.

Avoid using mutable business fields such as email addresses as primary
keys.

Example:

``` text
users
-----
id
email
name
```

not:

``` text
users
-----
email ← primary key
```

unless there is a very deliberate reason.

------------------------------------------------------------------------

# 6. Foreign Keys

Use foreign keys to enforce relationships where appropriate.

Example:

``` sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
);
```

Foreign keys prevent invalid references.

Without them, application bugs can create:

``` text
Order → User 123
```

when User 123 does not exist.

Do not rely solely on application code for critical referential
integrity.

------------------------------------------------------------------------

# 7. Constraints

Use the database to enforce important invariants.

Common constraints:

``` text
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
```

Example:

``` sql
email TEXT NOT NULL UNIQUE
```

and:

``` sql
CHECK (quantity > 0)
```

A good rule:

> If invalid data must never exist, enforce it as close to the database
> as practical.

------------------------------------------------------------------------

# 8. NULL Handling

Understand the difference between:

``` text
NULL
empty string
0
false
```

They are not interchangeable.

Use `NULL` when the value is genuinely unknown or not applicable.

Avoid unnecessary nullable columns.

Ask:

``` text
Can this field legitimately be absent?
```

If not:

``` sql
NOT NULL
```

------------------------------------------------------------------------

# 9. Normalization

Understand normalization before deliberately denormalizing.

Typical goals:

-   Reduce duplication.
-   Prevent update anomalies.
-   Preserve consistency.
-   Represent relationships correctly.

Common levels:

``` text
1NF
2NF
3NF
```

You do not need to blindly normalize everything.

Design based on:

``` text
Correctness
+
Access patterns
+
Performance
```

------------------------------------------------------------------------

# 10. Denormalization

Denormalization can be useful when performance requires it.

Example:

Instead of calculating an expensive value repeatedly:

``` text
orders
 +
order_items
 +
products
```

you may store:

``` text
orders.total_amount
```

if the architecture guarantees that the value stays consistent.

Denormalization introduces a consistency cost.

Always document the source of truth.

------------------------------------------------------------------------

# 11. Relationships

Understand:

### One-to-One

``` text
User
 ↓
Profile
```

### One-to-Many

``` text
User
 ↓
Orders
```

### Many-to-Many

``` text
Users
 ↕
project_members
 ↕
Projects
```

Use junction tables for relational many-to-many relationships.

Example:

``` text
project_members
---------------
project_id
user_id
```

Add an appropriate unique constraint:

``` sql
UNIQUE(project_id, user_id)
```

------------------------------------------------------------------------

# 12. Indexes

Indexes are one of the most important database performance tools.

Without an index:

``` text
Query
 ↓
Scan millions of rows
```

With a suitable index:

``` text
Query
 ↓
Index
 ↓
Relevant rows
```

Common index candidates:

-   Foreign keys used in queries.
-   Frequently filtered columns.
-   Frequently sorted columns.
-   Unique lookup fields.
-   Composite query patterns.

But indexes are not free.

They:

-   Consume storage.
-   Slow writes.
-   Increase maintenance cost.

Do not create an index for every column.

------------------------------------------------------------------------

# 13. Composite Indexes

Design composite indexes around actual query patterns.

Example query:

``` sql
SELECT *
FROM orders
WHERE user_id = ?
  AND status = ?
ORDER BY created_at DESC;
```

A useful index may be:

``` text
(user_id, status, created_at)
```

Index column order matters.

Do not blindly create:

``` text
(user_id)
(status)
(created_at)
```

when the workload actually benefits from a composite index.

------------------------------------------------------------------------

# 14. Index Selectivity

Indexes are most useful when they can narrow down the candidate rows
effectively.

A highly repetitive column such as:

``` text
is_active
```

may not always benefit from a simple index.

Think about:

-   Cardinality.
-   Selectivity.
-   Query frequency.
-   Table size.
-   Write frequency.

Measure instead of guessing.

------------------------------------------------------------------------

# 15. Query Performance

Never assume a query is fast because it looks simple.

Use query analysis tools such as:

``` sql
EXPLAIN
EXPLAIN ANALYZE
```

Investigate:

-   Sequential scans.
-   Index scans.
-   Join strategies.
-   Sorts.
-   Aggregations.
-   Row estimates.
-   Actual rows.
-   Query planning time.
-   Execution time.

Example:

``` sql
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE user_id = 123;
```

------------------------------------------------------------------------

# 16. Avoid SELECT \*

Prefer selecting the columns you actually need.

Avoid:

``` sql
SELECT *
FROM users;
```

when you only need:

``` sql
SELECT id, name, email
FROM users;
```

Benefits:

-   Smaller payloads.
-   Less memory.
-   Less network traffic.
-   Less accidental data exposure.
-   More predictable queries.

------------------------------------------------------------------------

# 17. N+1 Query Problem

Watch for:

``` text
1 query → fetch users

N queries → fetch orders for each user
```

Example:

``` text
SELECT users

SELECT orders WHERE user_id = 1
SELECT orders WHERE user_id = 2
SELECT orders WHERE user_id = 3
...
```

Prefer:

-   Joins.
-   Batch queries.
-   Appropriate eager loading.
-   Data loaders where applicable.

Monitor ORM-generated queries.

------------------------------------------------------------------------

# 18. Pagination

Never return unbounded datasets.

Bad:

``` sql
SELECT *
FROM orders;
```

For large data sets, use pagination.

Offset pagination:

``` sql
LIMIT 20 OFFSET 1000;
```

Cursor pagination:

``` text
WHERE created_at < last_seen_timestamp
ORDER BY created_at DESC
LIMIT 20
```

Cursor pagination is often preferable for large or frequently changing
datasets.

------------------------------------------------------------------------

# 19. Sorting

Sorting can become expensive.

If you frequently query:

``` sql
ORDER BY created_at DESC
```

consider whether the query pattern is supported by an appropriate index.

Always combine indexing decisions with real query patterns.

------------------------------------------------------------------------

# 20. Transactions

Use transactions when operations must succeed or fail together.

Example:

``` text
Create Order
+
Create Order Items
+
Reduce Inventory
```

If inventory update fails, the entire operation may need to roll back.

Conceptually:

``` text
BEGIN
  operation 1
  operation 2
  operation 3
COMMIT
```

or:

``` text
ROLLBACK
```

------------------------------------------------------------------------

# 21. ACID

Understand:

### Atomicity

All operations happen or none happen.

### Consistency

Data moves from one valid state to another.

### Isolation

Concurrent transactions do not incorrectly interfere.

### Durability

Committed data survives failures according to the database's durability
guarantees.

You should understand what your database actually guarantees rather than
treating ACID as a buzzword.

------------------------------------------------------------------------

# 22. Isolation Levels

Understand common transaction isolation levels:

``` text
Read Uncommitted
Read Committed
Repeatable Read
Serializable
```

Learn the problems they address:

``` text
Dirty reads
Non-repeatable reads
Phantom reads
Lost updates
```

Do not automatically use the strongest isolation level everywhere.

Stronger isolation can reduce concurrency.

------------------------------------------------------------------------

# 23. Locking

Understand:

-   Row locks.
-   Table locks.
-   Pessimistic locking.
-   Optimistic locking.

Use locking when concurrent updates can create incorrect state.

Example:

``` text
Two users
   ↓
Try to purchase last item
   ↓
Concurrency problem
```

The database must protect the invariant.

------------------------------------------------------------------------

# 24. Deadlocks

Deadlocks can occur when transactions wait on each other's locks.

Example:

``` text
Transaction A
locks Row 1
waits for Row 2

Transaction B
locks Row 2
waits for Row 1
```

Reduce deadlocks by:

-   Keeping transactions short.
-   Accessing resources in a consistent order.
-   Avoiding unnecessary locks.
-   Retrying safely when appropriate.

------------------------------------------------------------------------

# 25. Connection Pooling

Do not create a new database connection for every request.

Use connection pooling.

Conceptually:

``` text
Application
 ↓
Connection Pool
 ├── Connection
 ├── Connection
 ├── Connection
 └── Connection
        ↓
    Database
```

Understand pool size and database connection limits.

This is especially important in serverless environments.

------------------------------------------------------------------------

# 26. Migrations

Schema changes should be version controlled.

Example:

``` text
Migration 001
Create users

Migration 002
Create organizations

Migration 003
Add organization_id

Migration 004
Add index
```

Rules:

-   Never manually change production schema without a controlled
    process.
-   Review migration SQL.
-   Test migrations.
-   Make migrations reproducible.
-   Understand rollback limitations.
-   Be careful with destructive changes.

------------------------------------------------------------------------

# 27. Safe Schema Changes

For production systems, prefer changes that can coexist with old and new
application versions.

Instead of:

``` text
Rename column immediately
```

consider:

``` text
Add new column
 ↓
Deploy application writing both
 ↓
Backfill
 ↓
Switch reads
 ↓
Stop old writes
 ↓
Remove old column later
```

This is especially important during rolling deployments.

------------------------------------------------------------------------

# 28. Seed Data

Separate:

``` text
Migration
Seed
Test fixtures
```

Migration changes schema.

Seed creates initial/reference data.

Test fixtures create test-specific data.

Do not mix them unnecessarily.

------------------------------------------------------------------------

# 29. Soft Deletes

Sometimes records should not be physically deleted.

Example:

``` text
deleted_at
```

This can help with:

-   Recovery.
-   Auditing.
-   Historical references.

But soft deletes create complexity:

``` text
Every query must remember:
WHERE deleted_at IS NULL
```

Use deliberately.

For sensitive or regulated data, understand that soft deletion may not
satisfy actual deletion requirements.

------------------------------------------------------------------------

# 30. Auditing

Important systems may need to track:

``` text
Who
What
When
From where
```

Example:

``` text
audit_logs
-----------
id
actor_id
action
entity_type
entity_id
created_at
metadata
```

Do not store sensitive information unnecessarily.

------------------------------------------------------------------------

# 31. Timestamps

Use consistent timestamp conventions.

Common fields:

``` text
created_at
updated_at
deleted_at
```

Prefer storing timestamps in a timezone-aware representation and
standardize application/database conventions.

Do not mix arbitrary local times across systems.

------------------------------------------------------------------------

# 32. Monetary Values

Never use floating-point numbers for financial amounts when exact
decimal arithmetic is required.

Prefer:

``` text
DECIMAL / NUMERIC
```

or integer minor units:

``` text
₹500.00
→ 50000 paise
```

Choose one representation consistently.

Always define currency explicitly when dealing with multi-currency
systems.

------------------------------------------------------------------------

# 33. IDs and External Identifiers

Keep internal database identifiers separate from business/external
identifiers when appropriate.

Example:

``` text
id
public_id
stripe_customer_id
```

Do not expose internal implementation details unnecessarily.

If IDs are exposed publicly, consider whether sequential IDs reveal
information.

------------------------------------------------------------------------

# 34. Data Types

Choose the narrowest sensible type that represents the data correctly.

Examples:

``` text
BOOLEAN → boolean
INTEGER → integer
DECIMAL → numeric
Timestamp → timestamp
Structured JSON → jsonb
```

Do not store everything as:

``` text
TEXT
```

unless there is a reason.

Correct types improve:

-   Validation.
-   Storage.
-   Querying.
-   Indexing.
-   Data integrity.

------------------------------------------------------------------------

# 35. JSON / JSONB

Use JSON/JSONB for genuinely flexible or semi-structured data.

Good:

``` text
metadata
provider_response
configuration
```

Avoid using JSON as a replacement for relational modeling.

Bad:

``` text
users
-----
id
everything_json
```

when the data has stable relationships that should be modeled
relationally.

------------------------------------------------------------------------

# 36. SQL Query Standards

Prefer readable SQL.

Good:

``` sql
SELECT
    id,
    name,
    email
FROM users
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT $2;
```

Avoid giant unreadable queries.

For complex queries:

-   Use CTEs where they improve readability.
-   Name intermediate results clearly.
-   Comment the reasoning, not obvious syntax.
-   Keep query logic close to the repository/data-access layer.

------------------------------------------------------------------------

# 37. SQL Injection

Never construct SQL by concatenating untrusted strings.

Bad:

``` ts
`SELECT * FROM users WHERE email = '${email}'`
```

Use parameterized queries:

``` sql
SELECT *
FROM users
WHERE email = $1;
```

ORMs generally help, but raw SQL still requires discipline.

------------------------------------------------------------------------

# 38. ORM Standards

ORMs are useful, but understand the SQL they generate.

Rules:

-   Know how relations are loaded.
-   Watch generated queries.
-   Understand transactions.
-   Understand indexes.
-   Avoid blindly loading entire relation graphs.
-   Avoid hidden N+1 queries.
-   Use raw SQL when appropriate.
-   Do not let the ORM replace knowledge of SQL.

Prisma/Drizzle/etc. are tools, not substitutes for database knowledge.

------------------------------------------------------------------------

# 39. Repository / DAL Boundary

Keep database-specific code behind a clear boundary.

Example:

``` text
Service
   ↓
UserRepository
   ↓
ORM / SQL
   ↓
PostgreSQL
```

The service should not contain dozens of raw SQL queries.

This improves:

-   Testability.
-   Maintainability.
-   Database portability where needed.
-   Query ownership.

Do not create repository abstractions purely for ceremony. They should
provide a meaningful boundary.

------------------------------------------------------------------------

# 40. Caching

Use Redis or another cache when database reads become unnecessarily
expensive.

Typical pattern:

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
```

Understand:

-   TTL.
-   Cache invalidation.
-   Cache-aside.
-   Write-through.
-   Cache stampede.
-   Stale data.

Never treat cache as the source of truth unless the architecture
explicitly makes it one.

------------------------------------------------------------------------

# 41. Read Replicas

For read-heavy systems:

``` text
Application
   ↓
Primary
   ↓
Writes

Application
   ↓
Read Replica
   ↓
Reads
```

Understand replication lag.

Do not assume:

``` text
Write → immediately visible on replica
```

If read-after-write consistency is required, route appropriately.

------------------------------------------------------------------------

# 42. Database Scaling

Understand the progression:

``` text
Optimize Queries
      ↓
Indexes
      ↓
Caching
      ↓
Connection Pooling
      ↓
Vertical Scaling
      ↓
Read Replicas
      ↓
Partitioning
      ↓
Sharding
```

Do not jump to sharding before exhausting simpler solutions.

------------------------------------------------------------------------

# 43. Partitioning

Partition large tables when there is a real operational or performance
benefit.

Common strategies:

``` text
Time-based
Tenant-based
Range-based
Hash-based
```

Example:

``` text
events_2026_01
events_2026_02
events_2026_03
```

Understand partition pruning and operational tradeoffs.

------------------------------------------------------------------------

# 44. Sharding

Sharding distributes data across multiple database instances.

Conceptually:

``` text
User ID
   ↓
Shard Key
   ↓
 ┌────┬────┬────┐
 S1   S2   S3
```

Challenges include:

-   Choosing a shard key.
-   Cross-shard queries.
-   Rebalancing.
-   Transactions.
-   Hot partitions.
-   Operational complexity.

Sharding is an advanced technique.

------------------------------------------------------------------------

# 45. Backups

A production database must have backups.

Understand:

-   Full backups.
-   Incremental backups.
-   Point-in-time recovery.
-   Retention.
-   Backup encryption.
-   Backup testing.

Critical rule:

> A backup that has never been restored is not a proven backup.

Regularly test restoration.

------------------------------------------------------------------------

# 46. Disaster Recovery

Define:

### RPO

How much data can you afford to lose?

### RTO

How quickly must the system recover?

Example:

``` text
RPO = 5 minutes
RTO = 30 minutes
```

These requirements influence:

-   Backup frequency.
-   Replication.
-   Infrastructure.
-   Recovery procedures.

------------------------------------------------------------------------

# 47. Monitoring

Monitor the database itself.

Track:

``` text
CPU
Memory
Disk
Connections
Query latency
Slow queries
Lock waits
Deadlocks
Cache hit ratio
Replication lag
Storage growth
```

Application monitoring alone is not enough.

------------------------------------------------------------------------

# 48. Data Lifecycle

Decide what happens to old data.

Possible strategies:

``` text
Hot data
 ↓
Warm data
 ↓
Archive
 ↓
Delete
```

Consider:

-   Retention requirements.
-   Storage cost.
-   Compliance.
-   Query needs.
-   Backup impact.

Do not keep unlimited data indefinitely without a reason.

------------------------------------------------------------------------

# 49. Multi-Tenant Databases

For SaaS applications, every tenant's data must be isolated.

Common approaches:

### Shared database / shared schema

``` text
organizations
users
projects

organization_id
```

### Separate schema per tenant

``` text
tenant_a.*
tenant_b.*
```

### Separate database per tenant

Choose based on:

-   Scale.
-   Security.
-   Compliance.
-   Cost.
-   Operational complexity.

At minimum, enforce tenant boundaries in every relevant query.

------------------------------------------------------------------------

# 50. Search

Do not automatically use SQL `LIKE` for advanced search requirements.

Depending on requirements, consider:

-   PostgreSQL full-text search.
-   Trigram indexes.
-   Elasticsearch/OpenSearch.
-   Dedicated search services.

Choose based on:

``` text
Search complexity
Scale
Ranking requirements
Latency
Operational cost
```

------------------------------------------------------------------------

# 51. Concurrency

Always consider what happens when two requests arrive simultaneously.

Example:

``` text
Inventory = 1

Request A → buy
Request B → buy
```

Without proper concurrency control:

``` text
Inventory = -1
```

Use:

-   Transactions.
-   Constraints.
-   Locks.
-   Atomic updates.
-   Optimistic concurrency.
-   Idempotency.

------------------------------------------------------------------------

# 52. Idempotency

Operations that may be retried should be safe to repeat.

Especially:

-   Payments.
-   Orders.
-   Webhooks.
-   Imports.
-   External callbacks.

Example:

``` text
idempotency_key = abc123
```

If the same operation arrives twice, the database should prevent
duplicate effects.

A unique constraint can often help:

``` sql
UNIQUE(idempotency_key)
```

------------------------------------------------------------------------

# 53. Data Integrity

Ask:

> What states should be impossible?

Then enforce them.

Examples:

``` text
Order cannot have negative total
User email must be unique
Order must belong to an existing user
Quantity must be > 0
Membership cannot exist twice
```

Use:

``` text
Constraints
+
Transactions
+
Application rules
```

Do not rely exclusively on any single layer.

------------------------------------------------------------------------

# 54. Security

Database security includes:

-   Least-privilege database users.
-   Separate application roles where appropriate.
-   Encrypted connections.
-   Encrypted backups.
-   Secret management.
-   Network restrictions.
-   Auditing.
-   Parameterized queries.
-   Access control.

The application should not connect using a database superuser in
production.

------------------------------------------------------------------------

# 55. Production Database Users

Avoid:

``` text
application → postgres superuser
```

Prefer:

``` text
application
    ↓
restricted database role
    ↓
required tables/operations
```

Use least privilege.

------------------------------------------------------------------------

# 56. Schema Ownership

A clear owner should exist for schema changes.

Before changing a table, consider:

``` text
Who uses this table?
Which APIs depend on it?
Which jobs depend on it?
Which reports depend on it?
Can old application versions still work?
```

Database changes can have a much larger blast radius than a single code
change.

------------------------------------------------------------------------

# 57. Reporting / Analytics

Do not allow expensive analytical queries to destroy production
performance.

For heavy analytics, consider:

``` text
Production DB
      ↓
Read replica / ETL
      ↓
Analytics system
```

Depending on scale, use:

-   Read replicas.
-   Materialized views.
-   Data warehouse.
-   ETL/ELT pipelines.

------------------------------------------------------------------------

# 58. Materialized Views

For expensive repeated queries, a materialized view can precompute
results.

Conceptually:

``` text
Complex Query
      ↓
Materialized View
      ↓
Fast Reads
```

But remember:

``` text
Fast reads
+
Refresh complexity
+
Potentially stale data
```

Use when the tradeoff is justified.

------------------------------------------------------------------------

# 59. Database Documentation

Document:

-   ER diagrams.
-   Important relationships.
-   Critical constraints.
-   Index rationale.
-   Data ownership.
-   Retention rules.
-   Migration strategy.
-   Backup strategy.
-   Important queries.
-   Known performance considerations.

Especially document non-obvious decisions.

------------------------------------------------------------------------

# 60. Testing Database Code

Test:

### Repository tests

``` text
Correct query
Correct mapping
Correct constraints
```

### Integration tests

``` text
Application
 ↓
Real/Test database
```

Test:

-   Transactions.
-   Constraints.
-   Unique violations.
-   Foreign keys.
-   Concurrency.
-   Migrations.

Do not rely exclusively on mocks for database behavior.

------------------------------------------------------------------------

# 61. Database Testing Environment

Prefer an isolated database for integration tests.

Possible approaches:

``` text
Test PostgreSQL
Docker PostgreSQL
Testcontainers
Ephemeral database
```

Avoid running destructive tests against development or production
databases.

------------------------------------------------------------------------

# 62. Migration Testing

Before production:

``` text
Fresh database
 ↓
Run all migrations
 ↓
Seed
 ↓
Run tests
```

Also test migrations against realistic existing data when changes are
potentially destructive or expensive.

------------------------------------------------------------------------

# 63. Performance Testing

Test realistic workloads.

Measure:

``` text
Requests/sec
Query latency
p50
p95
p99
CPU
Memory
Connections
Lock contention
```

Do not optimize based solely on local development performance.

------------------------------------------------------------------------

# 64. Golden Rules

1.  Design the schema intentionally.
2.  Choose the database based on requirements.
3.  Use primary keys consistently.
4.  Use foreign keys where appropriate.
5.  Enforce critical invariants with constraints.
6.  Use `NOT NULL` when a value must exist.
7.  Understand normalization before denormalizing.
8.  Index based on real query patterns.
9.  Do not index every column.
10. Always investigate slow queries with query plans.
11. Avoid `SELECT *` when unnecessary.
12. Prevent N+1 queries.
13. Paginate large datasets.
14. Use transactions for atomic operations.
15. Understand isolation and locking.
16. Keep transactions short.
17. Use connection pooling.
18. Version-control schema changes.
19. Make production migrations safe.
20. Never build SQL with untrusted string concatenation.
21. Understand the SQL generated by your ORM.
22. Keep database access behind a clear DAL/repository boundary.
23. Use caching intentionally.
24. Treat caches as non-authoritative unless explicitly designed
    otherwise.
25. Design for concurrency.
26. Make retryable operations idempotent.
27. Use least-privilege database credentials.
28. Back up production data.
29. Test database restoration.
30. Define RPO and RTO for important systems.
31. Monitor database health.
32. Define data retention policies.
33. Isolate tenants correctly.
34. Do not introduce sharding prematurely.
35. Do not use JSON as a replacement for relational modeling.
36. Do not let analytics workloads destroy production performance.
37. Test real database behavior with integration tests.
38. Keep migrations reproducible.
39. Document important schema decisions.
40. Optimize based on measurements, not assumptions.

------------------------------------------------------------------------

# 65. Final Database Mental Model

Whenever you design a database feature, ask:

``` text
1. What entities exist?
2. What are their relationships?
3. What data must never be invalid?
4. Which constraints enforce that?
5. What are the most common queries?
6. Which indexes support those queries?
7. How much data will exist?
8. How will pagination work?
9. What happens under concurrent requests?
10. Does this require a transaction?
11. What happens if the request is retried?
12. Does the query create an N+1 problem?
13. What happens when the table becomes 10x larger?
14. What happens when the database is unavailable?
15. How is the data backed up?
16. How is it restored?
17. Who can access the data?
18. How long should the data be retained?
19. How will schema changes be deployed safely?
20. How will the database be monitored?
```

The goal is not to use every database technique.

The goal is to maintain:

``` text
Correct Data
     +
Strong Integrity
     +
Predictable Queries
     +
Controlled Concurrency
     +
Good Performance
     +
Secure Access
     +
Reliable Recovery
     +
Safe Evolution
```

That is the foundation of production-grade SQL and database engineering.
