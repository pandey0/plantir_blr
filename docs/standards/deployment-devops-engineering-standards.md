# Deployment & DevOps Engineering Standards

## Purpose

This document defines general standards for building, deploying,
operating, monitoring, and maintaining production software.

Deployment is not simply:

``` text
git push
    ↓
production
```

A production deployment should be a controlled process:

``` text
Code
 ↓
Version Control
 ↓
CI
 ↓
Validation
 ↓
Build
 ↓
Artifact
 ↓
Deploy
 ↓
Health Checks
 ↓
Smoke Tests
 ↓
Monitoring
 ↓
Rollback / Continue
```

The goal is:

``` text
Repeatable
+
Automated
+
Secure
+
Observable
+
Recoverable
+
Low-risk deployments
```

------------------------------------------------------------------------

# 1. Core Deployment Principles

1.  Deployments should be reproducible.
2.  Production should not depend on a developer's laptop.
3.  Build once and promote the same artifact where practical.
4.  Automate repetitive deployment steps.
5.  Never deploy untested code intentionally.
6.  Keep deployments reversible.
7.  Monitor immediately after deployment.
8.  Separate environments clearly.
9.  Keep secrets out of source code.
10. Prefer small, frequent, low-risk deployments.

------------------------------------------------------------------------

# 2. Environment Strategy

Use clear environments.

A common structure:

``` text
Local
  ↓
Development / CI
  ↓
Staging
  ↓
Production
```

Each environment should have:

-   Separate configuration.
-   Appropriate credentials.
-   Appropriate databases.
-   Appropriate external service configuration.
-   Clear ownership.

Never casually use production resources from local development.

------------------------------------------------------------------------

# 3. Local Development

Local development should be easy to reproduce.

Provide:

-   README setup instructions.
-   Required runtime versions.
-   Environment variable documentation.
-   Database setup.
-   Seed data.
-   Local services.
-   Docker Compose where useful.

Example:

``` text
git clone
 ↓
install dependencies
 ↓
configure .env
 ↓
start database
 ↓
run migrations
 ↓
seed
 ↓
start application
```

A new developer should be able to get the application running without
tribal knowledge.

------------------------------------------------------------------------

# 4. Environment Variables

Separate configuration from code.

Examples:

``` text
DATABASE_URL
REDIS_URL
API_URL
NEXT_PUBLIC_API_URL
STRIPE_SECRET_KEY
JWT_SECRET
```

Rules:

-   Never commit secrets.
-   Document required variables.
-   Validate configuration at startup.
-   Keep environment-specific values separate.
-   Never expose server secrets to client-side code.

------------------------------------------------------------------------

# 5. Secrets Management

Sensitive values include:

``` text
Passwords
API keys
OAuth secrets
Database credentials
Signing keys
Encryption keys
Cloud credentials
```

Use:

``` text
Secret Manager
Environment Secrets
CI/CD Secret Store
```

instead of:

``` text
.env committed to Git
```

Rotate secrets when necessary.

------------------------------------------------------------------------

# 6. Git Standards

Use Git as the source of truth.

Prefer:

``` text
main
feature/*
fix/*
release/*
```

depending on team workflow.

Protect production branches.

Require appropriate:

-   Pull requests.
-   Code review.
-   CI checks.
-   Status checks.

Do not deploy random uncommitted local code to production.

------------------------------------------------------------------------

# 7. Versioning

Every production deployment should be identifiable.

Use:

``` text
Git commit SHA
Release version
Build ID
Container image tag
```

Example:

``` text
app:v1.8.3
```

or:

``` text
app:git-a83f19c
```

Avoid relying only on:

``` text
latest
```

because it makes rollback and debugging harder.

------------------------------------------------------------------------

# 8. Build Reproducibility

The same source should produce the same intended artifact.

Pin:

-   Runtime versions.
-   Dependency versions.
-   Lockfiles.
-   Build tools.
-   Base images.

Avoid:

``` text
npm install
```

when deterministic installation is required.

Prefer the package manager's lockfile-aware installation mode.

------------------------------------------------------------------------

# 9. Dependency Management

Keep dependencies controlled.

Rules:

