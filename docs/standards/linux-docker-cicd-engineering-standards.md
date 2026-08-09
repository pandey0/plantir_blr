# Linux, Docker & CI/CD Engineering Standards

## Purpose

This document defines practical standards for working with Linux
systems, containers, Docker, and CI/CD pipelines.

These technologies form a connected engineering workflow:

``` text
Developer
   ↓
Linux Environment
   ↓
Application
   ↓
Docker Image
   ↓
Container
   ↓
CI Pipeline
   ↓
Artifact / Image Registry
   ↓
CD Pipeline
   ↓
Staging
   ↓
Production
```

The goal is to build systems that are:

``` text
Reproducible
+
Secure
+
Automated
+
Observable
+
Scalable
+
Recoverable
```

------------------------------------------------------------------------

# 1. Core Principles

1.  Understand the Linux environment your application runs in.
2.  Prefer automation over manual operational work.
3.  Make builds reproducible.
4.  Keep containers immutable.
5.  Keep production configuration outside images.
6.  Run containers with minimum privileges.
7.  Build once and deploy the same artifact where practical.
8.  Keep CI fast and deterministic.
9.  Treat deployment as a software engineering process.
10. Make every deployment identifiable and reversible.

------------------------------------------------------------------------

# 2. Linux Mental Model

A Linux system can be understood as:

``` text
Applications
     ↓
Processes
     ↓
System Calls
     ↓
Kernel
     ↓
CPU / Memory / Devices
```

The kernel manages:

``` text
CPU
Memory
Processes
Filesystems
Networking
Devices
Security
```

You do not need to memorize every Linux command, but you should
understand how the system behaves.

------------------------------------------------------------------------

# 3. Linux Filesystem

Common directories:

``` text
/
├── /bin
├── /boot
├── /dev
├── /etc
├── /home
├── /opt
├── /proc
├── /root
├── /run
├── /srv
├── /sys
├── /tmp
├── /usr
└── /var
```

Important concepts:

``` text
/etc
→ Configuration

/var
→ Variable application/system data

/home
→ User files

/tmp
→ Temporary files

/usr
→ Installed system software

/opt
→ Optional application software

/proc
→ Process/kernel information

/sys
→ Kernel/device information
```

------------------------------------------------------------------------

# 4. Linux Paths

Understand:

``` text
Absolute path
Relative path
Current directory
Home directory
Root directory
```

Examples:

``` bash
pwd
cd /var/log
cd ..
cd ~
```

Avoid scripts that depend unnecessarily on the current working
directory.

Prefer explicit paths where reliability matters.

------------------------------------------------------------------------

# 5. File Permissions

Linux permissions are based on:

``` text
Owner
Group
Others
```

Example:

``` text
-rwxr-xr--
```

represents:

``` text
Owner  → rwx
Group  → r-x
Others → r--
```

Understand:

``` text
read
write
execute
```

------------------------------------------------------------------------

# 6. chmod / chown

Common operations:

``` bash
chmod 755 script.sh
chmod 600 secret.txt
chown user:group file
```

Use the least permissions necessary.

Avoid:

``` bash
chmod -R 777 .
```

especially in production.

------------------------------------------------------------------------

# 7. Users and Groups

Applications should generally run as dedicated users rather than root.

Understand:

``` text
User
Group
UID
GID
sudo
```

Useful commands:

``` bash
whoami
id
groups
```

------------------------------------------------------------------------

# 8. Root User

Root has extremely broad system privileges.

Avoid running application processes as root unless genuinely required.

Why:

``` text
Application vulnerability
 ↓
Root privileges
 ↓
Potential system compromise
```

Use least privilege.

------------------------------------------------------------------------

# 9. Processes

A process is a running program.

Useful commands:

``` bash
ps
top
htop
pgrep
kill
pkill
```

Understand:

``` text
PID
Parent process
Child process
CPU usage
Memory usage
Process state
```

------------------------------------------------------------------------

# 10. Process Signals

Important signals include:

``` text
SIGTERM
SIGKILL
SIGINT
SIGHUP
```

A typical graceful shutdown:

``` text
SIGTERM
 ↓
Application stops accepting work
 ↓
Finish active work
 ↓
Close connections
 ↓
Exit
```

`SIGKILL` cannot be gracefully handled.

Use graceful termination whenever possible.

