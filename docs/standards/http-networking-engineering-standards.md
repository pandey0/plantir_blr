# HTTP & Networking Engineering Standards

## Purpose

This document defines practical standards for understanding, designing,
implementing, debugging, and operating networked applications.

Modern applications are fundamentally networked systems:

``` text
Browser / Mobile
      ↓
     DNS
      ↓
    Internet
      ↓
 CDN / Load Balancer / Proxy
      ↓
    HTTP/HTTPS
      ↓
 Application
      ↓
 Database / Redis / Queue / External APIs
```

The goal is to understand what happens at each layer and design systems
that are:

``` text
Correct
+
Secure
+
Fast
+
Reliable
+
Observable
+
Debuggable
```

------------------------------------------------------------------------

# 1. Core Networking Principles

1.  Understand the network before abstracting it away.
2.  Assume networks can fail.
3.  Every network call should have a timeout.
4.  Validate all external input.
5.  Use HTTPS in production.
6.  Do not expose internal services unnecessarily.
7.  Design APIs around HTTP semantics.
8.  Make retry behavior intentional.
9.  Prefer stateless services where practical.
10. Monitor latency, errors, and connection behavior.

------------------------------------------------------------------------

# 2. Networking Mental Model

A request may travel through:

``` text
Application
 ↓
HTTP
 ↓
TLS
 ↓
TCP
 ↓
IP
 ↓
Network
 ↓
Server
```

For debugging, understand which layer is failing.

Example:

``` text
DNS failure
≠
TCP failure
≠
TLS failure
≠
HTTP failure
≠
Application failure
```

------------------------------------------------------------------------

# 3. OSI / TCP-IP Model

You do not need to memorize the OSI model mechanically, but understand
the responsibilities.

Conceptually:

``` text
Application
 ↓
Transport
 ↓
Internet
 ↓
Link
```

Common technologies:

``` text
Application → HTTP, DNS
Transport   → TCP, UDP
Internet    → IP
Link        → Ethernet, Wi-Fi
```

This mental model helps isolate failures.

------------------------------------------------------------------------

# 4. IP Addresses

An IP address identifies a network interface.

IPv4 example:

``` text
192.168.1.20
```

IPv6 example:

``` text
2001:db8::1
```

Understand:

``` text
Public IP
Private IP
Loopback
Localhost
IPv4
IPv6
```

Common special addresses:

``` text
127.0.0.1 → IPv4 loopback
::1       → IPv6 loopback
```

------------------------------------------------------------------------

# 5. Private vs Public Networks

Private addresses are generally used inside local/private networks.

Common IPv4 private ranges include:

``` text
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
```

A service listening on a private interface may not be directly reachable
from the public Internet.

Understand the difference between:

``` text
localhost
private network
public Internet
```

------------------------------------------------------------------------

# 6. Ports

Ports identify services on a host.

Example:

``` text
127.0.0.1:3000
```

means:

``` text
Host: 127.0.0.1
Port: 3000
```

Common examples:

``` text
22   SSH
53   DNS
80   HTTP
443  HTTPS
5432 PostgreSQL
6379 Redis
```

Do not expose database ports publicly unless there is a deliberate
architecture/security reason.

------------------------------------------------------------------------

# 7. Sockets

A network connection can be thought of as communication between
endpoints.

Conceptually:

``` text
Client IP:Port
        ↕
Server IP:Port
```

Understand:

``` text
Listening socket
Connection
Source port
Destination port
Connection state
```

This becomes important when debugging connection exhaustion.

------------------------------------------------------------------------

# 8. TCP

TCP provides reliable, ordered byte-stream communication.

It handles concepts such as:

``` text
Connection establishment
Reliable delivery
Ordering
Retransmission
Flow control
Congestion control
Connection termination
```

A typical TCP connection:

``` text
Client
 ↓
SYN
 ↓
SYN-ACK
 ↓
ACK
 ↓
Data
```

------------------------------------------------------------------------

# 9. TCP Is a Byte Stream

HTTP messages are transported over a connection, but TCP itself does not
understand HTTP requests.

TCP gives:

``` text
Ordered bytes
```

The application protocol gives meaning to those bytes.

This distinction is important when debugging protocol behavior.

------------------------------------------------------------------------

# 10. UDP