-   Commit lockfiles.
-   Review dependency updates.
-   Remove unused packages.
-   Scan for vulnerabilities.
-   Avoid unnecessary dependencies.
-   Pin or constrain important versions.
-   Test major upgrades.

A deployment should not unexpectedly pull a different dependency
version.

------------------------------------------------------------------------

# 10. CI Pipeline

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
Security Checks
 ↓
Build
 ↓
Artifact
```

CI should fail fast on obvious problems.

------------------------------------------------------------------------

# 11. CD Pipeline

A production delivery pipeline can be:

``` text
Merge
 ↓
Build
 ↓
Create Artifact
 ↓
Deploy Staging
 ↓
Smoke Tests
 ↓
Approval / Automated Gate
 ↓
Production
 ↓
Health Check
 ↓
Monitoring
```

Automate as much as practical.

------------------------------------------------------------------------

# 12. Build Once, Deploy Many

Prefer:

``` text
Source
 ↓
Build
 ↓
Artifact
 ├── Staging
 └── Production
```

rather than:

``` text
Build for staging
Build again for production
```

The artifact tested in staging should be the artifact deployed to
production whenever practical.

This reduces environment-specific build differences.

------------------------------------------------------------------------

# 13. Artifacts

An artifact is the immutable output of a build.

Examples:

``` text
Docker image
Compiled application
Static asset bundle
Package
Serverless deployment artifact
```

Store artifacts in an appropriate registry/storage system.

Track:

``` text
Artifact
+
Commit
+
Build
+
Environment
```

------------------------------------------------------------------------

# 14. Docker Standards

When using Docker:

-   Use small appropriate base images.
-   Pin important base image versions.
-   Use multi-stage builds.
-   Run as a non-root user where practical.
-   Do not store secrets inside images.
-   Add health checks where appropriate.
-   Minimize unnecessary packages.
-   Use `.dockerignore`.

Typical:

``` text
Source
 ↓
Builder Image
 ↓
Compiled Artifact
 ↓
Runtime Image
```

------------------------------------------------------------------------

# 15. Dockerfile Principles

Prefer:

``` text
Install dependencies
 ↓
Build
 ↓
Copy only required artifacts
 ↓
Run minimal runtime
```

Avoid:

``` text
Huge image
+
Development dependencies
+
Build tools
+
Secrets
```

Keep runtime images focused.

------------------------------------------------------------------------

# 16. Container Security

Containers should:

-   Run with minimal privileges.
-   Avoid root where practical.
-   Have limited filesystem permissions.
-   Avoid unnecessary Linux capabilities.
-   Use trusted base images.
-   Be scanned for vulnerabilities.
-   Keep secrets outside images.

A container is not automatically secure because it is a container.

------------------------------------------------------------------------

# 17. Health Checks

Applications should expose appropriate health information.

Common concepts:

``` text
Liveness
Readiness
Startup
```

### Liveness

Is the process alive?

### Readiness

Can it receive traffic?

### Startup

Has it finished initialization?

Do not make health checks unnecessarily dependent on every external
service.

------------------------------------------------------------------------

# 18. Graceful Shutdown

Applications should handle shutdown signals.

Typical flow:

``` text
SIGTERM
 ↓
Stop accepting new requests
 ↓
Finish in-flight work
 ↓
Close connections
 ↓
Stop workers
 ↓
Exit
```

This prevents dropped requests during deployments.

------------------------------------------------------------------------

# 19. Zero-Downtime Deployment

Plan for old and new versions to coexist.

Example:

``` text
Old Version ──┐
              ├── Load Balancer
New Version ──┘
```

This requires:

-   Backward-compatible APIs.
-   Safe database migrations.
-   Compatible events.
-   Session compatibility.

------------------------------------------------------------------------

# 20. Rolling Deployment

Gradually replace instances:

``` text
Version A
Version A
Version A
Version A

       ↓

Version A
Version A
Version B
Version B

       ↓

Version B
Version B
Version B
Version B
```

Monitor during rollout.

------------------------------------------------------------------------

# 21. Blue-Green Deployment

Maintain two environments:

``` text
Blue → Current
Green → New
```

Deploy to Green:

``` text
Green
 ↓
Test
 ↓
Switch traffic
 ↓