------------------------------------------------------------------------

# 11. Background Processes

Understand:

``` bash
command &
```

and tools such as:

``` text
systemd
supervisors
containers
```

Do not rely on manually started background processes for production
services.

------------------------------------------------------------------------

# 12. systemd

Linux servers commonly use `systemd` to manage services.

Understand:

``` bash
systemctl status service
systemctl start service
systemctl stop service
systemctl restart service
journalctl -u service
```

A production service should have:

-   Clear startup behavior.
-   Restart policy.
-   Logging.
-   Resource expectations.
-   Dependency configuration.

------------------------------------------------------------------------

# 13. Linux Logs

Common locations include:

``` text
/var/log
journalctl
```

Useful:

``` bash
journalctl -u my-service
journalctl -f
```

Logs should contain enough information to diagnose failures without
exposing secrets.

------------------------------------------------------------------------

# 14. CPU and Memory

Useful commands:

``` bash
top
htop
free -h
uptime
vmstat
```

Monitor:

``` text
CPU utilization
Memory usage
Swap
Load average
```

High CPU does not automatically mean the application is broken.

Identify the process and workload first.

------------------------------------------------------------------------

# 15. Disk Usage

Useful commands:

``` bash
df -h
du -sh *
lsblk
```

Understand the difference between:

``` text
Filesystem capacity
Filesystem usage
Directory usage
Inodes
```

Disk exhaustion can cause:

``` text
Database failures
Logging failures
Application crashes
Container failures
```

------------------------------------------------------------------------

# 16. File Descriptors

Linux processes have limits on open files/descriptors.

Descriptors include:

``` text
Files
Sockets
Pipes
```

A service can fail with:

``` text
Too many open files
```

Investigate:

``` bash
ulimit -n
lsof
```

when debugging connection/file leaks.

------------------------------------------------------------------------

# 17. Linux Networking

Useful commands:

``` bash
ip addr
ip route
ss
ping
dig
curl
traceroute
```

Understand:

``` text
Interfaces
IP addresses
Routes
Ports
Listening sockets
DNS
```

------------------------------------------------------------------------

# 18. Ports and Listening Services

Check listening services:

``` bash
ss -lntp
```

If your application listens on port 3000:

``` text
Application
 ↓
127.0.0.1:3000
```

may behave differently from:

``` text
0.0.0.0:3000
```

Understand which network interfaces the service is exposed on.

------------------------------------------------------------------------

# 19. Environment Variables

Linux applications frequently use environment variables for
configuration.

Example:

``` bash
export DATABASE_URL=...
```

Use environment variables for configuration, but do not casually expose
secrets through process listings, logs, or debugging output.

------------------------------------------------------------------------

# 20. Shell Scripting

Shell scripts are useful for:

``` text
Builds
Deployment
Local setup
Automation
Operations
```

Good scripts should:

-   Fail on errors where appropriate.
-   Quote variables.
-   Validate inputs.
-   Avoid destructive defaults.
-   Produce useful output.
-   Be idempotent when practical.

For Bash, commonly consider:

``` bash
set -euo pipefail
```

but understand the behavior before applying it blindly.

------------------------------------------------------------------------

# 21. SSH

For remote Linux administration:

``` bash
ssh user@server
```

Prefer:

-   Key-based authentication.
-   MFA where supported.
-   Restricted access.
-   Non-root users.
-   Auditing.
-   Managed/bastion access where appropriate.

Avoid exposing SSH unnecessarily to the public Internet.

------------------------------------------------------------------------

# 22. Linux Production Checklist

``` text
[ ] Application runs as non-root user
[ ] Files have least-privilege permissions
[ ] Services managed by a process supervisor
[ ] Logs available
[ ] Log rotation configured
[ ] CPU monitored
[ ] Memory monitored
[ ] Disk monitored
[ ] File descriptors monitored
[ ] Network ports reviewed
[ ] Firewall configured
[ ] SSH access restricted
[ ] Security updates maintained
```

------------------------------------------------------------------------

# 23. Containers

A container packages an application and its runtime dependencies into an
isolated execution environment.

Conceptually:

``` text
Host OS
  ↓
Container Runtime
  ↓
Container
  ├── Application
  ├── Runtime
  └── Dependencies
```

Containers share the host kernel.

They are not full virtual machines.

------------------------------------------------------------------------