UDP is connectionless and does not provide TCP's built-in reliability
guarantees.

Useful for workloads where:

``` text
Low latency
+
Application-controlled reliability
```

is important.

Examples include:

``` text
DNS
Real-time media
Some game networking
QUIC transport
```

Do not choose UDP simply because it is faster.

------------------------------------------------------------------------

# 11. TCP vs UDP

  TCP                       UDP
  ------------------------- -----------------------------------
  Connection-oriented       Connectionless
  Reliable delivery         No built-in delivery guarantee
  Ordered                   No built-in ordering
  Retransmission            Application-controlled
  Flow/congestion control   Limited
  Common for HTTP           Used by DNS and real-time systems

Choose based on application requirements.

------------------------------------------------------------------------

# 12. DNS

DNS translates names into network addresses.

Conceptually:

``` text
example.com
 ↓
DNS
 ↓
IP address
```

Common record types:

``` text
A      → IPv4
AAAA   → IPv6
CNAME  → Alias
MX     → Mail
TXT    → Text / verification
NS     → Name server
```

------------------------------------------------------------------------

# 13. DNS Resolution

A simplified resolution path:

``` text
Application
 ↓
OS Resolver
 ↓
DNS Resolver
 ↓
Root
 ↓
TLD
 ↓
Authoritative Server
 ↓
IP
```

In practice, caching can make this much shorter.

------------------------------------------------------------------------

# 14. DNS TTL

DNS records have TTL values.

TTL determines approximately how long a response can be cached.

Lower TTL:

``` text
Faster changes
+
More DNS queries
```

Higher TTL:

``` text
Better caching
+
Slower propagation of changes
```

Plan DNS changes accordingly.

------------------------------------------------------------------------

# 15. DNS Debugging

Useful tools include:

``` bash
dig example.com
nslookup example.com
host example.com
```

Check:

``` text
Record
IP
TTL
Nameserver
Resolution path
```

A domain failing to load does not necessarily mean the application is
down.

------------------------------------------------------------------------

# 16. HTTP

HTTP is the application-layer protocol commonly used by web
applications.

A request contains:

``` text
Method
URL
Headers
Body
```

A response contains:

``` text
Status
Headers
Body
```

------------------------------------------------------------------------

# 17. HTTP Request

Conceptually:

``` http
POST /api/orders HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "productId": "123"
}
```

Understand:

``` text
Method
Path
Query parameters
Headers
Cookies
Body
```

------------------------------------------------------------------------

# 18. HTTP Response

Conceptually:

``` http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "order_123"
}
```

Understand:

``` text
Status code
Headers
Body
```

------------------------------------------------------------------------

# 19. HTTP Methods

Common methods:

``` text
GET
POST
PUT
PATCH
DELETE
HEAD
OPTIONS
```

Use semantics consistently.

### GET

Retrieve a resource.

### POST

Create or trigger an operation.

### PUT

Replace a resource representation.

### PATCH

Partially modify a resource.

### DELETE

Delete a resource.

------------------------------------------------------------------------

# 20. Safe Methods

A safe method should not intentionally change server state.

Common safe methods:

``` text
GET
HEAD
OPTIONS
```

Do not use:

``` text
GET /delete-user
```

for destructive operations.

------------------------------------------------------------------------

# 21. Idempotency

An operation is idempotent when repeating it has the same intended
effect as performing it once.

Examples:

``` text
PUT
DELETE
```

are generally designed to be idempotent.

POST is generally not inherently idempotent.

For important POST operations such as payments:

``` text
Idempotency-Key
```

can prevent duplicate effects.

------------------------------------------------------------------------

# 22. HTTP Status Codes

Understand the main categories.

``` text
1xx → Informational
2xx → Success
3xx → Redirect
4xx → Client error
5xx → Server error
```

Common codes:

``` text
200 OK
201 Created
202 Accepted
204 No Content

301/308 Redirect

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
405 Method Not Allowed
409 Conflict
422 Unprocessable Content
429 Too Many Requests

500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
```

Use status codes consistently.

------------------------------------------------------------------------

# 23. 401 vs 403

A common distinction:

``` text
401
→ Authentication is missing/invalid.

403
→ Authentication exists, but access is not allowed.
```

Do not use them interchangeably.

------------------------------------------------------------------------

# 24. HTTP Headers

