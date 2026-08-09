# Observability & Operations Engineering Standards

## Purpose

This document defines standards for understanding, monitoring,
debugging, and operating production software.

Deployment answers:

``` text
How do we get the system running?
```

Observability answers:

``` text
Is the system healthy?
Why is it unhealthy?
Who is affected?
What changed?
How do we recover?
```

The goal is to operate systems that are:

``` text
Observable
+
Diagnosable
+
Reliable
+
Recoverable
+
Measurable
+
Maintainable
```

------------------------------------------------------------------------

# 1. Core Principles

1.  Build observability into the system from the beginning.
2.  Logs explain events.
3.  Metrics show behavior over time.
4.  Traces explain distributed request paths.
5.  Alerts should be actionable.
6.  Monitor user impact, not just infrastructure.
7.  Every important service needs health checks.
8.  Every critical service needs an owner and runbook.
9.  Measure before diagnosing.
10. Prefer symptoms that lead to causes.
11. Monitor dependencies, not only your own application.
12. Design for failure and recovery.
13. Test operational procedures.
14. Record important incidents and learn from them.

------------------------------------------------------------------------

# 2. Observability vs Monitoring

Monitoring generally asks:

``` text
Is something wrong?
```

Observability asks:

``` text
Why is it wrong?
What changed?
Which requests are affected?
Which dependency is responsible?
```

A mature system uses both.

------------------------------------------------------------------------

# 3. Three Pillars

The classic observability model uses:

``` text
Logs
Metrics
Traces
```

They answer different questions.

### Logs

``` text
What happened?
```

### Metrics

``` text
How much / how often?
```

### Traces

``` text
Where did the request spend time?
```

Use them together.

------------------------------------------------------------------------

# 4. Structured Logging

Prefer structured logs such as JSON.

Example:

``` json
{
  "timestamp": "2026-08-09T12:00:00Z",
  "level": "ERROR",
  "service": "orders",
  "event": "payment_failed",
  "orderId": "ord_123",
  "traceId": "trace_abc",
  "errorCode": "PAYMENT_TIMEOUT"
}
```

Structured logs are easier to:

``` text
Search
Filter
Aggregate
Alert on
Correlate
```

------------------------------------------------------------------------

# 5. Log Levels

Use levels intentionally.

``` text
DEBUG
INFO
WARN
ERROR
```

### DEBUG

Detailed diagnostic information.

Usually not enabled at high volume in production.

### INFO

Normal important application events.

### WARN

Unexpected condition that did not necessarily cause failure.

### ERROR

A meaningful failure that requires attention or investigation.

Do not classify every normal event as an error.

------------------------------------------------------------------------

# 6. What to Log

Useful information includes:

``` text
Request ID
Trace ID
Service
Environment
Operation
Event
Duration
Status
Error code
Relevant resource ID
Tenant ID where appropriate
```

Do not log unnecessary data.

------------------------------------------------------------------------

# 7. What Not to Log

Never casually log:

``` text
Passwords
API keys
Access tokens
Refresh tokens
Private keys
Session secrets
Database credentials
```

Be careful with:

``` text
Cookies
Authorization headers
Payment information
Personal information
User-uploaded content
```

Use redaction where required.

------------------------------------------------------------------------

# 8. Request IDs

Every incoming request should have a correlation identifier where
practical.

Conceptually:

``` text
Request
 ↓
request_id
 ↓
Application
 ↓
Logs
```

This allows engineers to find all logs related to one request.

------------------------------------------------------------------------

# 9. Trace IDs

For distributed systems, use trace IDs.

Example:

``` text
HTTP Request
trace_id = abc
 ↓
Order Service
 ↓
Kafka
 ↓
Billing Worker
 ↓
Payment API
```

A trace ID connects related operations across services.

------------------------------------------------------------------------

# 10. Correlation IDs

Correlation IDs help associate related work even when there is no single
synchronous request.

For asynchronous workflows:

``` text
HTTP request
 ↓
Job
 ↓
Worker
 ↓
External API
```

propagate useful identifiers.

Use:

``` text
trace_id
correlation_id
message_id
```

where appropriate.

------------------------------------------------------------------------

# 11. Metrics

Metrics are numerical measurements over time.

Examples:

``` text
Requests/sec
Error rate
Latency
CPU
Memory
Queue depth
Kafka lag
Redis memory
Database connections
```

