# Redis, Queues & Kafka Engineering Standards

## Purpose

This document defines standards for using Redis, message queues,
background workers, and Kafka in production applications.

These technologies solve related but different problems:

``` text
Redis
→ Fast shared data / caching / coordination

Queues
→ Reliable asynchronous work

Kafka
→ Durable event streaming / high-throughput event distribution
```

A typical architecture can look like:

``` text
API
 ↓
Application Service
 ├──────────────→ PostgreSQL
 │
 ├──────────────→ Redis
 │
 └──────────────→ Queue / Kafka
                       ↓
                    Worker
                       ↓
              External Service / DB
```

The goal is to build asynchronous and distributed systems that are:

``` text
Reliable
+
Scalable
+
Idempotent
+
Observable
+
Recoverable
+
Cost-efficient
```

------------------------------------------------------------------------

# 1. Core Principles

1.  Choose the right primitive for the problem.
2.  Treat messages as untrusted external input.
3.  Assume messages can be duplicated.
4.  Assume consumers can crash.
5.  Assume networks can fail.
6.  Make consumers idempotent.
7.  Bound retries.
8.  Use dead-letter handling for poison messages.
9.  Monitor queue and consumer health.
10. Never use Redis as a database replacement without understanding the
    durability requirements.
11. Do not use Kafka merely because it is popular.
12. Design for backpressure.
13. Make message schemas explicit and versionable.
14. Keep side effects safe under retries.
15. Understand delivery semantics instead of assuming exactly-once
    behavior.

------------------------------------------------------------------------

# 2. Choosing the Right Technology

Use **Redis** for:

``` text
Caching
Sessions
Rate limiting
Distributed coordination
Short-lived state
Fast lookups
Counters
Some lightweight queues/streams
```

Use a **traditional queue** for:

``` text
Background jobs
Email sending
Image processing
PDF processing
Async API work
Retryable tasks
Work distribution
```

Use **Kafka** for:

``` text
Event streaming
High-throughput pipelines
Multiple independent consumers
Durable event history
Replayable events
Data integration
Analytics pipelines
Event-driven architectures
```

Do not choose based only on performance benchmarks.

Choose based on semantics.

------------------------------------------------------------------------

# 3. Queue vs Event Stream

A queue generally represents:

``` text
Work that needs to be processed
```

An event stream generally represents:

``` text
Something that happened
```

Example queue:

``` text
GenerateInvoiceJob
 ↓
Worker
 ↓
Done
```

Example event:

``` text
OrderCreated
 ↓
Billing Consumer
Analytics Consumer
Notification Consumer
```

The distinction matters architecturally.

------------------------------------------------------------------------

# 4. Queue Mental Model

A basic queue:

``` text
Producer
   ↓
┌───────────────┐
│ Queue         │
│ A B C D E     │
└───────────────┘
   ↓
Consumer / Worker
```

The producer adds work.

The worker processes work.

The system should define what happens when processing fails.

------------------------------------------------------------------------

# 5. Producer Standards

A producer should:

-   Validate data before publishing.
-   Use an explicit message schema.
-   Include an event/job ID.
-   Include useful metadata.
-   Avoid putting unnecessary large payloads into messages.
-   Handle publish failures.
-   Use appropriate timeouts.

Example conceptual message:

``` json
{
  "id": "job_123",
  "type": "invoice.generate",
  "version": 1,
  "createdAt": "2026-08-09T12:00:00Z",
  "payload": {
    "invoiceId": "inv_123"
  }
}
```

------------------------------------------------------------------------

# 6. Message IDs

Every important message should have a unique identifier.

Example:

``` text
message_id = msg_8f21...
```

This helps with:

``` text
Deduplication
Tracing
Debugging
Audit
Idempotency
```

Do not depend solely on timestamps for identity.

------------------------------------------------------------------------

# 7. Message Metadata

Useful metadata can include:

``` text
message_id
event_type
schema_version
created_at
producer
correlation_id
trace_id
tenant_id
```

Only include data that is actually required.

Avoid putting secrets or unnecessary personal data into messages.

------------------------------------------------------------------------

# 8. Payload Size

Do not use queues or Kafka as arbitrary blob storage.

Avoid:

``` text
Message
 ↓
100 MB PDF
```

Prefer:

``` text
Object Storage
 ↓
File
 ↓
Message contains object ID / URL
```

Example:

``` json
{
  "documentId": "doc_123",
  "storageKey": "documents/123.pdf"
}
```