Headers carry metadata.

Important categories:

``` text
Content-Type
Accept
Authorization
Cookie
Set-Cookie
Cache-Control
ETag
If-None-Match
User-Agent
Origin
Location
Retry-After
```

Do not put sensitive information into headers unnecessarily.

------------------------------------------------------------------------

# 25. Content-Type

Always use the correct content type.

Examples:

``` text
application/json
text/html
text/plain
multipart/form-data
application/pdf
```

The server should validate incoming content types where appropriate.

------------------------------------------------------------------------

# 26. JSON APIs

For JSON APIs:

``` http
Content-Type: application/json
```

Use predictable response structures.

Example:

``` json
{
  "data": {},
  "error": null
}
```

or another consistent contract.

Do not mix arbitrary response shapes across endpoints.

------------------------------------------------------------------------

# 27. API Error Responses

Use a consistent error format.

Example:

``` json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "The email address is invalid."
  }
}
```

Avoid exposing:

``` text
Stack traces
Database errors
Internal paths
Secrets
Provider credentials
```

to clients.

------------------------------------------------------------------------

# 28. Query Parameters

Use query parameters for filtering, sorting, pagination, and optional
retrieval behavior.

Example:

``` text
GET /users?page=2&limit=20&sort=name
```

Validate:

``` text
page
limit
sort
filters
```

Do not allow arbitrary query parameters to directly become SQL.

------------------------------------------------------------------------

# 29. URL Path Parameters

Use path parameters for resource identity.

Example:

``` text
GET /users/123
```

means:

``` text
User 123
```

Use authorization checks before returning the resource.

------------------------------------------------------------------------

# 30. Cookies

Cookies can store client-associated state.

Important attributes:

``` text
Secure
HttpOnly
SameSite
Domain
Path
Max-Age / Expires
```

For authentication cookies, generally consider:

``` text
Secure
HttpOnly
Appropriate SameSite
```

Do not store sensitive secrets in ordinary JavaScript-accessible cookies
unnecessarily.

------------------------------------------------------------------------

# 31. Sessions

A session architecture can look like:

``` text
Browser
 ↓
Session Cookie
 ↓
Backend
 ↓
Session Store
```

The session store may be:

``` text
Database
Redis
```

Avoid storing important server-side session state only in one
application instance.

------------------------------------------------------------------------

# 32. CORS

Cross-Origin Resource Sharing controls browser access between origins.

Example:

``` text
Frontend
https://app.example.com

API
https://api.example.com
```

The browser may perform a CORS check.

Configure CORS explicitly.

Avoid:

``` text
Access-Control-Allow-Origin: *
```

for sensitive authenticated applications unless the architecture
genuinely requires it.

------------------------------------------------------------------------

# 33. Preflight Requests

Some cross-origin requests trigger:

``` text
OPTIONS
```

before the actual request.

This is called a preflight.

Understand:

``` text
Browser
 ↓
OPTIONS
 ↓
Server
 ↓
Allowed?
 ↓
Actual request
```

Do not confuse preflight failures with application API failures.

------------------------------------------------------------------------

# 34. HTTPS

Production applications should use HTTPS.

HTTPS provides:

``` text
HTTP
 +
TLS
```

TLS provides protection against network attackers reading or modifying
traffic.

Use HTTPS for:

``` text
Authentication
Payments
Private data
API communication
```

------------------------------------------------------------------------

# 35. TLS

TLS establishes an encrypted and authenticated connection.

Conceptually:

``` text
Client
 ↓
TLS Handshake
 ↓
Certificate Validation
 ↓
Encrypted Connection
 ↓
HTTP
```

Understand:

``` text
Certificates
Certificate authorities
Private/public keys
Encryption
Certificate expiry
TLS versions
```

------------------------------------------------------------------------

# 36. Certificate Management

Production systems should have automated certificate renewal where
possible.

Monitor:

``` text
Certificate expiry
Certificate validity
Hostname coverage
Chain configuration
```

A valid certificate that suddenly expires can cause a complete outage.

------------------------------------------------------------------------

# 37. HTTP Keep-Alive

Creating a connection has overhead.

Connection reuse can reduce:

``` text
TCP setup
TLS handshake
Latency
CPU
```

Use connection pooling/reuse appropriately.

This matters for:

``` text
Database
Redis
HTTP clients
External APIs
```