Green becomes production
```

Blue remains available for rollback.

Useful when fast rollback is important.

------------------------------------------------------------------------

# 22. Canary Deployment

Send a small percentage of traffic to the new version.

Example:

``` text
New Version
 ↓
5%
 ↓
Monitor
 ↓
25%
 ↓
50%
 ↓
100%
```

Monitor:

-   Error rate.
-   Latency.
-   CPU.
-   Business metrics.
-   Logs.

Rollback if metrics degrade.

------------------------------------------------------------------------

# 23. Feature Flags

Feature flags separate deployment from feature release.

``` text
Code deployed
 ↓
Feature OFF
 ↓
Internal testing
 ↓
10%
 ↓
50%
 ↓
100%
```

Benefits:

-   Safer releases.
-   Gradual rollout.
-   Fast feature disablement.

Remove obsolete flags.

------------------------------------------------------------------------

# 24. Database Migrations

Database changes require special care.

Avoid:

``` text
Deploy new code
+
Immediately delete old column
```

Prefer expand-and-contract:

``` text
1. Add new column
2. Deploy compatible code
3. Backfill data
4. Switch reads
5. Stop old writes
6. Remove old column later
```

This supports rolling deployments.

------------------------------------------------------------------------

# 25. Migration Rules

Before running a production migration:

``` text
[ ] Tested locally
[ ] Tested in CI
[ ] Tested against realistic data
[ ] Estimated runtime
[ ] Checked locking behavior
[ ] Checked storage impact
[ ] Rollback/recovery plan understood
[ ] Monitoring ready
```

Be especially careful with:

-   Large table rewrites.
-   Index creation.
-   Destructive changes.
-   Long transactions.
-   Data transformations.

------------------------------------------------------------------------

# 26. Backward Compatibility

During deployment, multiple application versions may exist.

For example:

``` text
Version 1
Version 2
```

running simultaneously.

Therefore:

``` text
API changes
Database changes
Events
Cache formats
Sessions
```

should remain compatible during the transition.

------------------------------------------------------------------------

# 27. Rollback

Every risky deployment should have a rollback strategy.

Possible rollback:

``` text
Production
 ↓
Previous artifact
 ↓
Health check
 ↓
Monitor
```

But remember:

> Application rollback does not automatically mean database rollback.

Database migrations should be designed carefully so application rollback
remains possible where required.

------------------------------------------------------------------------

# 28. Roll Forward vs Rollback

Sometimes rolling forward is safer than rolling back.

Example:

``` text
Version B
 ↓
Migration already applied
 ↓
Rollback code
 ↓
Old code cannot understand new schema
```

In such cases:

``` text
Deploy Version C
that fixes Version B
```

may be safer.

Always consider schema compatibility before rollback.

------------------------------------------------------------------------

# 29. Deployment Health Gates

A deployment should have explicit success criteria.

Example:

``` text
Deployment
 ↓
Health Check
 ↓
Smoke Tests
 ↓
Error Rate
 ↓
Latency
 ↓
Business Metrics
 ↓
Continue / Rollback
```

Do not declare success simply because the process started.

------------------------------------------------------------------------

# 30. Smoke Tests

Immediately after deployment test critical functionality.

Examples:

``` text
Homepage
Login
Critical API
Database
Core workflow
Payment sandbox
```

Keep smoke tests fast.

------------------------------------------------------------------------

# 31. Post-Deployment Monitoring

Watch:

``` text
Error rate
p50/p95/p99 latency
CPU
Memory
Database
Connections
Queue depth
External APIs
Business metrics
```

Compare:

``` text
Before deployment
vs
After deployment
```

------------------------------------------------------------------------

# 32. Logging

Production logs should include enough context to debug issues.

Useful fields:

``` text
timestamp
level
service
environment
request_id
user_id where appropriate
route
status
latency
error_code
```

Never log:

``` text
passwords
API keys
tokens
secrets
sensitive data unnecessarily
```

------------------------------------------------------------------------

# 33. Distributed Tracing

For multi-service systems:

``` text
Request
 ↓
API
 ↓
Service A
 ↓
Service B
 ↓
Database
 ↓