------------------------------------------------------------------------

# 9. Acknowledgements

Consumers need a clear acknowledgement model.

Conceptually:

``` text
Receive
 ↓
Process
 ↓
Success
 ↓
ACK
```

If processing fails:

``` text
Receive
 ↓
Process
 ↓
Failure
 ↓
Retry / DLQ
```

Do not acknowledge work before the important side effect has succeeded
unless the system is deliberately designed that way.

------------------------------------------------------------------------

# 10. At-Most-Once

At-most-once means:

``` text
Message may be lost
but is not intentionally processed more than once.
```

Potentially:

``` text
Receive
 ↓
ACK
 ↓
Process
 ↓
Crash
```

The message may be lost.

Use only when loss is acceptable.

------------------------------------------------------------------------

# 11. At-Least-Once

At-least-once means:

``` text
Message should not be lost
but may be processed more than once.
```

Example:

``` text
Receive
 ↓
Process
 ↓
Crash before ACK
 ↓
Message delivered again
```

This is common in production systems.

Therefore:

> Consumers should generally be idempotent.

------------------------------------------------------------------------

# 12. Exactly-Once

"Exactly once" is often misunderstood.

End-to-end exactly-once behavior is difficult because:

``` text
Message processing
+
Database transaction
+
External API
+
Network
```

may not share one atomic transaction.

Do not assume a Kafka/queue feature automatically makes an external side
effect exactly once.

Design explicit idempotency.

------------------------------------------------------------------------

# 13. Idempotent Consumers

A consumer should safely handle duplicate messages.

Example:

``` text
Message:
payment.completed
id = msg_123
```

Consumer checks:

``` text
Have I processed msg_123?
```

If yes:

``` text
Skip duplicate
```

If no:

``` text
Process
Record completion
```

Possible approaches:

``` text
Unique database constraint
Processed-message table
Idempotency key
State transition check
```

------------------------------------------------------------------------

# 14. Idempotency for Side Effects

Dangerous example:

``` text
Message
 ↓
Charge credit card
```

If the message is delivered twice:

``` text
Charge
+
Charge again
```

Use provider-supported idempotency keys where available.

------------------------------------------------------------------------

# 15. Retries

Transient failures should generally be retried.

Examples:

``` text
Temporary network failure
Temporary provider outage
Rate limit
Database connection failure
```

Do not retry permanent errors indefinitely.

Examples:

``` text
Invalid payload
Invalid user ID
Malformed schema
Unauthorized operation
```

------------------------------------------------------------------------

# 16. Exponential Backoff

Prefer:

``` text
Attempt 1
 ↓
short delay
 ↓
Attempt 2
 ↓
longer delay
 ↓
Attempt 3
```

Use jitter to avoid synchronized retries.

Conceptually:

``` text
delay = exponential_backoff + random_jitter
```

------------------------------------------------------------------------

# 17. Retry Limits

Every retry policy should define:

``` text
Maximum attempts
Maximum delay
Maximum total processing time
```

Never:

``` text
retry forever
```

unless there is a very deliberate design for it.

------------------------------------------------------------------------

# 18. Dead Letter Queue

A dead-letter queue stores messages that cannot be successfully
processed.

``` text
Main Queue
 ↓
Worker
 ↓ failure
Retry
 ↓ failure
Retry
 ↓ failure
DLQ
```

DLQ messages should be inspectable and recoverable.

------------------------------------------------------------------------

# 19. Poison Messages

A poison message consistently causes failure.

Example:

``` text
Invalid payload
 ↓
Worker fails
 ↓
Retry
 ↓
Worker fails
 ↓
Retry
```

Without limits, one message can consume resources indefinitely.

Move poison messages to a DLQ after appropriate retry handling.

------------------------------------------------------------------------

# 20. DLQ Operations

A DLQ should not become a graveyard.

Track:

``` text
DLQ size
Age of oldest message
Failure reason
Message type
Producer
```

Have a recovery process:

``` text
Inspect
 ↓
Fix root cause
 ↓
Validate message
 ↓
Replay
```

------------------------------------------------------------------------

# 21. Backpressure

If producers generate work faster than consumers can process:

``` text
Producer
 ↓↓↓↓↓↓↓↓↓
Queue
 ↓
Consumer
```

the queue grows.

Monitor:

``` text
Queue depth
Consumer throughput
Processing latency
Oldest message age
```

Solutions:

``` text
Scale consumers
Slow producers
Batch work
Reject work
Increase capacity
```