------------------------------------------------------------------------

# 38. HTTP/1.1

Important concepts:

``` text
Persistent connections
Keep-alive
Chunked transfer
Host header
```

HTTP/1.1 can suffer from limitations that newer protocols address.

Understand it because many systems still use it.

------------------------------------------------------------------------

# 39. HTTP/2

HTTP/2 introduces features including:

``` text
Binary framing
Multiplexing
Header compression
Stream prioritization concepts
```

Multiple requests can share a connection.

This can reduce connection overhead and improve performance.

------------------------------------------------------------------------

# 40. HTTP/3

HTTP/3 uses:

``` text
HTTP
 ↓
QUIC
 ↓
UDP
```

QUIC provides modern transport capabilities including:

``` text
Encrypted transport
Multiplexed streams
Faster connection establishment
Improved behavior under connection changes
```

Understand the high-level difference between HTTP/1.1, HTTP/2, and
HTTP/3.

------------------------------------------------------------------------

# 41. Reverse Proxy

A reverse proxy sits between clients and application servers.

``` text
Client
 ↓
Reverse Proxy
 ↓
Application
```

Examples:

``` text
Nginx
Caddy
Cloud load balancers
```

Responsibilities may include:

-   TLS termination.
-   Routing.
-   Compression.
-   Static files.
-   Rate limiting.
-   Request limits.

Do not put business logic in the proxy.

------------------------------------------------------------------------

# 42. Load Balancer

A load balancer distributes traffic:

``` text
                Load Balancer
               /      |      \
              ↓       ↓       ↓
           Server   Server   Server
```

Common strategies:

``` text
Round Robin
Least Connections
Weighted
Hash-based
```

Health checks should remove unhealthy instances from service.

------------------------------------------------------------------------

# 43. Layer 4 vs Layer 7 Load Balancing

### Layer 4

Works primarily with:

``` text
TCP / UDP
IP
Port
```

### Layer 7

Understands:

``` text
HTTP
Host
Path
Headers
```

Layer 7 load balancing enables application-aware routing.

------------------------------------------------------------------------

# 44. Stateless Services

Prefer stateless application servers.

Avoid:

``` text
User session
 ↓
Server A local memory
```

when requests may move between servers.

Prefer:

``` text
Server A ─┐
Server B ─┼→ Shared state
Server C ─┘
```

This makes horizontal scaling easier.

------------------------------------------------------------------------

# 45. Connection Pooling

Do not create unnecessary connections for every request.

Use connection pools for:

``` text
PostgreSQL
Redis
HTTP clients
External services
```

A pool should have controlled:

``` text
Maximum connections
Minimum connections
Idle timeout
Connection timeout
```

Too many connections can overload dependencies.

------------------------------------------------------------------------

# 46. Timeouts

Every network call should have a timeout.

Types may include:

``` text
DNS timeout
Connection timeout
TLS timeout
Request timeout
Read timeout
Idle timeout
```

Avoid:

``` text
await externalService()
```

with no meaningful timeout.

------------------------------------------------------------------------

# 47. Retry Strategy

Retry only transient failures.

Use:

``` text
Exponential Backoff
+
Jitter
+
Maximum attempts
```

Example:

``` text
Attempt 1 → immediate
Attempt 2 → short delay
Attempt 3 → longer delay
```

Do not retry permanent errors indefinitely.

------------------------------------------------------------------------

# 48. Retry Storms

A failure can become worse when every client retries simultaneously.

Example:

``` text
Service fails
 ↓
1,000 clients retry
 ↓
Service receives more traffic
 ↓
Service fails harder
```

Mitigate with:

``` text
Backoff
Jitter
Rate limiting
Circuit breakers
Load shedding
```

------------------------------------------------------------------------

# 49. Circuit Breakers

A circuit breaker protects an application from repeatedly calling a
failing dependency.

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

Useful for:

``` text
Payment providers
Email providers
AI providers
External APIs
```

------------------------------------------------------------------------

# 50. Rate Limiting

Rate limiting controls request volume.

Possible dimensions:

``` text
IP
User
Tenant
API key
Endpoint
```

Algorithms include:

``` text
Token bucket
Leaky bucket
Fixed window
Sliding window
```

Use stricter limits for expensive operations.

------------------------------------------------------------------------