Metrics are useful for:

``` text
Dashboards
Alerts
Capacity planning
Trend analysis
SLOs
```

------------------------------------------------------------------------

# 12. Counter

A counter increases over time.

Examples:

``` text
http_requests_total
payments_completed_total
errors_total
```

Useful for rates:

``` text
errors / requests
```

------------------------------------------------------------------------

# 13. Gauge

A gauge represents a current value.

Examples:

``` text
CPU usage
Memory usage
Queue depth
Active connections
Kafka lag
```

It can increase and decrease.

------------------------------------------------------------------------

# 14. Histogram

Histograms measure distributions.

Useful for:

``` text
Request latency
Database query duration
Job processing time
Response size
```

Prefer latency percentiles over relying only on averages.

------------------------------------------------------------------------

# 15. Percentiles

Important latency measurements:

``` text
p50
p90
p95
p99
```

Example:

``` text
p50 = 100ms
p95 = 300ms
p99 = 900ms
```

An average of 120ms could hide the slow 1% of requests.

------------------------------------------------------------------------

# 16. RED Method

For request-driven services, monitor:

``` text
Rate
Errors
Duration
```

### Rate

How many requests?

### Errors

How many failed?

### Duration

How long do requests take?

This is a useful baseline for APIs.

------------------------------------------------------------------------

# 17. USE Method

For infrastructure/resources, monitor:

``` text
Utilization
Saturation
Errors
```

Examples:

``` text
CPU utilization
Memory saturation
Disk errors
Network saturation
```

------------------------------------------------------------------------

# 18. Golden Signals

Common service-level signals:

``` text
Latency
Traffic
Errors
Saturation
```

These provide a useful high-level view of system health.

------------------------------------------------------------------------

# 19. Business Metrics

Infrastructure metrics are not enough.

Track important business behavior such as:

``` text
Orders created
Payments completed
Signups
Successful checkouts
Interview bookings
AI requests completed
```

A system can be:

``` text
CPU = normal
Memory = normal
HTTP = 200
```

while:

``` text
Payments = 0
```

which is a serious production problem.

------------------------------------------------------------------------

# 20. Health Checks

Applications should expose appropriate health endpoints.

Common concepts:

``` text
/health
/ready
```

### Liveness

Is the process alive?

### Readiness

Can it safely receive traffic?

Do not confuse the two.

------------------------------------------------------------------------

# 21. Liveness Checks

A liveness check should usually be simple.

Example:

``` text
Process running?
→ YES
```

Avoid making liveness depend on every external dependency.

Otherwise:

``` text
Database outage
 ↓
Liveness fails
 ↓
Orchestrator restarts every instance
 ↓
Outage becomes worse
```

------------------------------------------------------------------------

# 22. Readiness Checks

Readiness asks:

``` text
Can this instance serve traffic?
```

It may check important dependencies.

Example:

``` text
Application started
+
Required configuration loaded
+
Database connectivity available
```

Use carefully.

------------------------------------------------------------------------

# 23. Dependency Health

Monitor dependencies:

``` text
Database
Redis
Kafka
External APIs
Object storage
Payment providers
Email providers
AI providers
```

A service can appear healthy while a critical dependency is failing.

------------------------------------------------------------------------

# 24. Distributed Tracing

A distributed trace can look like:

``` text
Request
├── API
│   ├── Auth
│   ├── Database
│   └── Redis
│
└── External API
```

Each operation can become a span.

Tracing helps identify:

``` text
Latency bottlenecks
Dependency failures
Unexpected calls
Retry behavior
```

------------------------------------------------------------------------

# 25. Spans

A span represents an operation.

Example:

``` text
Trace
 ├── HTTP request
 ├── PostgreSQL query
 ├── Redis GET
 └── External API call
```

Important span information:

``` text
Operation
Duration
Status
Attributes
Errors
Parent/child relationship
```

------------------------------------------------------------------------

# 26. OpenTelemetry

OpenTelemetry provides standardized instrumentation and telemetry
concepts.

It can collect:

``` text
Traces
Metrics
Logs
```

and export them to observability platforms.

Prefer standardized instrumentation where practical rather than building
proprietary tracing systems unnecessarily.

------------------------------------------------------------------------

# 27. Instrumentation