# 24. Docker Architecture

Conceptually:

``` text
Docker CLI
   ↓
Docker Engine
   ↓
Container Runtime
   ↓
Containers
```

Docker provides:

``` text
Images
Containers
Networks
Volumes
Registries
Builds
```

------------------------------------------------------------------------

# 25. Images vs Containers

### Image

An immutable template.

``` text
Application
+
Runtime
+
Dependencies
```

### Container

A running instance of an image.

``` text
Image
 ↓
Container
```

Multiple containers can be created from the same image.

------------------------------------------------------------------------

# 26. Docker Layers

Docker images are composed of layers.

Example:

``` text
Base Image
 ↓
System Dependencies
 ↓
Package Dependencies
 ↓
Source
 ↓
Build Output
```

Docker can reuse unchanged layers.

Order Dockerfile instructions to maximize useful caching.

------------------------------------------------------------------------

# 27. Dockerfile

A Dockerfile defines how an image is built.

Typical structure:

``` dockerfile
FROM ...
WORKDIR ...
COPY ...
RUN ...
EXPOSE ...
CMD ...
```

Keep Dockerfiles:

-   Small.
-   Deterministic.
-   Understandable.
-   Secure.

------------------------------------------------------------------------

# 28. Multi-Stage Builds

Use multi-stage builds for applications requiring compilation.

Conceptually:

``` text
Builder Image
 ├── Source
 ├── Dependencies
 └── Build
       ↓
Runtime Image
 └── Build Output
```

Benefits:

-   Smaller image.
-   Fewer vulnerabilities.
-   No unnecessary build tools.
-   Faster deployment.

------------------------------------------------------------------------

# 29. Docker Build Context

Avoid sending unnecessary files into the Docker build context.

Use:

``` text
.dockerignore
```

Exclude:

``` text
.git
node_modules
.env
logs
temporary files
build artifacts
```

Do not accidentally send secrets into builds.

------------------------------------------------------------------------

# 30. Dependency Installation

Use lockfiles.

Examples:

``` text
package-lock.json
pnpm-lock.yaml
yarn.lock
poetry.lock
requirements lock
```

Builds should use deterministic installation.

Avoid uncontrolled dependency upgrades during image builds.

------------------------------------------------------------------------

# 31. Docker Image Tags

Prefer identifiable tags:

``` text
app:v1.4.2
app:git-a83f19c
```

Avoid relying on:

``` text
latest
```

for production deployments.

A deployment should identify exactly which image is running.

------------------------------------------------------------------------

# 32. Image Registry

Use a trusted registry:

``` text
Build
 ↓
Image
 ↓
Registry
 ↓
Deployment
```

Track:

``` text
Image tag
Commit SHA
Build ID
Version
```

Restrict who can push production images.

------------------------------------------------------------------------

# 33. Container Security

Containers should:

-   Run as non-root.
-   Use minimal images.
-   Avoid unnecessary capabilities.
-   Avoid privileged mode.
-   Keep secrets outside images.
-   Scan images.
-   Pin trusted base images.

Avoid:

``` text
--privileged
```

unless there is a legitimate requirement.

------------------------------------------------------------------------

# 34. Container Filesystem

Container filesystems are generally ephemeral.

Do not assume:

``` text
Write file inside container
 ↓
Container recreated
 ↓
File still exists
```

For persistent data use:

``` text
Volume
Object Storage
Database
External Storage
```

------------------------------------------------------------------------

# 35. Docker Volumes

Volumes persist data outside the container lifecycle.

Use volumes for things such as:

``` text
Local database development
Persistent service data
Development state
```

For production databases, prefer managed/persistent storage designed for
database durability rather than treating containers themselves as
durable storage.

------------------------------------------------------------------------

# 36. Docker Networking

Containers can communicate through Docker networks.

Conceptually:

``` text
Frontend Container
       ↓
Backend Container
       ↓
Database Container
```

Use service names rather than hardcoded container IP addresses.

------------------------------------------------------------------------

# 37. Docker Compose

Docker Compose is useful for local multi-service environments.

Example:

``` text
App
 ↓
PostgreSQL
 ↓
Redis
```

A Compose environment can define:

``` text
Services
Networks
Volumes
Environment
Dependencies
Health checks
```

Do not assume `depends_on` means a service is actually ready.