# 51. Backpressure

When a downstream service cannot keep up:

``` text
Producer
 ↓↓↓↓↓↓↓
Consumer
```

the system needs backpressure.

Possible strategies:

``` text
Queue
Rate limit
Reject
Batch
Scale consumers
```

Without backpressure, memory and queues can grow indefinitely.

------------------------------------------------------------------------

# 52. Request Size Limits

Limit:

``` text
Request body
File upload
Header size
Query length
JSON nesting
```

This protects against:

``` text
Memory exhaustion
Abuse
Unexpected workloads
Denial-of-service scenarios
```

Use limits appropriate to the endpoint.

------------------------------------------------------------------------

# 53. Compression

Compression can reduce bandwidth.

Common:

``` text
gzip
Brotli
```

Use compression for appropriate text responses.

Do not compress everything blindly.

Already-compressed formats such as:

``` text
JPEG
PNG
ZIP
```

usually gain little.

------------------------------------------------------------------------

# 54. HTTP Caching

HTTP supports caching through headers such as:

``` text
Cache-Control
ETag
Last-Modified
Expires
```

Example:

``` text
Cache-Control: public, max-age=3600
```

Use appropriate caching based on data sensitivity and freshness.

------------------------------------------------------------------------

# 55. ETags

An ETag identifies a particular representation.

Conceptually:

``` text
Client
 ↓
GET
 ↓
ETag: abc
```

Later:

``` text
Client
 ↓
If-None-Match: abc
 ↓
Server
 ↓
304 Not Modified
```

This reduces unnecessary response transfer.

------------------------------------------------------------------------

# 56. CDN

A CDN caches content closer to users.

``` text
User
 ↓
Nearest CDN Edge
 ↓
Origin
```

Useful for:

``` text
Images
JavaScript
CSS
Videos
Static downloads
```

Understand:

``` text
TTL
Cache key
Cache invalidation
Origin
Edge
```

------------------------------------------------------------------------

# 57. WebSockets

WebSockets provide long-lived bidirectional communication.

``` text
Client
 ↕
WebSocket
 ↕
Server
```

Useful for:

``` text
Chat
Live dashboards
Collaboration
Gaming
Real-time notifications
```

Plan for:

``` text
Reconnect
Disconnect
Authentication
Connection limits
Heartbeat
Message ordering
Duplicate messages
```

------------------------------------------------------------------------

# 58. Server-Sent Events

SSE provides server-to-client streaming over HTTP.

``` text
Client
 ←
Server
```

Useful for:

``` text
Notifications
Streaming status
AI response streaming
Live updates
```

Use WebSockets when bidirectional communication is required.

------------------------------------------------------------------------

# 59. Long Polling

Long polling keeps an HTTP request open until data becomes available or
a timeout occurs.

It is simpler than WebSockets but less efficient for some workloads.

Understand it as a fallback/legacy technique rather than the default for
all real-time systems.

------------------------------------------------------------------------

# 60. HTTP Streaming

Streaming allows data to be sent progressively.

Example:

``` text
Request
 ↓
Server
 ↓
Chunk
 ↓
Chunk
 ↓
Chunk
 ↓
Complete
```

Useful for:

``` text
AI responses
Large downloads
Progressive content
```

Handle client disconnects correctly.

------------------------------------------------------------------------

# 61. Network Failure Modes

Assume any network operation can experience:

``` text
DNS failure
Connection refused
Connection timeout
TLS failure
Connection reset
Partial response
Slow response
Proxy failure
Load balancer failure
Rate limiting
Dependency outage
```

Application code should distinguish failures where useful.

------------------------------------------------------------------------

# 62. Graceful Failure

Do not let every network failure crash the application.

Example:

``` text
Recommendation API fails
 ↓
Show default recommendations
```

instead of:

``` text
Entire homepage fails
```

Use graceful degradation for non-critical dependencies.

------------------------------------------------------------------------

# 63. Network Security

Protect internal services.

Prefer:

``` text
Internet
 ↓
Public Load Balancer
 ↓
Private Application Network
 ↓
Private Database
```

Avoid:

``` text
Internet
 ↓
Public PostgreSQL
```

unless there is a very deliberate security architecture.

------------------------------------------------------------------------

# 64. Firewall Rules

Firewall/security-group rules should follow least privilege.