------------------------------------------------------------------------

# 22. Queue Depth

Queue depth alone is not enough.

Monitor:

``` text
Depth
+
Arrival rate
+
Processing rate
+
Oldest message age
```

A queue of 10,000 messages may be healthy if workers process
20,000/minute.

A queue of 100 may be unhealthy if workers process only 1/minute.

------------------------------------------------------------------------

# 23. Worker Architecture

A worker should generally:

``` text
Receive
 ↓
Validate
 ↓
Process
 ↓
Persist side effects
 ↓
ACK
```

Workers should be:

-   Restartable.
-   Idempotent.
-   Observable.
-   Bounded.
-   Gracefully terminable.

------------------------------------------------------------------------

# 24. Worker Concurrency

Control how many messages a worker processes simultaneously.

Example:

``` text
Worker
 ├── Job A
 ├── Job B
 ├── Job C
 └── Job D
```

Too much concurrency can overload:

``` text
Database
External API
CPU
Memory
```

Too little concurrency wastes capacity.

Tune based on measurements.

------------------------------------------------------------------------

# 25. Graceful Worker Shutdown

When a worker receives SIGTERM:

``` text
Stop accepting new work
 ↓
Finish current work
 ↓
ACK completed work
 ↓
Release resources
 ↓
Exit
```

Do not terminate workers abruptly during deployments unless necessary.

------------------------------------------------------------------------

# 26. Job Timeouts

Every background job should have a reasonable timeout.

Example:

``` text
PDF processing
→ 10 minutes maximum
```

If a job exceeds the limit:

``` text
Timeout
 ↓
Retry / DLQ
```

Do not allow stuck jobs to consume workers forever.

------------------------------------------------------------------------

# 27. Job Visibility Timeout

Some queue systems temporarily hide a message while it is being
processed.

Conceptually:

``` text
Queue
 ↓
Worker receives message
 ↓
Message invisible
 ↓
Worker succeeds
 ↓
ACK
```

If the worker dies:

``` text
Visibility expires
 ↓
Message becomes available again
```

Choose visibility timeouts based on realistic job duration.

------------------------------------------------------------------------

# 28. Priority Queues

Some workloads require priorities:

``` text
Critical
 ↓
High
 ↓
Normal
 ↓
Low
```

Do not implement priority using arbitrary hacks if the queue system
already provides a suitable mechanism.

Be careful that low-priority jobs do not starve indefinitely.

------------------------------------------------------------------------

# 29. Delayed Jobs

Delayed jobs are useful for:

``` text
Retry later
Send reminder
Scheduled processing
Timeout workflows
```

Use queue-native scheduling/delay features where available.

Do not build a polling loop unnecessarily.

------------------------------------------------------------------------

# 30. Batch Processing

Batching can improve throughput.

Instead of:

``` text
1 message
 ↓
1 database query
```

consider:

``` text
100 messages
 ↓
1 batch operation
```

where the workload supports it.

Balance:

``` text
Throughput
Latency
Failure complexity
```

------------------------------------------------------------------------

# 31. Redis Overview

Redis is an in-memory data store.

Common uses:

``` text
Cache
Session store
Rate limiter
Counters
Distributed locks
Short-lived state
Pub/Sub
Streams
```

Redis is fast because data is primarily served from memory.

------------------------------------------------------------------------

# 32. Redis Is Not Automatically a Database Replacement

Before storing important data in Redis, ask:

``` text
What durability is required?
What happens if Redis loses data?
Can the data be reconstructed?
What is the recovery strategy?
```

For authoritative business data, a durable database is often more
appropriate.

------------------------------------------------------------------------

# 33. Cache-Aside Pattern

A common caching pattern:

``` text
Application
 ↓
Redis
 ├── Hit → Return
 │
 └── Miss
       ↓
    Database
       ↓
     Redis
       ↓
    Response
```

The application controls cache population.

------------------------------------------------------------------------

# 34. Cache Invalidation

Common strategies:

``` text
TTL
Explicit invalidation
Write-through
Write-behind
Versioned keys
```

Cache invalidation should be intentional.

Remember:

> Cached data can become stale.

------------------------------------------------------------------------

# 35. TTL

Use TTL for data that naturally expires.

Example:

``` text
user:123:profile
TTL = 300 seconds
```

TTL helps prevent stale data from living forever.

Do not use TTL as a substitute for understanding consistency
requirements.

------------------------------------------------------------------------

# 36. Cache Stampede