Use health checks and application retry logic where necessary.

------------------------------------------------------------------------

# 38. Container Environment Variables

Use environment variables or secret mechanisms.

Do not bake:

``` text
DATABASE_PASSWORD
API_KEY
JWT_SECRET
```

into the image.

The same image should be deployable to multiple environments with
different configuration.

------------------------------------------------------------------------

# 39. Container Health Checks

Define health behavior where appropriate.

Examples:

``` text
GET /health
GET /ready
```

Health checks should be:

-   Fast.
-   Deterministic.
-   Meaningful.

Do not make a basic liveness check depend on every external service.

------------------------------------------------------------------------

# 40. Container Resource Limits

Containers should have understood resource requirements.

Consider:

``` text
CPU
Memory
PIDs
File descriptors
Storage
```

Without limits, one workload can consume resources needed by other
workloads.

------------------------------------------------------------------------

# 41. Container Logging

Prefer writing application logs to:

``` text
stdout
stderr
```

and let the container platform collect them.

Avoid relying on files inside ephemeral containers unless deliberately
designed.

Never log:

``` text
Passwords
Tokens
API keys
Secrets
```

------------------------------------------------------------------------

# 42. Container Shutdown

Applications should handle termination signals.

Flow:

``` text
Container receives SIGTERM
 ↓
Application stops accepting new work
 ↓
Finish active work
 ↓
Close connections
 ↓
Exit
```

Configure an appropriate stop timeout.

------------------------------------------------------------------------

# 43. Docker Debugging

Useful commands:

``` bash
docker ps
docker logs <container>
docker inspect <container>
docker exec -it <container> sh
docker stats
docker network ls
docker volume ls
docker images
```

Debug systematically:

``` text
Is container running?
 ↓
What are the logs?
 ↓
What environment is configured?
 ↓
Is the port exposed?
 ↓
Is the service listening?
 ↓
Can it reach dependencies?
```

------------------------------------------------------------------------

# 44. Docker Image Optimization

Reduce image size by:

-   Multi-stage builds.
-   Minimal runtime images.
-   `.dockerignore`.
-   Removing build tools.
-   Removing unused packages.
-   Cleaning package caches where appropriate.

Smaller images generally improve:

``` text
Pull time
Startup time
Storage
Attack surface
```

------------------------------------------------------------------------

# 45. Docker Anti-Patterns

Avoid:

### Running Everything as Root

``` text
Container
 ↓
root
```

### Huge Images

``` text
2 GB image
```

for a small API.

### Secrets in Images

``` text
COPY .env .
```

### Mutable Production Containers

Manually changing a running container creates unreproducible state.

### `latest` Everywhere

Makes rollbacks ambiguous.

### No Health Checks

The orchestrator cannot reliably know whether the service is ready.

------------------------------------------------------------------------

# 46. CI/CD Mental Model

CI/CD automates:

``` text
Code
 ↓
Validate
 ↓
Build
 ↓
Test
 ↓
Package
 ↓
Deploy
 ↓
Verify
```

### CI

Continuous Integration.

Validate changes frequently.

### CD

Continuous Delivery / Deployment.

Automate delivery to environments.

------------------------------------------------------------------------

# 47. Pull Request Pipeline

A typical PR pipeline:

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
Security Scan
 ↓
Build
```

Fail the PR when critical checks fail.

------------------------------------------------------------------------

# 48. Deployment Pipeline

A typical deployment:

``` text
Merge
 ↓
Build
 ↓
Create Artifact
 ↓
Push Artifact
 ↓
Deploy Staging
 ↓
Smoke Tests
 ↓
Approval / Automated Gate
 ↓
Production
 ↓
Health Checks
 ↓
Monitor
```

------------------------------------------------------------------------

# 49. Build Once, Deploy Many

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

rather than rebuilding separately for each environment.

This makes the tested artifact the deployed artifact.

------------------------------------------------------------------------

# 50. CI Environment Reproducibility

CI should define:

``` text
Runtime version
Package manager
Dependency lockfile
Environment variables
Services
Build commands
Test commands
```

Avoid:

``` text
"It works on my machine."
```

CI should approximate the environment in which the application is built
and tested.

------------------------------------------------------------------------

# 51. CI Caching

Cache expensive, reproducible dependencies where useful.

Examples:

``` text
Package manager cache
Docker build cache
Compiler cache
```

Caching should improve speed without compromising correctness.

Invalidate caches when relevant dependencies change.

------------------------------------------------------------------------

# 52. CI Parallelization

Independent checks can run concurrently.

Example:

``` text
             ┌── Lint
             │