Queue
```

Use correlation/trace IDs to follow the request.

This makes distributed debugging significantly easier.

------------------------------------------------------------------------

# 34. Monitoring

Monitor infrastructure and application behavior.

Infrastructure:

``` text
CPU
Memory
Disk
Network
Connections
```

Application:

``` text
Requests/sec
Errors
Latency
Queue depth
Job failures
```

Database:

``` text
Query latency
Connections
Locks
Storage
Replication lag
```

------------------------------------------------------------------------

# 35. Alerting

Alerts should represent actionable problems.

Good:

``` text
p95 latency > threshold for 10 minutes
```

Bad:

``` text
CPU reached 70%
```

if nobody needs to take action.

Avoid alert fatigue.

------------------------------------------------------------------------

# 36. SLI / SLO / SLA

### SLI

What you measure.

Example:

``` text
Successful requests / total requests
```

### SLO

Target:

``` text
99.9% success
```

### SLA

Business/customer commitment.

Deployment decisions should consider SLOs.

------------------------------------------------------------------------

# 37. Incident Response

Have a process for:

``` text
Detect
 ↓
Triage
 ↓
Mitigate
 ↓
Recover
 ↓
Communicate
 ↓
Review
```

During incidents:

-   Stabilize first.
-   Investigate second.
-   Avoid risky changes without understanding impact.
-   Record important actions.
-   Preserve useful logs.

------------------------------------------------------------------------

# 38. Rollback During Incident

If a deployment clearly caused an outage:

``` text
Identify deployment
 ↓
Assess rollback safety
 ↓
Rollback / Roll forward
 ↓
Health checks
 ↓
Monitor
```

Do not spend 30 minutes debugging a known bad release while users are
down if safe rollback is available.

------------------------------------------------------------------------

# 39. Infrastructure as Code

Infrastructure should be reproducible.

Use tools such as:

``` text
Terraform
Pulumi
CloudFormation
OpenTofu
```

where appropriate.

Avoid creating critical production infrastructure only through manual
console clicks.

------------------------------------------------------------------------

# 40. Infrastructure State

Infrastructure state should be:

-   Version controlled where appropriate.
-   Backed up.
-   Access controlled.
-   Protected from accidental deletion.

Use remote state with appropriate locking for tools that require it.

------------------------------------------------------------------------

# 41. Cloud IAM

Follow least privilege.

Avoid:

``` text
Application
 ↓
AdministratorAccess
```

Prefer:

``` text
Application
 ↓
Specific required permissions
```

Separate:

``` text
Developer
CI/CD
Application
Operations
```

permissions.

------------------------------------------------------------------------

# 42. Network Security

Understand:

``` text
Internet
 ↓
Load Balancer
 ↓
Application
 ↓
Private Database
```

Prefer databases and internal services not to be publicly accessible.

Use:

-   Private networks.
-   Security groups/firewall rules.
-   Network segmentation.
-   Restricted inbound access.

------------------------------------------------------------------------

# 43. TLS / HTTPS

Production web applications should use HTTPS.

Understand:

-   Certificates.
-   Certificate renewal.
-   TLS termination.
-   HTTP redirects.
-   HSTS.

Do not send sensitive credentials over plaintext HTTP.

------------------------------------------------------------------------

# 44. DNS

Understand:

``` text
Domain
 ↓
DNS
 ↓
Load Balancer / CDN
 ↓
Application
```

Know common records:

``` text
A
AAAA
CNAME
TXT
MX
NS
```

DNS changes can be cached, so plan changes accordingly.

------------------------------------------------------------------------

# 45. CDN

Use a CDN where appropriate for:

``` text
Static assets
Images
Videos
Public downloads
```

Benefits:

-   Lower latency.
-   Lower origin traffic.
-   Better global performance.

Understand cache invalidation.

------------------------------------------------------------------------

# 46. Reverse Proxy

A reverse proxy such as Nginx can handle:

``` text
Client
 ↓
Nginx
 ↓