Example:

``` text
Internet
 ↓
443 → Load Balancer

Application
 ↓
5432 → Database

Application
 ↓
6379 → Redis
```

Do not allow:

``` text
0.0.0.0/0
```

to every service by default.

------------------------------------------------------------------------

# 65. SSH

For production systems:

-   Prefer key-based authentication.
-   Disable password authentication where appropriate.
-   Use least privilege.
-   Restrict network access.
-   Use bastions or managed access where appropriate.
-   Keep systems patched.

Do not expose SSH unnecessarily.

------------------------------------------------------------------------

# 66. Network Debugging

Useful tools:

``` bash
ping
curl
dig
nslookup
ss
netstat
traceroute
mtr
nc
telnet
tcpdump
```

Examples:

``` bash
curl -I https://example.com
```

Check HTTP behavior.

``` bash
ss -lntp
```

Check listening TCP ports.

``` bash
dig example.com
```

Check DNS.

Use the appropriate tool for the layer you are debugging.

------------------------------------------------------------------------

# 67. curl

`curl` is one of the most useful HTTP debugging tools.

Examples:

``` bash
curl -I https://example.com
```

Headers only.

``` bash
curl -v https://example.com
```

Verbose connection information.

``` bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Arpit"}' \
  https://example.com/api/users
```

Use it to reproduce API problems outside the frontend.

------------------------------------------------------------------------

# 68. Port Debugging

If an application should listen on port 3000:

``` bash
ss -lntp | grep 3000
```

Then test:

``` bash
curl http://localhost:3000
```

If localhost works but remote access does not, investigate:

``` text
Binding address
Firewall
Security group
Reverse proxy
Load balancer
Network route
```

------------------------------------------------------------------------

# 69. Localhost vs 0.0.0.0

A server bound to:

``` text
127.0.0.1
```

may only be reachable from the same machine.

A server bound to:

``` text
0.0.0.0
```

can listen on available network interfaces.

Do not bind publicly unless the service is intended to be reachable and
appropriately protected.

------------------------------------------------------------------------

# 70. Proxy Architecture

Forward proxy:

``` text
Client
 ↓
Proxy
 ↓
Internet
```

Reverse proxy:

``` text
Internet
 ↓
Reverse Proxy
 ↓
Server
```

Understand the difference.

------------------------------------------------------------------------

# 71. Service-to-Service Networking

Internal service communication should still have:

``` text
Authentication
Authorization
Timeouts
Retries
Observability
```

Do not assume:

``` text
Internal network = trusted network
```

------------------------------------------------------------------------

# 72. API Gateway vs Reverse Proxy

A reverse proxy primarily forwards traffic.

An API gateway may additionally provide:

``` text
Authentication integration
Rate limiting
Routing
API policies
Request transformation
Analytics
```

Keep business logic outside infrastructure gateways.

------------------------------------------------------------------------

# 73. DNS-Based Service Discovery

Services may discover each other through:

``` text
DNS
Service registry
Container networking
Kubernetes Services
```

Avoid hardcoding dynamic IP addresses.

Prefer stable service names.

------------------------------------------------------------------------

# 74. Network Timeouts Across Services

For a chain:

``` text
API
 ↓ 2s
Service A
 ↓ 2s
Service B
 ↓ 2s
Service C
```

do not accidentally create a huge total timeout.

Define an overall request budget.

For example:

``` text
Total request budget = 5 seconds
```

and allocate time carefully across dependencies.

------------------------------------------------------------------------

# 75. Connection Leaks

Always release connections.

Potential leaks include:

``` text
HTTP connections
Database connections
Redis connections
WebSocket connections
File descriptors
```

Monitor connection counts.

A leak can eventually bring down an otherwise healthy application.

------------------------------------------------------------------------

# 76. File Descriptors

Linux services have finite file descriptors.

Sockets, files, and other resources consume descriptors.

If a process exhausts them:

``` text
Too many open files
```

can occur.

When debugging high-load network services, check descriptor usage.

------------------------------------------------------------------------

# 77. Network Observability

Monitor:

``` text
Request rate
Error rate
Latency
Connection count
Connection errors
Timeouts
Retries
Bandwidth
Packet loss
DNS latency
TLS errors
```

For distributed systems, propagate:

``` text
Request ID
Trace ID
```