PR ──────────┼── Unit Tests
             │
             ├── Type Check
             │
             └── Security Scan
                     ↓
                   Build
```

Parallelization reduces feedback time.

------------------------------------------------------------------------

# 53. CI Artifacts

Store useful build outputs:

``` text
Docker image
Compiled application
Test reports
Coverage reports
Logs
Security reports
```

Artifacts should be identifiable by:

``` text
Commit
Build ID
Version
```

------------------------------------------------------------------------

# 54. CI Secrets

Never hardcode secrets into pipeline files.

Use:

``` text
CI secret store
Environment secrets
Cloud secret manager
OIDC/workload identity
```

Prefer short-lived credentials over long-lived static credentials where
supported.

------------------------------------------------------------------------

# 55. CI Permissions

CI pipelines are powerful.

Follow least privilege.

A build that only needs to:

``` text
Run tests
```

should not automatically have:

``` text
Production administrator access
```

Separate:

``` text
Build permissions
Deploy permissions
Production permissions
```

------------------------------------------------------------------------

# 56. OIDC / Short-Lived Cloud Credentials

Where supported, prefer workload identity/OIDC:

``` text
CI
 ↓
Identity Provider
 ↓
Short-lived Cloud Credentials
 ↓
Cloud
```

over storing permanent cloud access keys in CI.

This reduces credential exposure.

------------------------------------------------------------------------

# 57. Dependency and Supply Chain Security

CI should consider:

``` text
Dependency vulnerabilities
Malicious packages
Compromised base images
Dependency confusion
Lockfile changes
Secret leaks
```

Useful practices:

-   Dependency scanning.
-   Image scanning.
-   Lockfile review.
-   Trusted registries.
-   Signed artifacts where appropriate.
-   SBOM generation where required.

------------------------------------------------------------------------

# 58. Docker in CI

A typical pipeline:

``` text
Git Commit
 ↓
CI
 ↓
Run Tests
 ↓
Docker Build
 ↓
Scan Image
 ↓
Tag Image
 ↓
Push Registry
 ↓
Deploy
```

Do not build an image from code that has not passed required validation.

------------------------------------------------------------------------

# 59. Deployment Environments

Keep environments distinct:

``` text
Local
 ↓
CI
 ↓
Staging
 ↓
Production
```

Production should have:

``` text
Separate credentials
Separate database
Separate infrastructure
Separate secrets
```

Do not share production credentials with local development.

------------------------------------------------------------------------

# 60. Environment Configuration

The same artifact should be configurable per environment.

Example:

``` text
Image:
app:abc123

Staging:
DATABASE_URL=staging

Production:
DATABASE_URL=production
```

Configuration changes.

Artifact does not.

------------------------------------------------------------------------

# 61. Database Migrations in CI/CD

Treat migrations as production code.

Pipeline:

``` text
Build
 ↓
Test migration
 ↓
Deploy compatible application
 ↓
Run migration
 ↓
Verify
```

For risky schema changes, use:

``` text
Expand
 ↓
Migrate
 ↓
Switch
 ↓
Contract
```

Avoid destructive migrations during rolling deployments.

------------------------------------------------------------------------

# 62. Deployment Strategies

Common strategies:

``` text
Rolling
Blue-Green
Canary
Feature Flag
```

### Rolling

Replace instances gradually.

### Blue-Green

Switch between two environments.

### Canary

Send a small amount of traffic to the new version.

### Feature Flag

Deploy code before enabling functionality.

------------------------------------------------------------------------

# 63. Rollback

A deployment must be identifiable and reversible.

Example:

``` text
Current:
app:abc123

Previous:
app:91ef321
```

If the new version fails:

``` text
Production
 ↓
Previous artifact
 ↓
Health check
 ↓
Monitor
```

Remember that database changes may make application rollback unsafe.

------------------------------------------------------------------------

# 64. Roll Forward

Sometimes rolling forward is safer.

Example:

``` text
Migration already applied
 ↓