Application
```

Responsibilities may include:

-   TLS.
-   Routing.
-   Compression.
-   Static files.
-   Request limits.
-   Proxying.

Do not put application business logic into the reverse proxy.

------------------------------------------------------------------------

# 47. Static Assets

Optimize:

-   JavaScript bundles.
-   CSS.
-   Images.
-   Fonts.

Use:

-   Compression.
-   Caching.
-   Content hashing.
-   CDN.

Example:

``` text
app.8f31a.js
```

Content hashing allows aggressive caching.

------------------------------------------------------------------------

# 48. Frontend Deployment

For frontend applications, understand whether the application is:

``` text
Static
SSR
ISR
Server-rendered
Client-heavy
```

For Next.js specifically, understand:

``` text
Build
 ↓
Server / Edge / Static output
 ↓
Runtime
```

Do not assume `next build` means the entire application is static.

------------------------------------------------------------------------

# 49. Backend Deployment

A backend deployment should define:

``` text
Runtime
Port
Environment
Database
Cache
Secrets
Health check
Scaling
Logging
```

Example:

``` text
Container
 ↓
Application
 ↓
Port 3000
 ↓
Load Balancer
```

------------------------------------------------------------------------

# 50. Serverless Deployment

Serverless can simplify operations.

Understand:

-   Cold starts.
-   Execution limits.
-   Concurrency.
-   Statelessness.
-   Connection management.
-   Function packaging.
-   Cost model.

Do not assume serverless is always cheaper.

------------------------------------------------------------------------

# 51. Kubernetes

Learn Kubernetes after understanding Docker and deployment fundamentals.

Core concepts:

``` text
Cluster
Node
Pod
Deployment
Service
Ingress
ConfigMap
Secret
```

Understand:

``` text
Deployment
 ↓
Pods
 ↓
Service
 ↓
Ingress
```

Do not use Kubernetes just because it is popular.

------------------------------------------------------------------------

# 52. Container Orchestration

Orchestration solves problems such as:

-   Scheduling.
-   Scaling.
-   Service discovery.
-   Health checks.
-   Rolling deployments.
-   Restarting failed containers.

For smaller applications, managed platforms may be simpler.

------------------------------------------------------------------------

# 53. Resource Limits

Define appropriate resource expectations.

For containers/services:

``` text
CPU
Memory
Storage
Connections
```

Without limits, one service can consume resources needed by others.

Do not set arbitrary limits without observing real workloads.

------------------------------------------------------------------------

# 54. Autoscaling

Scale based on useful signals.

Possible metrics:

``` text
CPU
Memory
Requests/sec
Queue depth
Latency
Custom business metrics
```

For workers:

``` text
Queue depth
```

may be more meaningful than CPU.

------------------------------------------------------------------------

# 55. Cost Monitoring

Track:

``` text
Compute
Database
Storage
Bandwidth
CDN
Logs
Monitoring
Queues
Third-party APIs
```

Set budgets and alerts where appropriate.

A technically excellent architecture that is financially unsustainable
is not a successful architecture.

------------------------------------------------------------------------

# 56. Production Access

Production access should be restricted.

Prefer:

``` text
Developer
 ↓
CI/CD
 ↓
Production
```

rather than:

``` text
Every developer
 ↓
Direct production shell access
```

Use:

-   IAM.
-   MFA.
-   Temporary access.
-   Audit logs.
-   Least privilege.

------------------------------------------------------------------------

# 57. Production Database Access

Do not casually run:

``` sql
DELETE FROM users;
```

in production.

Use:

-   Restricted permissions.
-   Read-only access for routine inspection.
-   Approved migration processes.
-   Backups.
-   Audit logging.

------------------------------------------------------------------------

# 58. Database Backup Before Risky Changes

For destructive operations:

``` text
Backup
 ↓
Verify
 ↓
Change
 ↓
Monitor
```

Understand whether the backup provides the required recovery guarantees.

------------------------------------------------------------------------

# 59. Disaster Recovery

Define:

``` text
RPO
RTO
```

Plan for:

``` text
Database failure
Region failure
Credential compromise
Accidental deletion
Bad deployment
Data corruption
```

Practice recovery.

------------------------------------------------------------------------

# 60. Deployment Documentation

Document:

``` text
How to deploy
How to rollback
Required environment variables
Migration process
Health checks
Monitoring
Common failures
Emergency procedures
```

A deployment process that only one engineer understands is a production
risk.

------------------------------------------------------------------------

# 61. Runbooks

Create runbooks for common incidents.

Example:

``` text
# High API Error Rate