------------------------------------------------------------------------

# 78. Latency Budget

For an API:

``` text
Total latency
=
DNS
+
TCP
+
TLS
+
Application
+
Database
+
External APIs
+
Response transfer
```

Do not assume the application code is always the bottleneck.

Measure each component where possible.

------------------------------------------------------------------------

# 79. Network Performance

Improve performance through:

``` text
Connection reuse
HTTP/2 or HTTP/3
Compression
CDN
Caching
Smaller payloads
Efficient serialization
Keep-alive
Regional placement
```

Measure before optimizing.

------------------------------------------------------------------------

# 80. API Gateway / Proxy Headers

When behind proxies, applications may receive headers such as:

``` text
X-Forwarded-For
X-Forwarded-Proto
X-Forwarded-Host
```

Configure trusted proxy behavior carefully.

Do not blindly trust client-supplied forwarding headers.

This matters for:

``` text
IP logging
HTTPS detection
Rate limiting
Redirects
Security
```

------------------------------------------------------------------------

# 81. Common Networking Anti-Patterns

Avoid:

### No Timeouts

``` text
API
 ↓
External Service
 ↓
Wait forever
```

### Retry Everything

``` text
Every error
 ↓
Retry 20 times
```

### Public Database

``` text
Internet
 ↓
PostgreSQL
```

### No Rate Limits

``` text
Unlimited expensive requests
```

### Hardcoded IPs

``` text
Service → 10.2.3.14
```

for infrastructure that changes dynamically.

### Trusting Internal Traffic

``` text
Internal network
 ↓
No authentication
```

### Huge Responses

``` text
API
 ↓
50 MB JSON
```

when pagination or streaming would be more appropriate.

### No Connection Pooling

Creating expensive connections for every request.

------------------------------------------------------------------------

# 82. HTTP / Networking Production Checklist

``` text
[ ] HTTPS enabled
[ ] TLS certificates monitored
[ ] DNS configured
[ ] Timeouts configured
[ ] Retries controlled
[ ] Exponential backoff
[ ] Jitter where appropriate
[ ] Rate limiting
[ ] Request size limits
[ ] Connection pooling
[ ] Keep-alive configured
[ ] Health checks
[ ] Load balancing
[ ] Reverse proxy configured
[ ] Internal services protected
[ ] Firewall rules reviewed
[ ] Database not publicly exposed
[ ] CORS configured
[ ] Secure cookies where applicable
[ ] HTTP caching configured
[ ] CDN configured where useful
[ ] Error responses standardized
[ ] Logging configured
[ ] Request IDs
[ ] Distributed tracing where needed
[ ] Network metrics
[ ] DNS monitoring
```

------------------------------------------------------------------------

# 83. HTTP / Networking Debugging Checklist

When an API is not working:

``` text
1. Does DNS resolve?
2. Is the host reachable?
3. Is the port open?
4. Is the service listening?
5. Is the firewall blocking it?
6. Is TLS working?
7. Is the HTTP request correct?
8. Is authentication valid?
9. Is authorization valid?
10. Is the reverse proxy working?
11. Is the load balancer healthy?
12. Is the application receiving the request?
13. Is the database reachable?
14. Is an external dependency failing?
15. Are timeouts occurring?
16. Are retries making the problem worse?
```

Work from the network layer upward.

------------------------------------------------------------------------

# 84. Final Mental Model

For every networked feature, ask:

``` text
1. What protocol is being used?
2. Who is communicating with whom?
3. How is the destination resolved?
4. Which port is used?
5. Is the connection encrypted?
6. What happens if DNS fails?
7. What happens if the connection times out?
8. What happens if the dependency is slow?
9. Should this request be retried?
10. Is the operation idempotent?
11. Is rate limiting required?
12. Can the request be cached?
13. Should the response be streamed?
14. Is the service public or private?
15. How is authentication handled?
16. How is authorization handled?
17. What happens if the dependency goes down?
18. How is the request traced?
19. What metrics show network health?
20. How can an engineer debug the failure?
```

The goal is not:

``` text
Know every networking protocol
```

The goal is:

``` text
Understand how data moves
+
Design reliable communication
+
Secure network boundaries
+
Handle failure
+
Debug problems systematically
```

That is the foundation of production-grade HTTP and networking
engineering.