Old application cannot understand new schema
```

Instead of reverting:

``` text
Deploy a corrective version
```

Design schema migrations with deployment compatibility in mind.

------------------------------------------------------------------------

# 65. Health Gates

A deployment should be verified automatically.

Example:

``` text
Deploy
 ↓
Readiness
 ↓
Smoke tests
 ↓
Error rate
 ↓
Latency
 ↓
Business checks
 ↓
Continue / Rollback
```

Do not rely only on:

``` text
"Container started."
```

------------------------------------------------------------------------

# 66. GitHub Actions Example Structure

A typical workflow may have:

``` text
.github/
└── workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-production.yml
```

Keep workflows:

-   Small enough to understand.
-   Reusable where appropriate.
-   Least-privileged.
-   Explicit about dependencies.

------------------------------------------------------------------------

# 67. CI Pipeline Stages

A mature pipeline can be:

``` text
Validate
 ↓
Test
 ↓
Build
 ↓
Scan
 ↓
Package
 ↓
Deploy Staging
 ↓
Verify
 ↓
Deploy Production
 ↓
Monitor
```

Do not put every step into one giant script.

Make important stages visible.

------------------------------------------------------------------------

# 68. Pipeline Failure

When CI fails:

``` text
Identify stage
 ↓
Read logs
 ↓
Reproduce locally if necessary
 ↓
Fix
 ↓
Re-run
```

Do not hide failures with:

``` text
|| true
```

unless the failure is genuinely non-critical and documented.

------------------------------------------------------------------------

# 69. Flaky CI

CI must be deterministic.

Common causes:

``` text
Race conditions
External services
Time assumptions
Shared state
Network dependencies
Unstable tests
```

Do not normalize flaky CI.

Flaky pipelines destroy trust in automation.

------------------------------------------------------------------------

# 70. Branch Protection

Production branches should generally require:

``` text
Pull Request
Code Review
CI Passing
```

Avoid direct pushes to protected branches.

------------------------------------------------------------------------

# 71. Release Versioning

Identify releases using:

``` text
Git tag
Semantic version
Commit SHA
Build ID
Container tag
```

Example:

``` text
v2.4.1
```

and:

``` text
git-a83f19c
```

Use immutable identifiers for debugging.

------------------------------------------------------------------------

# 72. Release Notes

Important releases should document:

``` text
What changed
Breaking changes
Migration requirements
Configuration changes
Rollback notes
Known issues
```

Keep release information accessible.

------------------------------------------------------------------------

# 73. Production Access

Production access should be limited.

Prefer:

``` text
Developer
 ↓
CI/CD
 ↓
Production
```

rather than giving every developer unrestricted server access.

Use:

``` text
MFA
IAM
Audit logs
Temporary access
Least privilege
```

------------------------------------------------------------------------

# 74. Infrastructure as Code

Production infrastructure should be reproducible.

Examples:

``` text
Terraform
OpenTofu
Pulumi
CloudFormation
```

Use IaC for:

``` text
Networks
Compute
Databases
Load balancers
IAM
Queues
Storage
Monitoring
```

Avoid critical infrastructure existing only as manual console
configuration.

------------------------------------------------------------------------

# 75. Immutable Infrastructure

Prefer replacing infrastructure over manually modifying running
instances.

Instead of:

``` text
SSH
 ↓
Edit server
 ↓
Restart
```

prefer:

``` text
Code
 ↓
Build
 ↓
Artifact
 ↓
Deploy new instance
```

This improves reproducibility.

------------------------------------------------------------------------

# 76. Deployment Documentation

Document:

``` text
How to deploy
How to rollback
Required variables
Migration procedure
Health checks
Monitoring
Common failures
Emergency procedures
```

A deployment process known by only one person is an operational risk.

------------------------------------------------------------------------

# 77. Production Deployment Checklist

``` text
[ ] PR approved
[ ] CI passed
[ ] Tests passed
[ ] Security checks passed
[ ] Artifact identified
[ ] Artifact scanned
[ ] Environment variables configured
[ ] Secrets configured
[ ] Migration reviewed
[ ] Rollback strategy understood
[ ] Health checks ready
[ ] Smoke tests ready
[ ] Monitoring ready
[ ] Deployment owner identified
```

------------------------------------------------------------------------

# 78. Post-Deployment Checklist

``` text
[ ] Application healthy
[ ] Containers healthy
[ ] Smoke tests pass
[ ] Error rate normal
[ ] Latency normal
[ ] CPU normal
[ ] Memory normal
[ ] Database healthy
[ ] Redis healthy
[ ] Queues healthy
[ ] External APIs healthy
[ ] Business metrics normal
[ ] No unexpected errors
```

------------------------------------------------------------------------

# 79. Linux + Docker + CI/CD Debugging Flow

When a production service is broken:

``` text
1. Is the host healthy?
        ↓