1. Check recent deployments.
2. Check application logs.
3. Check database health.
4. Check external dependencies.
5. Check traffic.
6. Roll back if deployment-related.
7. Monitor recovery.
```

Runbooks reduce incident response time.

------------------------------------------------------------------------

# 62. Release Checklist

Before production:

``` text
[ ] Code reviewed
[ ] CI passed
[ ] Tests passed
[ ] Security checks passed
[ ] Build reproducible
[ ] Artifact identified
[ ] Environment variables configured
[ ] Database migration reviewed
[ ] Migration tested
[ ] Rollback strategy understood
[ ] Monitoring ready
[ ] Smoke tests ready
[ ] Feature flag configured if applicable
[ ] Deployment owner identified
```

------------------------------------------------------------------------

# 63. Post-Deployment Checklist

After deployment:

``` text
[ ] Health checks pass
[ ] Smoke tests pass
[ ] Error rate normal
[ ] Latency normal
[ ] Database healthy
[ ] Queue healthy
[ ] External APIs healthy
[ ] Business metrics normal
[ ] No unexpected logs
```

------------------------------------------------------------------------

# 64. Production Readiness Checklist

Before launching a system:

``` text
[ ] HTTPS
[ ] Secrets management
[ ] Authentication
[ ] Authorization
[ ] Database backups
[ ] Restore procedure
[ ] Monitoring
[ ] Alerting
[ ] Logging
[ ] Health checks
[ ] Graceful shutdown
[ ] Rate limiting
[ ] Resource limits
[ ] CI/CD
[ ] Rollback plan
[ ] Migration strategy
[ ] Disaster recovery
[ ] Incident response
[ ] Documentation
[ ] Cost monitoring
[ ] Security scanning
```

------------------------------------------------------------------------

# 65. Common Deployment Anti-Patterns

Avoid:

### Manual Production Deployments

``` text
SSH
 ↓
git pull
 ↓
npm install
 ↓
restart
```

unless there is a deliberate emergency process.

### Secrets in Git

``` text
.env
 ↓
GitHub
```

Never.

### `latest` Everywhere

``` text
image: latest
```

Makes deployments difficult to identify and reproduce.

### Untested Migrations

``` text
Production
 ↓
Run migration
 ↓
Hope
```

### No Rollback

``` text
Bad deployment
 ↓
"We'll figure it out."
```

### No Monitoring

``` text
Deploy
 ↓
Go home
```

### Shared Production Resources

``` text
Development
+
Staging
+
Production
 ↓
Same database
```

Avoid unless deliberately designed.

### Manual Infrastructure

``` text
Someone clicked settings
```

without infrastructure documentation or reproducibility.

------------------------------------------------------------------------

# 66. Recommended Deployment Process

For a typical production application:

``` text
Developer
   ↓
Git Push
   ↓
Pull Request
   ↓
Code Review
   ↓
CI
 ├── Lint
 ├── Type Check
 ├── Unit Tests
 ├── Integration Tests
 ├── Security Checks
 └── Build
   ↓
Artifact
   ↓
Staging
   ↓
Migration / Compatibility Check
   ↓
Smoke Tests
   ↓
Production
   ↓
Health Checks
   ↓
Monitoring
   ↓
Continue / Rollback
```

------------------------------------------------------------------------

# 67. Final Mental Model

For every deployment, ask:

``` text
1. What exactly are we deploying?
2. Which commit/artifact is it?
3. Has it been tested?
4. Is the artifact reproducible?
5. What configuration does it need?
6. What secrets does it need?
7. Are migrations required?
8. Can old and new versions coexist?
9. What happens if deployment fails?
10. Can we roll back safely?
11. What health checks prove success?
12. What metrics should we watch?
13. What alerts should trigger?
14. What happens if a dependency fails?
15. How much will this deployment cost?
16. Who can access production?
17. How do we recover from a bad deployment?
18. Is the process documented?
```

The goal is not:

``` text
Deploy as fast as possible
```

The goal is:

``` text
Deploy confidently
+
Deploy repeatedly
+
Deploy safely
+
Detect problems quickly
+
Recover quickly
```

That is the foundation of production-grade deployment and DevOps
engineering.