Instrument important boundaries:

``` text
HTTP requests
Database queries
Redis
Kafka
Queues
External APIs
Background jobs
AI model calls
```

Do not instrument every trivial function.

Focus on operations useful for diagnosis.

------------------------------------------------------------------------

# 28. Error Tracking

Use dedicated error tracking where appropriate.

Capture:

``` text
Exception
Stack trace
Service
Version
Environment
Trace ID
Relevant context
```

Group recurring errors so one bug does not generate thousands of
separate alerts.

------------------------------------------------------------------------

# 29. Error Fingerprinting

Errors should be grouped by meaningful identity.

Example:

``` text
PaymentTimeoutError
```

should not become a separate incident for every user if the underlying
cause is the same.

------------------------------------------------------------------------

# 30. Alerting

An alert should answer:

``` text
What is wrong?
How serious is it?
Who should act?
What should they investigate?
```

Avoid alerts that simply say:

``` text
Something happened.
```

------------------------------------------------------------------------

# 31. Alert on Symptoms

Prefer user-impacting symptoms:

``` text
Error rate > threshold
```

over noisy causes:

``` text
CPU > 70%
```

CPU may be high without causing a problem.

Use resource alerts when they represent real risk.

------------------------------------------------------------------------

# 32. Alert Severity

Define severity.

Example:

``` text
P1
→ Major user/business impact

P2
→ Significant degradation

P3
→ Limited impact

P4
→ Informational / low urgency
```

Adapt severity definitions to the organization.

------------------------------------------------------------------------

# 33. Alert Fatigue

Too many alerts cause engineers to ignore alerts.

Avoid:

``` text
Alert
 ↓
Alert
 ↓
Alert
 ↓
Alert
```

without actionable meaning.

Every alert should have:

``` text
Owner
Threshold
Reason
Runbook
Expected action
```

------------------------------------------------------------------------

# 34. SLI

Service Level Indicator.

An SLI measures reliability.

Examples:

``` text
Successful requests / total requests
```

or:

``` text
Requests completed under 500ms
/
Total requests
```

------------------------------------------------------------------------

# 35. SLO

Service Level Objective.

An SLO defines the target.

Example:

``` text
99.9% of API requests succeed
```

or:

``` text
99% of requests complete under 500ms
```

SLOs should be measurable.

------------------------------------------------------------------------

# 36. SLA

Service Level Agreement.

An SLA is a formal commitment, often to customers.

Conceptually:

``` text
SLI
 ↓
SLO
 ↓
SLA
```

Not every internal service needs an external SLA.

------------------------------------------------------------------------

# 37. Error Budget

If the SLO is:

``` text
99.9% availability
```

the allowed failure budget is:

``` text
0.1%
```

This is the error budget.

Use it to balance:

``` text
Reliability
+
Feature velocity
```

------------------------------------------------------------------------

# 38. Availability

Availability is often expressed as:

``` text
Successful service time
/
Expected service time
```

Be precise about what "available" means.

A server returning:

``` text
500
```

may be technically reachable but not available to the user.

------------------------------------------------------------------------

# 39. Latency SLO

Do not define latency only as:

``` text
Average < 200ms
```

Prefer percentile-based objectives.

Example:

``` text
99% of requests < 500ms
```

This captures tail latency.

------------------------------------------------------------------------

# 40. Dashboards

A useful dashboard should answer:

``` text
Is the service healthy?
Is traffic normal?
Are errors increasing?
Is latency increasing?
Are dependencies healthy?
Are resources saturated?
```

Avoid dashboards containing hundreds of unrelated charts.

------------------------------------------------------------------------

# 41. Service Dashboard

A service dashboard can contain:

``` text
Request rate
Error rate
p50 latency
p95 latency
p99 latency
CPU
Memory
Database latency
Dependency failures
Active connections
```

------------------------------------------------------------------------

# 42. Dependency Dashboard

Monitor important dependencies:

``` text
PostgreSQL
Redis
Kafka
External APIs
Object Storage
```

Include:

``` text
Latency
Errors
Connections
Throughput
Saturation
```

------------------------------------------------------------------------

# 43. Deployment Markers

Dashboards should make deployments visible.

Example:

``` text
Error rate
     ↑
     │       deployment
─────┼────────│────────────
     │        ↑
     │        spike
```