2. Is the process/container running?
        ↓
3. Is the service listening?
        ↓
4. Are ports/networking correct?
        ↓
5. What do logs show?
        ↓
6. Can the service reach dependencies?
        ↓
7. Is configuration correct?
        ↓
8. Is the image/artifact correct?
        ↓
9. Did the deployment change anything?
        ↓
10. Should we rollback?
```

Debug from infrastructure upward.

------------------------------------------------------------------------

# 80. Common Anti-Patterns

Avoid:

### Manual Production Changes

``` text
SSH
 ↓
Edit code
 ↓
Restart
```

### Secrets in Docker Images

``` text
COPY .env .
```

### Running as Root

``` text
Container
 ↓
root
```

### Mutable Containers

Changing running containers manually.

### `latest` Production Images

Ambiguous and difficult to reproduce.

### Unpinned Dependencies

Builds change unexpectedly.

### No CI

``` text
Developer
 ↓
Production
```

### CI With Production Admin Access

Excessive blast radius.

### Ignoring Failed Tests

``` text
Tests failed
 ↓
Deploy anyway
```

### Giant CI Script

Impossible to understand or debug.

### No Rollback Plan

``` text
Bad deployment
 ↓
Unknown recovery
```

------------------------------------------------------------------------

# 81. Golden Rules

1.  Understand Linux processes, files, permissions, networking, and
    resources.
2.  Do not run production applications as root unnecessarily.
3.  Use least-privilege filesystem permissions.
4.  Monitor CPU, memory, disk, and file descriptors.
5.  Treat containers as immutable runtime artifacts.
6.  Keep secrets outside container images.
7.  Use multi-stage Docker builds where appropriate.
8.  Keep images minimal.
9.  Pin important dependencies and base images.
10. Use `.dockerignore`.
11. Use non-root container users.
12. Use health checks.
13. Handle SIGTERM gracefully.
14. Use persistent storage for persistent data.
15. Use service names rather than dynamic container IPs.
16. Give containers appropriate resource limits.
17. Build reproducibly.
18. Run CI on every important change.
19. Fail CI when critical checks fail.
20. Do not normalize flaky CI.
21. Cache dependencies carefully.
22. Parallelize independent CI jobs.
23. Build the artifact once and promote it.
24. Identify every production artifact by immutable version/commit.
25. Keep CI permissions minimal.
26. Prefer short-lived cloud credentials.
27. Scan dependencies and images.
28. Keep staging and production credentials separate.
29. Test migrations before production.
30. Design deployments for backward compatibility.
31. Always know how to roll back or roll forward.
32. Verify deployments with health checks and smoke tests.
33. Monitor immediately after deployment.
34. Use infrastructure as code for critical infrastructure.
35. Document deployment and recovery procedures.
36. Automate repetitive operational work.
37. Never rely on undocumented manual server changes.

------------------------------------------------------------------------

# 82. Final Mental Model

For every application, ask:

``` text
Linux
 ↓
Where does it run?
 ↓
What processes are running?
 ↓
What resources does it use?
 ↓
What ports does it expose?
 ↓
Docker
 ↓
What exactly is inside the image?
 ↓
Can I reproduce the image?
 ↓
Is the container secure?
 ↓
CI
 ↓
Does every change get validated?
 ↓
Is the build deterministic?
 ↓
CD
 ↓
What exact artifact is deployed?
 ↓
Can old and new versions coexist?
 ↓
How do we verify success?
 ↓
How do we rollback?
 ↓
Operations
 ↓
Can we observe and debug the system?
```

The goal is not:

``` text
Know Docker commands
+
Know Linux commands
+
Write YAML
```

The goal is:

``` text
Understand the runtime
+
Build reproducibly
+
Automate validation
+
Deploy safely
+
Operate reliably
+
Recover quickly
```

That is the foundation of production-grade Linux, Docker, and CI/CD
engineering.