A cache stampede can happen when a popular key expires:

``` text
Cache expires
 ↓
1,000 requests
 ↓
All hit database
```

Mitigations include:

``` text
Jittered TTL
Request coalescing
Distributed locks
Early refresh
Background refresh
```

------------------------------------------------------------------------

# 37. Hot Keys

A hot key is accessed extremely frequently.

Example:

``` text
homepage:featured
```

If one key receives enormous traffic, it can become a bottleneck.

Possible strategies:

``` text
Local cache
Replication
Key sharding
CDN
Precomputation
```

Choose based on workload.

------------------------------------------------------------------------

# 38. Redis Eviction

Redis may remove keys depending on its configuration and memory policy.

Understand:

``` text
Max memory
Eviction policy
TTL
Memory fragmentation
```

Do not assume cached data will always exist.

Applications must handle cache misses.

------------------------------------------------------------------------

# 39. Redis Memory Management

Monitor:

``` text
Used memory
Max memory
Evictions
Fragmentation
Key count
Large keys
```

Large values can unexpectedly consume memory.

Avoid storing unnecessarily large objects.

------------------------------------------------------------------------

# 40. Redis Serialization

Define how application objects are serialized.

Possible formats:

``` text
JSON
MessagePack
Custom encoding
```

Be mindful of:

``` text
Size
Compatibility
Schema evolution
Serialization cost
```

Do not blindly serialize entire application objects.

------------------------------------------------------------------------

# 41. Redis Atomic Operations

Redis supports atomic operations for many commands.

Useful for:

``` text
Counters
Rate limits
Locks
State transitions
```

Use atomic operations where race conditions matter.

------------------------------------------------------------------------

# 42. Redis Transactions

Redis provides transaction mechanisms, but understand their semantics.

Do not assume Redis transactions behave exactly like relational database
transactions.

For complex workflows, carefully consider:

``` text
Atomicity
Failure behavior
Concurrency
Lua/scripts
```

------------------------------------------------------------------------

# 43. Distributed Locks

Redis can be used for coordination/locking in appropriate designs.

Example:

``` text
Worker A
 ↓
Acquire lock
 ↓
Process
 ↓
Release
```

Important considerations:

``` text
Lock expiry
Crash recovery
Ownership
Renewal
Clock assumptions
```

Do not use distributed locks casually.

------------------------------------------------------------------------

# 44. Rate Limiting With Redis

Redis is useful for centralized rate limiting.

Conceptually:

``` text
Request
 ↓
Redis counter/token bucket
 ↓
Allowed?
 ├── Yes
 └── No → 429
```

This works well when multiple application instances need shared
rate-limit state.

------------------------------------------------------------------------

# 45. Redis Pub/Sub

Redis Pub/Sub provides lightweight real-time messaging.

``` text
Publisher
 ↓
Channel
 ↓
Subscribers
```

Pub/Sub is generally not a durable event log.

If a subscriber is disconnected, it may miss messages.

Use durable queues/streams when message loss is unacceptable.

------------------------------------------------------------------------

# 46. Redis Streams

Redis Streams provide a more durable stream-like primitive than Pub/Sub.

They support concepts such as:

``` text
Entries
Consumer groups
Acknowledgements
Pending entries
```

Use them when Redis-based stream processing fits the workload.

Do not automatically substitute Redis Streams for Kafka.

------------------------------------------------------------------------

# 47. Redis High Availability

For production Redis, understand:

``` text
Replication
Sentinel
Cluster
Managed Redis
Backups
Failover
```

Choose based on:

``` text
Availability
Scale
Durability
Operational complexity
```

------------------------------------------------------------------------

# 48. Redis Security

Protect Redis with:

``` text
Network isolation
Authentication
Encryption where supported
Access controls
Private networking
```

Never expose an unauthenticated production Redis instance to the public
Internet.

------------------------------------------------------------------------

# 49. Kafka Architecture

Kafka consists conceptually of:

``` text
Producers
 ↓
Topics
 ↓
Partitions
 ↓
Brokers
 ↓
Consumer Groups
 ↓
Consumers
```

Kafka is a distributed event streaming platform.

------------------------------------------------------------------------

# 50. Kafka Topics

A topic represents a logical stream of records.

Examples:

``` text
orders.created
payments.completed
user.updated
```

Use meaningful naming conventions.

------------------------------------------------------------------------

# 51. Kafka Partitions

A topic is divided into partitions:

``` text
orders.created
 ├── Partition 0
 ├── Partition 1
 ├── Partition 2
 └── Partition 3
```

Partitions provide:

``` text
Parallelism
Ordering within partition
Scalability
```

------------------------------------------------------------------------

# 52. Kafka Ordering

Kafka guarantees ordering within a partition.

It does not generally guarantee global ordering across all partitions.

If events for an entity must remain ordered, choose a stable partition
key.

Example:

``` text
key = userId
```

This can route the user's events to the same partition.

------------------------------------------------------------------------

# 53. Kafka Partition Keys

Choose keys based on the ordering and distribution requirements.

Examples:

``` text
userId
orderId
accountId
deviceId
```

Avoid keys that create severe skew.

Example:

``` text
key = "global"
```

may create a hot partition.

------------------------------------------------------------------------

# 54. Kafka Producers

A producer should define:

``` text
Topic
Key
Value
Schema
Acknowledgement policy
Retry behavior
```

Important producer concerns:

``` text
Idempotence
Batching
Compression
Partitioning
Retries
Timeouts
```

------------------------------------------------------------------------

# 55. Kafka Producer Idempotence

For important event streams, producer idempotence can reduce duplicate
records caused by retries.

Understand the producer configuration and guarantees of the selected
Kafka client/version.

Do not assume producer idempotence solves duplicate business effects
downstream.

------------------------------------------------------------------------

# 56. Kafka Consumers

Consumers read records from partitions.

Conceptually:

``` text
Partition
 ↓
Consumer
 ↓
Process
 ↓
Commit Offset
```

Offset management is central to Kafka processing.

------------------------------------------------------------------------

# 57. Consumer Groups

A consumer group allows multiple consumers to share partitions.

Example:

``` text
Topic
 ├── P0 → Consumer A
 ├── P1 → Consumer B
 ├── P2 → Consumer C
 └── P3 → Consumer D
```

Within a consumer group, a partition is generally processed by one
consumer at a time.

Different groups can independently consume the same topic.

------------------------------------------------------------------------

# 58. Consumer Scaling

Maximum useful parallelism is bounded by partition count.

Example:

``` text
4 partitions
```

means a single consumer group cannot meaningfully have more than four
active partition consumers at once.

Plan partition counts based on expected throughput and consumer
parallelism.

------------------------------------------------------------------------

# 59. Kafka Offsets

Offsets identify positions in a partition.

Example:

``` text
0
1
2
3
4
5
```

A consumer tracks where it has processed.

Offsets enable:

``` text
Resume
Replay
Recovery
Consumer progress
```

------------------------------------------------------------------------

# 60. Offset Commit Strategy

Commit offsets after the appropriate processing point.

A common approach:

``` text
Read
 ↓
Process
 ↓
Persist side effect
 ↓
Commit offset
```

If you commit too early:

``` text
Commit
 ↓
Crash
 ↓
Side effect never occurs
```

If you commit later:

``` text
Process
 ↓
Crash before commit
 ↓
Record processed again
```

Therefore consumers should be idempotent.

------------------------------------------------------------------------

# 61. Kafka Replay

Kafka's durable log allows consumers to replay historical events within
the retention window.

Useful for:

``` text
Bug recovery
New consumers
Backfills
Reprocessing
Analytics
```

Do not assume every event is available forever. Retention policies
determine availability.

------------------------------------------------------------------------

# 62. Kafka Retention

Kafka can retain events based on:

``` text
Time
Size
Topic policy
```

Example:

``` text
Retain for 7 days
```

Choose retention based on:

``` text
Replay requirements
Storage cost
Compliance
Business needs
```

------------------------------------------------------------------------

# 63. Kafka Replication

Partitions can be replicated across brokers.

Conceptually:

``` text
Partition 0
 ├── Broker A
 ├── Broker B
 └── Broker C
```

Replication improves fault tolerance.

Understand:

``` text
Replication factor
Leader
Followers
In-sync replicas
```

------------------------------------------------------------------------

# 64. Kafka Consumer Rebalancing

When consumers join or leave a consumer group:

``` text
Partitions
 ↓
Reassignment
 ↓
Consumers
```

This is a rebalance.

Frequent rebalancing can hurt throughput.

Investigate:

``` text
Slow consumers
Long processing
Frequent restarts
Configuration
```

------------------------------------------------------------------------

# 65. Kafka Consumer Lag

Consumer lag measures how far behind a consumer is.

Conceptually:

``` text
Latest offset
-
Consumer offset
=
Lag
```