This helps correlate:

``` text
Deployment
 ↓
Behavior change
```

------------------------------------------------------------------------

# 44. Version Tracking

Telemetry should identify the running version.

Useful fields:

``` text
service
version
commit_sha
environment
region
instance
```

This makes it possible to answer:

``` text
Which version caused this?
```

------------------------------------------------------------------------

# 45. Environment Separation

Clearly distinguish:

``` text
development
staging
production
```

Do not mix production and staging telemetry without clear labels.

------------------------------------------------------------------------

# 46. Log Retention

Define retention based on:

``` text
Debugging needs
Compliance
Cost
Security
Business requirements
```

Do not retain everything forever.

------------------------------------------------------------------------

# 47. High-Cardinality Data

Be careful with metric labels such as:

``` text
user_id
request_id
email
```

High-cardinality dimensions can create enormous metric costs.

Use high-cardinality identifiers primarily in:

``` text
Logs
Traces
```

rather than blindly putting them into metrics.

------------------------------------------------------------------------

# 48. Sampling

Tracing every request may be expensive.

Sampling can reduce telemetry volume.

Possible approaches:

``` text
Head sampling
Tail sampling
Error-biased sampling
Probability sampling
```

Do not sample away the information needed to debug critical failures.

------------------------------------------------------------------------

# 49. Sensitive Telemetry

Telemetry is data.

Protect:

``` text
Logs
Metrics
Traces
Error reports
```

Apply:

``` text
Access control
Redaction
Encryption
Retention policies
```

Do not assume observability data is harmless.

------------------------------------------------------------------------

# 50. Production Debugging Flow

When something breaks:

``` text
1. What is the user impact?
        ↓
2. When did it start?
        ↓
3. Did anything change?
        ↓
4. Are errors increasing?
        ↓
5. Is latency increasing?
        ↓
6. Which endpoint/workflow is affected?
        ↓
7. Which version is running?
        ↓
8. Which dependency is failing?
        ↓
9. Are resources saturated?
        ↓
10. Can we mitigate or rollback?
```

Start with impact, then narrow toward the cause.

------------------------------------------------------------------------

# 51. Incident Response

A basic incident flow:

``` text
Detect
 ↓
Assess
 ↓
Communicate
 ↓
Mitigate
 ↓
Recover
 ↓
Verify
 ↓
Document
 ↓
Learn
```

Do not spend excessive time finding the perfect root cause while users
are actively impacted.

Restore service first when appropriate.

------------------------------------------------------------------------

# 52. Mitigation vs Root Cause

During an incident:

``` text
Immediate goal:
Restore service
```

Later:

``` text
Root cause
 ↓
Permanent fix
```

Example:

``` text
Bad deployment
 ↓
Rollback
 ↓
Service restored
 ↓
Investigate bug
 ↓
Fix
```

Rollback is not the same as fixing the underlying cause.

------------------------------------------------------------------------

# 53. Incident Communication

Incident communication should state:

``` text
What is affected?
When did it start?
Current impact
Current mitigation
Next update
```

Avoid speculation presented as fact.

------------------------------------------------------------------------

# 54. Incident Roles

For larger incidents, responsibilities may include:

``` text
Incident Commander
Technical Lead
Communications Lead
Operations / SRE
Subject Matter Expert
```

Small teams may combine roles.

The key is clear ownership.

------------------------------------------------------------------------

# 55. Runbooks

A runbook provides operational instructions.

Example:

``` text
Kafka consumer lag is increasing

1. Check consumer health
2. Check processing latency
3. Check dependency latency
4. Check partition distribution
5. Check recent deployments
6. Scale consumers if appropriate
7. Check for poison messages
8. Verify lag recovery
```

Runbooks should be practical, not essays.

------------------------------------------------------------------------

# 56. Operational Documentation

Important services should document:

``` text
Architecture
Dependencies
Deployment
Rollback
Health checks
Dashboards
Alerts
Known failure modes
Recovery procedures
Owners
```

------------------------------------------------------------------------

# 57. On-Call

On-call systems should provide:

``` text
Clear alerts
Severity
Ownership
Runbooks
Escalation path
Access to required systems
```

Do not make on-call engineers discover basic service information during
an outage.

------------------------------------------------------------------------

# 58. Postmortems

After significant incidents, document:

``` text
Summary
Impact
Timeline
Detection
Root cause
Contributing factors
Mitigation
Resolution
What went well
What went poorly
Action items
```

The goal is learning, not blame.

------------------------------------------------------------------------

# 59. Blameless Postmortems

Focus on:

``` text
Systems
Processes
Architecture
Guardrails
Detection
Communication
```

rather than blaming individuals.

Human error often reveals missing system safeguards.

------------------------------------------------------------------------

# 60. Capacity Monitoring

Monitor resource trends:

``` text
CPU
Memory
Disk
Network
Database
Redis
Kafka
Queue
```

Look at growth over time.

A system that is healthy today may be approaching a capacity limit.

------------------------------------------------------------------------

# 61. Saturation

Saturation indicates how close a resource is to its useful limit.

Examples:

``` text
CPU saturation
Connection pool exhaustion
Disk capacity
Kafka broker storage
Queue backlog
Database connection limits
```

Saturation is often more useful than raw utilization.

------------------------------------------------------------------------

# 62. Autoscaling

Autoscaling can respond to:

``` text
CPU
Memory
Request rate
Queue depth
Kafka lag
Custom metrics
```

Choose scaling signals that reflect actual workload pressure.

CPU alone may not represent queue-based workloads.

------------------------------------------------------------------------

# 63. Scaling and Observability

Every scaling system should be observable.

Monitor:

``` text
Current instances
Desired instances
Scaling events
Scale-up latency
Scale-down behavior
Workload per instance
```

Unexpected scaling can indicate:

``` text
Traffic spike
Memory leak
Retry storm
Poor efficiency
```

------------------------------------------------------------------------

# 64. Cost Observability

Production systems should monitor important infrastructure costs.

Examples:

``` text
Compute
Database
Storage
Network
Logs
Tracing
AI usage
Kafka
Redis
```

Unexpected telemetry volume can itself become expensive.

------------------------------------------------------------------------

# 65. AI Observability

AI applications should additionally monitor:

``` text
Model
Model version
Prompt version
Token usage
Latency
Cost
Failure rate
Tool calls
Retrieval quality
Safety events
Fallback rate
```

Do not log sensitive prompts or model outputs without appropriate
privacy controls.

------------------------------------------------------------------------

# 66. Background Job Observability

Monitor:

``` text
Queue depth
Processing rate
Job duration
Failures
Retries
DLQ
Oldest job age
Worker count
```

A background system can be broken even if the API itself returns 200.

------------------------------------------------------------------------

# 67. Database Observability

Monitor:

``` text
Query latency
Connection count
Connection pool utilization
Slow queries
Locks
Deadlocks
CPU
Memory
Storage
Replication lag
```

Do not only monitor whether the database process is alive.

------------------------------------------------------------------------

# 68. Redis Observability

Monitor:

``` text
Memory
Evictions
Hit rate
Command latency
Connections
CPU
Replication
Hot keys
```

------------------------------------------------------------------------

# 69. Kafka Observability

Monitor:

``` text
Consumer lag
Producer errors
Consumer errors
Broker health
Under-replicated partitions
Partition throughput
Storage
Rebalances
```

A Kafka cluster can be technically "up" while consumers are severely
behind.

------------------------------------------------------------------------

# 70. HTTP Observability

Track:

``` text
Request rate
Status codes
Latency
Request size
Response size
Timeouts
Retries
5xx
4xx
```

Break down metrics by meaningful dimensions such as:

``` text
Route
Method
Status class
Service
```

Avoid uncontrolled high-cardinality route labels.

------------------------------------------------------------------------

# 71. SLO-Based Alerting

Prefer alerts tied to reliability objectives.

Example:

``` text
Error budget burning too quickly
```

can be more useful than:

``` text
CPU > 80%
```

when the real objective is API availability.

------------------------------------------------------------------------

# 72. Alert Testing

An alert that has never been tested may not work during an incident.

Periodically verify:

``` text
Condition triggers
 ↓
Alert fires
 ↓
Correct owner receives it
 ↓
Runbook works
 ↓
Recovery is possible
```

------------------------------------------------------------------------

# 73. Failure Injection

Where appropriate, test:

``` text
Database unavailable
Redis unavailable
Kafka unavailable
External API timeout
Network latency
Container crash
Instance termination
Disk pressure
```