Monitor:

``` text
Lag
Lag growth
Oldest record age
Processing rate
```

A growing lag indicates the consumer cannot keep up.

------------------------------------------------------------------------

# 66. Kafka Backpressure

If producers outpace consumers:

``` text
Producer rate > Consumer rate
 ↓
Lag increases
```

Solutions:

``` text
Scale consumers
Increase partitions if appropriate
Optimize processing
Batch work
Reduce producer rate
```

Do not blindly increase partitions without understanding key
distribution and operational impact.

------------------------------------------------------------------------

# 67. Kafka Schema Evolution

Messages are APIs.

Do not casually change:

``` json
{
  "userId": "123",
  "email": "a@example.com"
}
```

into an incompatible format.

Prefer schema evolution strategies that maintain compatibility.

Possible tools/patterns:

``` text
JSON Schema
Avro
Protobuf
Schema Registry
```

------------------------------------------------------------------------

# 68. Event Versioning

When event semantics change significantly:

``` text
order.created.v1
order.created.v2
```

may be appropriate.

Alternatively, evolve the schema compatibly.

Choose based on compatibility and operational needs.

------------------------------------------------------------------------

# 69. Kafka Dead Letter Patterns

Kafka does not magically solve poison messages.

Possible patterns:

``` text
Main Topic
 ↓
Consumer
 ↓ failure
Retry Topic
 ↓
Consumer
 ↓ failure
DLQ Topic
```

Include useful metadata:

``` text
Original topic
Partition
Offset
Error
Retry count
Timestamp
```

------------------------------------------------------------------------

# 70. Kafka Retry Topics

For delayed retries, use dedicated retry topics or another appropriate
scheduling mechanism.

Avoid immediately re-consuming a failing record in a tight loop.

A retry design should protect the consumer and downstream service.

------------------------------------------------------------------------

# 71. Kafka Delivery Semantics

Understand:

``` text
At-most-once
At-least-once
Exactly-once processing concepts
```

For most business systems:

``` text
At-least-once
+
Idempotent consumer
```

is a practical design.

------------------------------------------------------------------------

# 72. Transactional Outbox

A common problem:

``` text
Database transaction
+
Publish event
```

What if:

``` text
Database commit succeeds
Event publish fails
```

or:

``` text
Event publish succeeds
Database commit fails
```

The transactional outbox pattern helps:

``` text
Database Transaction
 ├── Business Data
 └── Outbox Event
          ↓
       Publisher
          ↓
         Kafka
```

This keeps the business change and event creation in the same database
transaction.

------------------------------------------------------------------------

# 73. Event-Driven Architecture

A common event-driven system:

``` text
Order Service
    ↓
OrderCreated
    ↓
Kafka
 ┌──┼───────────┐
 ↓  ↓           ↓
Billing   Notifications   Analytics
```

Benefits:

-   Loose coupling.
-   Independent consumers.
-   Replay.
-   Scalability.

Costs:

-   Eventual consistency.
-   Debugging complexity.
-   Schema management.
-   Duplicate handling.

------------------------------------------------------------------------

# 74. Event Naming

Use event names that describe facts.

Prefer:

``` text
OrderCreated
PaymentCompleted
UserRegistered
```

over commands disguised as events:

``` text
CreateOrder
SendEmail
DeleteUser
```

A useful distinction:

``` text
Command
→ Please do X.

Event
→ X happened.
```

------------------------------------------------------------------------

# 75. Event Payload Design

Events should contain enough information for consumers without becoming
huge.

Avoid:

``` text
Entire user object
+
Entire order object
+
Entire database record
```

Prefer focused payloads:

``` json
{
  "orderId": "ord_123",
  "userId": "usr_123",
  "total": 4999
}
```

------------------------------------------------------------------------

# 76. Event Contracts

Treat event schemas as contracts.

Document:

``` text
Event name
Version
Producer
Consumers
Fields
Required fields
Optional fields
Compatibility rules
```

Breaking an event contract can break multiple services.

------------------------------------------------------------------------

# 77. Duplicate Events

Duplicates are normal in distributed systems.

Example:

``` text
PaymentCompleted
 ↓
Consumer
 ↓
Crash
 ↓
PaymentCompleted again
```

Consumers should detect duplicates or make the operation naturally
idempotent.

------------------------------------------------------------------------

# 78. Ordering vs Throughput

More partitions can increase throughput but complicate global ordering.

You often need to choose:

``` text
Strict ordering
vs
Higher parallelism
```

Do not promise global ordering unless the architecture actually provides
it.

------------------------------------------------------------------------

# 79. Queue Fairness

A queue can become dominated by one workload.

Example:

``` text
Tenant A
 ↓↓↓↓↓↓↓↓↓
Queue
 ↓
Tenant B
```

Tenant B may starve.

For multi-tenant systems consider:

``` text
Per-tenant queues
Fair scheduling
Weighted queues
Rate limits
Separate worker pools
```

------------------------------------------------------------------------

# 80. Multi-Tenant Messaging

Every message should carry enough tenant context when required:

``` text
tenant_id
```

Consumers must enforce authorization and isolation.

Never allow:

``` text
Tenant A event
 ↓
Tenant B data
```

through incorrect lookup logic.

------------------------------------------------------------------------

# 81. Security

For Redis, queues, and Kafka:

``` text
Authentication
Authorization
Encryption
Network isolation
Secret management
Audit logging
```

Do not expose messaging infrastructure directly to the public Internet
unnecessarily.

------------------------------------------------------------------------

# 82. Observability

Monitor Redis:

``` text
Memory
Evictions
Latency
Connections
Commands
Hit rate
Replication
CPU
```

Monitor queues:

``` text
Depth
Oldest message age
Throughput
Failures
Retries
DLQ
Worker count
```

Monitor Kafka:

``` text
Producer errors
Consumer errors
Consumer lag
Partition health
Broker health
Under-replicated partitions
Throughput
Storage
Rebalances
```

------------------------------------------------------------------------

# 83. Distributed Tracing

Propagate:

``` text
trace_id
correlation_id
message_id
```

through messages where appropriate.

Example:

``` text
HTTP Request
 ↓
OrderCreated
 ↓
Kafka
 ↓
Billing Consumer
 ↓
Payment API
```

A trace/correlation ID can connect the entire workflow.

------------------------------------------------------------------------

# 84. Metrics

Useful messaging metrics:

``` text
Messages/sec
Processing latency
Queue depth
Consumer lag
Retry rate
Failure rate
DLQ size
Oldest message age
```

Averages alone can hide problems.

Use percentiles for latency where appropriate.

------------------------------------------------------------------------

# 85. Alerting

Good alerts are actionable.

Examples:

``` text
Kafka consumer lag continuously increasing
```

``` text
DLQ has messages older than threshold
```

``` text
Redis memory > safe threshold
```

``` text
Queue oldest message age exceeds SLA
```

Avoid alerting on every transient failure.

------------------------------------------------------------------------

# 86. Capacity Planning

Estimate:

``` text
Messages/sec
Average message size
Peak message rate
Consumer throughput
Retention
Storage
Memory
Network bandwidth
```

Example:

``` text
10,000 events/sec
×
1 KB
=
~10 MB/sec raw payload
```

Then account for:

``` text
Replication
Overhead
Compression
Retention
Peak traffic
```

------------------------------------------------------------------------

# 87. Queue Capacity Planning

For a queue:

``` text
Arrival rate = 1,000 jobs/min
Worker rate = 250 jobs/min
```

You need roughly:

``` text
4 equivalent workers
```

just to keep up under ideal conditions.

Leave headroom for:

``` text
Traffic spikes
Failures
Slow jobs
Deployments
```

------------------------------------------------------------------------

# 88. Kafka Capacity Planning

Consider:

``` text
Partitions
Messages/sec
Bytes/sec
Replication factor
Retention
Consumer throughput
Broker disk
Network
```

Partition count affects:

``` text
Parallelism
Storage distribution
Consumer scaling
Rebalancing
Operational complexity
```

Do not create excessive partitions without a reason.

------------------------------------------------------------------------

# 89. Redis Capacity Planning

Consider:

``` text
Working set size
Peak memory
Key count
Average value size
Commands/sec
Connections
Replication overhead
Eviction behavior
```

Memory usage should be monitored continuously.

------------------------------------------------------------------------

# 90. Failure Scenarios

Test:

``` text
Worker crashes
Redis restarts
Kafka broker fails
Consumer disconnects
Database unavailable
External API unavailable
Network partition
Message duplicated
Message delayed
Malformed message
Queue backlog
```

A distributed system is defined partly by how it behaves when components
fail.

------------------------------------------------------------------------

# 91. Recovery Testing

Know how to recover:

``` text
Redis failure
Queue backlog
DLQ messages
Kafka consumer offsets
Failed consumers
Corrupted/invalid messages
```