This validates both resilience and observability.

------------------------------------------------------------------------

# 74. Chaos Engineering

Chaos engineering deliberately introduces failures to test system
behavior.

Use it when:

``` text
System is mature enough
+
Failure modes are understood
+
Recovery procedures exist
```

Start small and controlled.

Do not introduce production chaos without appropriate safeguards.

------------------------------------------------------------------------

# 75. Operational Readiness Review

Before production launch, verify:

``` text
[ ] Logs
[ ] Metrics
[ ] Traces
[ ] Health checks
[ ] Dashboards
[ ] Alerts
[ ] SLOs
[ ] Runbooks
[ ] Ownership
[ ] Deployment
[ ] Rollback
[ ] Backup/recovery
[ ] Capacity
[ ] Security
[ ] Incident procedure
```

------------------------------------------------------------------------

# 76. Production Health Checklist

``` text
[ ] Error rate normal
[ ] Latency normal
[ ] Traffic normal
[ ] CPU normal
[ ] Memory normal
[ ] Disk healthy
[ ] Database healthy
[ ] Redis healthy
[ ] Kafka healthy
[ ] Queues healthy
[ ] External APIs healthy
[ ] No active incidents
[ ] Recent deployment verified
```

------------------------------------------------------------------------

# 77. Common Anti-Patterns

Avoid:

### Logs Without Structure

``` text
random strings
```

### Logs With Secrets

``` text
Authorization: Bearer ...
```

### Metrics With Huge Cardinality

``` text
user_id as metric label
```

### Alerts Without Owners

Nobody knows who responds.

### Alerts Without Runbooks

Engineer receives an alert and has no idea what to do.

### Monitoring Only Infrastructure

``` text
CPU = healthy
```

while:

``` text
Payments = broken
```

### No Trace Correlation

Distributed failures become extremely difficult to debug.

### No Deployment Markers

You cannot correlate failures with releases.

### Infinite Log Retention

Creates unnecessary cost and risk.

### No Postmortems

The same incident repeats.

### No Recovery Testing

Backups and runbooks may fail when actually needed.

------------------------------------------------------------------------

# 78. Observability Maturity

A useful maturity progression:

``` text
Level 1
Logs exist

        ↓

Level 2
Structured logs + metrics

        ↓

Level 3
Dashboards + alerts

        ↓

Level 4
Distributed tracing + SLOs

        ↓

Level 5
Automated detection + recovery

        ↓

Level 6
Continuous reliability engineering
```

Do not attempt Level 6 before Level 1 works properly.

------------------------------------------------------------------------

# 79. Golden Rules

1.  Logs explain events.
2.  Metrics show trends.
3.  Traces explain distributed requests.
4.  Use all three together.
5.  Never log secrets.
6.  Use structured logging.
7.  Propagate request and trace identifiers.
8.  Monitor user-facing behavior.
9.  Monitor dependencies.
10. Use percentiles for latency.
11. Define meaningful SLOs.
12. Alert on actionable symptoms.
13. Avoid alert fatigue.
14. Give every alert an owner.
15. Give important alerts a runbook.
16. Make deployments visible in telemetry.
17. Track running versions.
18. Monitor business metrics.
19. Monitor resource saturation.
20. Test health checks.
21. Test alerts.
22. Test recovery procedures.
23. Document incidents.
24. Conduct blameless postmortems.
25. Fix systemic causes.
26. Plan capacity before exhaustion.
27. Treat observability data as sensitive.
28. Control telemetry costs.
29. Instrument important boundaries.
30. Make production diagnosable by someone other than the original
    developer.

------------------------------------------------------------------------

# 80. Final Mental Model

For every production system, ask:

``` text
Can we see what is happening?
        ↓
Can we measure whether it is healthy?
        ↓
Can we identify who is affected?
        ↓
Can we trace a failing request?
        ↓
Can we identify the dependency causing the problem?
        ↓
Can we detect the problem automatically?
        ↓
Does someone know what to do?
        ↓
Can we mitigate quickly?
        ↓
Can we recover safely?
        ↓
Can we learn from the incident?
```

A production system is not complete when it can be deployed.

It is complete when engineers can:

``` text
Detect
+
Understand
+
Mitigate
+
Recover
+
Learn
```

That is the foundation of production-grade observability and operations.