Document operational procedures.

------------------------------------------------------------------------

# 92. Common Anti-Patterns

Avoid:

### Using Redis as the Source of Truth

``` text
Redis
 ↓
Only copy of critical business data
```

without appropriate durability design.

### Infinite Retries

``` text
Retry forever
```

### Non-Idempotent Consumers

``` text
Duplicate event
 ↓
Duplicate payment
```

### Huge Messages

``` text
Kafka
 ↓
100 MB payload
```

### No DLQ

Failed messages disappear or block processing indefinitely.

### No Consumer Lag Monitoring

Consumers silently fall behind.

### One Global Kafka Partition

Destroys parallelism.

### Random Partition Keys

Causes ordering or distribution problems.

### No Schema Versioning

Consumers break after producer changes.

### Redis Publicly Exposed

Severe security risk.

### Queue as Database

A queue should not become permanent business storage.

------------------------------------------------------------------------

# 93. Redis Production Checklist

``` text
[ ] Purpose clearly defined
[ ] Cache vs source-of-truth decision made
[ ] TTL configured where appropriate
[ ] Eviction policy understood
[ ] Memory limits configured
[ ] Hit rate monitored
[ ] Hot keys monitored
[ ] Connection limits understood
[ ] Authentication enabled
[ ] Network access restricted
[ ] TLS/encryption considered
[ ] Persistence requirements defined
[ ] Backup/recovery strategy defined
[ ] High availability considered
```

------------------------------------------------------------------------

# 94. Queue Production Checklist

``` text
[ ] Message schema defined
[ ] Message IDs
[ ] ACK strategy
[ ] Idempotent consumer
[ ] Retry policy
[ ] Exponential backoff
[ ] Jitter
[ ] Maximum retries
[ ] DLQ
[ ] Poison message handling
[ ] Queue depth monitoring
[ ] Oldest message monitoring
[ ] Worker concurrency controlled
[ ] Job timeout
[ ] Graceful shutdown
[ ] Backpressure strategy
[ ] Replay/recovery procedure
```

------------------------------------------------------------------------

# 95. Kafka Production Checklist

``` text
[ ] Topic naming convention
[ ] Partition strategy
[ ] Partition key strategy
[ ] Replication factor
[ ] Retention policy
[ ] Producer configuration
[ ] Producer idempotence considered
[ ] Consumer groups designed
[ ] Offset strategy
[ ] Idempotent consumers
[ ] Schema versioning
[ ] Retry strategy
[ ] DLQ/retry topics
[ ] Consumer lag monitoring
[ ] Broker monitoring
[ ] Under-replication monitoring
[ ] Storage monitoring
[ ] Rebalance behavior understood
[ ] Replay procedure
```

------------------------------------------------------------------------

# 96. Final Decision Framework

When choosing between Redis, a queue, and Kafka, ask:

``` text
Do I need fast temporary shared state?
        ↓
      Redis

Do I need asynchronous work processing?
        ↓
      Queue

Do I need durable, replayable event streams?
        ↓
      Kafka
```

Then ask:

``` text
How important is durability?
How many consumers are required?
Do consumers need independent replay?
What throughput is required?
Does ordering matter?
What happens when processing fails?
Can messages be duplicated?
How long should data be retained?
How will we monitor it?
How will we recover it?
```

------------------------------------------------------------------------

# 97. Final Mental Model

For every asynchronous system, ask:

``` text
1. Is this a cache, a job, or an event?
2. Why does this need Redis/Queue/Kafka?
3. What happens if the producer fails?
4. What happens if the consumer crashes?
5. Can the message be delivered twice?
6. Is the consumer idempotent?
7. What happens after retries are exhausted?
8. Where does the failed message go?
9. How do we detect backlog?
10. How do we detect consumer lag?
11. Does ordering matter?
12. How is partitioning/key selection handled?
13. How is the message schema versioned?
14. How long is the message retained?
15. Can we replay it?
16. What happens during a broker/Redis failure?
17. How do we prevent overload?
18. How do we trace a message end-to-end?
19. What is the cost at peak load?
20. How do we recover the system?
```

The goal is not:

``` text
Use Kafka
+
Use Redis
+
Use queues
```

The goal is:

``` text
Choose the right primitive
+
Design for failure
+
Handle duplicates
+
Control backpressure
+
Preserve data integrity
+
Observe the system
+
Recover safely
```

That is the foundation of production-grade Redis, queue, worker, and
Kafka engineering.
