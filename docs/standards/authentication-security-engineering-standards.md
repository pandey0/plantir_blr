# Authentication & Security Engineering Standards

## Purpose

This document defines general standards for designing secure
authentication, authorization, APIs, sessions, secrets, user data, and
application security.

Security is not a single feature. It is a property of the entire system:

``` text
Frontend
   ↓
API
   ↓
Authentication
   ↓
Authorization
   ↓
Business Logic
   ↓
Database
   ↓
Infrastructure
```

The goal is to build systems that are:

``` text
Confidential
+
Authentic
+
Authorized
+
Resistant to abuse
+
Auditable
+
Recoverable
```

------------------------------------------------------------------------

# 1. Core Security Principles

Follow these principles throughout the application.

### Never trust the client

Anything coming from:

-   Browser
-   Mobile app
-   API client
-   Query parameters
-   Request body
-   Headers
-   Cookies
-   Uploaded files

must be treated as untrusted input.

### Least privilege

Give users, services, database roles, and API keys only the permissions
they need.

### Defense in depth

Do not depend on one security mechanism.

Use multiple layers:

``` text
Authentication
+
Authorization
+
Validation
+
Database constraints
+
Rate limiting
+
Monitoring
+
Secure infrastructure
```

### Fail securely

When something goes wrong, default to denying access rather than
granting it.

### Secure by default

New features should be secure without requiring developers to remember
extra security steps.

------------------------------------------------------------------------

# 2. Authentication vs Authorization

These are different concepts.

### Authentication

Answers:

> Who are you?

Examples:

``` text
Password
OAuth
Passkey
Session
JWT
API Key
```

### Authorization

Answers:

> What are you allowed to do?

Examples:

``` text
Role
Permission
Resource ownership
Tenant membership
```

Flow:

``` text
Request
 ↓
Authentication
 ↓
Authorization
 ↓
Business Operation
```

Never confuse authentication with authorization.

------------------------------------------------------------------------

# 3. Authentication Architecture

A typical application:

``` text
Client
  ↓
Login
  ↓
Authentication Service
  ↓
Identity Verification
  ↓
Session / Token
  ↓
Authenticated Request
  ↓
Authorization
```

Keep authentication logic centralized.

Do not implement slightly different authentication behavior in every
feature.

------------------------------------------------------------------------

# 4. Password Security

If passwords are supported:

### Never store plaintext passwords.

Never:

``` text
password = "hello123"
```

and never encrypt passwords for later recovery.

Use a dedicated password hashing algorithm such as:

``` text
Argon2id
bcrypt
scrypt
```

Passwords should be:

``` text
Password
   ↓
Password Hashing Algorithm
   ↓
Stored Password Hash
```

During login:

``` text
Password
   ↓
Verify against stored hash
   ↓
Success / Failure
```

Do not implement your own password hashing algorithm.

------------------------------------------------------------------------

# 5. Password Policies

Avoid arbitrary complexity rules that create poor usability without
meaningful security benefits.

Require:

-   Reasonable minimum length.
-   Protection against common/breached passwords where appropriate.
-   Secure password reset.
-   Rate limiting.
-   Secure recovery mechanisms.

Do not log passwords.

Do not send passwords through email.

------------------------------------------------------------------------

# 6. Password Reset

Password reset is an authentication flow and must be treated as highly
sensitive.

Typical flow:

``` text
User requests reset
       ↓
Generate secure random token
       ↓
Store hashed/expiring token
       ↓
Send reset link
       ↓
User submits new password
       ↓
Verify token
       ↓
Change password
       ↓
Invalidate relevant sessions
```

Rules:

-   Tokens must be unpredictable.
-   Tokens should expire.
-   Tokens should be single-use.
-   Avoid revealing whether an email exists.
-   Do not put sensitive information in the reset URL unnecessarily.
-   Invalidate old sessions when appropriate.

------------------------------------------------------------------------

# 7. Email Verification

When email ownership matters:

``` text
Registration
 ↓
Verification token
 ↓
Email
 ↓
User clicks link
 ↓
Verify account
```

Verification tokens should:

-   Be random.
-   Expire.
-   Be single-use.
-   Be stored securely.

Do not trust a client-side `emailVerified=true` field.

------------------------------------------------------------------------

# 8. Sessions

Session-based authentication is often a strong choice for traditional
web applications.

Typical flow:

``` text
Login
 ↓
Server creates session
 ↓
Session ID
 ↓
Secure Cookie
 ↓
Browser sends cookie
 ↓
Server validates session
```

Session identifiers must be:

-   Random.
-   Unpredictable.
-   Expiring where appropriate.
-   Revocable.

Never put sensitive session data directly into a client-controlled
cookie unless it is properly protected and integrity-checked.

------------------------------------------------------------------------

# 9. Secure Cookies

For authentication cookies, generally consider:

``` text
HttpOnly
Secure
SameSite
```

### HttpOnly

Prevents normal JavaScript access to the cookie.

### Secure

Only sends the cookie over HTTPS.

### SameSite

Helps control cross-site cookie behavior.

Cookie configuration should match the application's authentication and
deployment architecture.

------------------------------------------------------------------------

# 10. JWT

JWTs are useful, but they are not automatically more secure than
sessions.

Understand:

-   Header.
-   Payload.
-   Signature.
-   Expiration.
-   Issuer.
-   Audience.
-   Signing algorithms.
-   Key rotation.

Never trust JWT claims simply because they exist.

Validate:

``` text
Signature
Expiration
Issuer
Audience
Required claims
```

Do not put secrets into JWT payloads.

JWT payloads are generally readable by whoever possesses the token.

------------------------------------------------------------------------

# 11. Access Tokens

Access tokens should have limited scope and lifetime where practical.

A common architecture:

``` text
Short-lived Access Token
+
Longer-lived Refresh Token
```

Protect refresh tokens carefully.

Never expose tokens unnecessarily to third-party scripts.

------------------------------------------------------------------------

# 12. Refresh Tokens

Refresh tokens are powerful credentials.

Rules:

-   Store securely.
-   Rotate when appropriate.
-   Detect reuse where appropriate.
-   Revoke on logout/security events.
-   Keep them out of logs.
-   Do not expose them unnecessarily.

A stolen refresh token can be significantly more dangerous than a
short-lived access token.

------------------------------------------------------------------------

# 13. OAuth 2.0

OAuth is primarily an authorization framework.

Common flow:

``` text
Application
    ↓
Authorization Server
    ↓
User Login / Consent
    ↓
Authorization Code
    ↓
Application
    ↓
Token
```

For browser/mobile public clients, understand:

``` text
Authorization Code Flow
+
PKCE
```

Do not implement OAuth by copying random snippets without understanding:

-   Redirect URIs.
-   State.
-   PKCE.
-   Client identity.
-   Scopes.
-   Token handling.

------------------------------------------------------------------------

# 14. OpenID Connect

OIDC adds authentication on top of OAuth 2.0.

Use OIDC when you need identity information from an identity provider.

Understand:

``` text
OAuth
→ Authorization

OIDC
→ Authentication / Identity
```

Common identity providers include:

-   Google
-   Microsoft
-   GitHub
-   Auth0
-   Okta
-   Keycloak

The exact provider does not change the underlying security principles.

------------------------------------------------------------------------

# 15. Redirect URI Security

OAuth redirect URIs must be tightly controlled.

Avoid broad patterns such as:

``` text
https://example.com/*
```

Prefer exact approved callback URLs.

Validate redirect destinations to prevent authorization-code/token
leakage.

------------------------------------------------------------------------

# 16. CSRF

CSRF = Cross-Site Request Forgery.

It is especially relevant when authentication relies on browser cookies.

A malicious site may attempt:

``` text
Victim Browser
     ↓
Malicious Website
     ↓
Your Application
```

Defenses can include:

-   SameSite cookies.
-   CSRF tokens.
-   Origin/Referer checks where appropriate.
-   Proper request design.

Do not assume CORS alone prevents CSRF.

------------------------------------------------------------------------

# 17. CORS

CORS controls which browser origins can make certain cross-origin
requests.

Do not use:

``` text
Access-Control-Allow-Origin: *
```

for sensitive authenticated APIs unless the architecture explicitly
requires it.

Use an explicit allowlist where appropriate:

``` text
https://app.example.com
```

CORS is a browser security mechanism, not an authentication system.

------------------------------------------------------------------------

# 18. XSS

XSS = Cross-Site Scripting.

Never blindly render untrusted HTML.

Avoid unsafe patterns such as:

``` text
dangerouslySetInnerHTML
```

unless the content has been properly sanitized and the use case requires
it.

Defenses:

-   Output encoding.
-   Safe templating.
-   HTML sanitization.
-   Content Security Policy.
-   Avoid unnecessary raw HTML rendering.

Remember:

> User-generated content is untrusted.

------------------------------------------------------------------------

# 19. SQL Injection

Never construct SQL from untrusted strings.

Bad:

``` ts
`SELECT * FROM users WHERE email = '${email}'`
```

Use:

``` text
Parameterized queries
Prepared statements
Safe ORM APIs
```

ORMs help but do not make developers immune to SQL injection, especially
when using raw SQL.

------------------------------------------------------------------------

# 20. NoSQL Injection

NoSQL databases can also be vulnerable to injection through malicious
query structures.

Validate input types and query objects.

Do not directly pass arbitrary client JSON into database filters.

Bad:

``` text
database.find(req.body)
```

Prefer explicit query construction.

------------------------------------------------------------------------

# 21. SSRF

SSRF = Server-Side Request Forgery.

It occurs when attackers can make your server request unintended
destinations.

Dangerous pattern:

``` text
POST /fetch
{
  "url": "http://internal-service"
}
```

Defenses:

-   Allowlist permitted destinations.
-   Validate URLs.
-   Restrict protocols.
-   Block internal/private network ranges where appropriate.
-   Disable unnecessary redirects.
-   Restrict outbound network access.

Be especially careful with:

-   URL preview systems.
-   Webhooks.
-   Image fetchers.
-   PDF generators.
-   Import tools.

------------------------------------------------------------------------

# 22. File Upload Security

Treat every uploaded file as hostile.

Validate:

-   File size.
-   MIME type.
-   Extension.
-   File signature/content where necessary.
-   Filename.
-   Storage location.

Prefer:

``` text
Upload
 ↓
Object Storage
 ↓
Validation / Scanning
 ↓
Processing
```

Do not execute uploaded files.

Do not trust the filename or MIME type supplied by the client.

------------------------------------------------------------------------

# 23. Path Traversal

Never allow user-controlled paths to directly determine filesystem
locations.

Dangerous concept:

``` text
../../etc/passwd
```

Use:

-   Safe path handling.
-   Allowlisted directories.
-   Generated filenames.
-   Object storage keys.
-   Canonicalization.

------------------------------------------------------------------------

# 24. API Authorization

Every sensitive endpoint should answer:

``` text
Who is calling?
What are they allowed to access?
What resource are they trying to access?
```

Example:

``` text
GET /projects/123
```

Do not only check:

``` text
User is logged in
```

Also check:

``` text
User belongs to organization
AND
User has permission
AND
Project belongs to organization
```

------------------------------------------------------------------------

# 25. IDOR / BOLA

A common authorization vulnerability:

``` text
GET /users/123
```

Attacker changes:

``` text
123 → 124
```

and accesses another user's data.

Never assume possession of an ID means permission.

Always perform resource-level authorization.

------------------------------------------------------------------------

# 26. RBAC

RBAC = Role-Based Access Control.

Example:

``` text
Admin
Manager
Panelist
Candidate
```

But do not stop at:

``` text
if role === "admin"
```

when resource-level rules are required.

Authorization can depend on:

``` text
Role
+
Organization
+
Resource ownership
+
Resource state
+
Action
```

------------------------------------------------------------------------

# 27. Permission-Based Authorization

For larger systems, define explicit permissions.

Example:

``` text
project.read
project.create
project.update
project.delete
billing.manage
user.invite
```

Then:

``` text
Role
 ↓
Permissions
 ↓
Authorization
```

This scales better than hundreds of hardcoded role checks.

------------------------------------------------------------------------

# 28. Multi-Tenant Security

For SaaS applications:

``` text
Request
 ↓
Authenticated User
 ↓
Tenant
 ↓
Permission
 ↓
Resource
```

Every database query must respect tenant boundaries.

Never trust:

``` text
organizationId
```

sent by the browser.

Derive tenant context from trusted authentication/session information
and verify resource ownership.

------------------------------------------------------------------------

# 29. Rate Limiting

Rate-limit sensitive operations.

Examples:

``` text
Login
Password reset
OTP
Signup
Search
File uploads
Expensive AI endpoints
Public APIs
```

Use different limits for different operations.

Consider:

``` text
IP
+
User
+
API key
+
Tenant
```

Do not use a single global limit for everything.

------------------------------------------------------------------------

# 30. Brute Force Protection

Authentication endpoints need protection against repeated attempts.

Possible controls:

-   Rate limiting.
-   Progressive delays.
-   Account protection.
-   CAPTCHA/risk controls where appropriate.
-   Monitoring.
-   Credential breach detection.

Avoid permanently locking accounts based only on a few failed attempts
if that creates an easy denial-of-service attack.

------------------------------------------------------------------------

# 31. API Keys

API keys should:

-   Be random.
-   Be scoped.
-   Have expiration/rotation where appropriate.
-   Be revocable.
-   Never be hardcoded.
-   Never be logged.
-   Be stored hashed where practical.

Prefer:

``` text
API Key
 ↓
Scope
 ↓
Rate Limit
 ↓
Authorization
```

over a single unrestricted master key.

------------------------------------------------------------------------

# 32. Secrets Management

Secrets include:

``` text
Database passwords
JWT secrets
OAuth secrets
API keys
Encryption keys
Cloud credentials
```

Never commit secrets to Git.

Avoid putting private secrets into frontend-exposed environment
variables.

Use a secrets manager or secure environment configuration.

------------------------------------------------------------------------

# 33. Secret Rotation

Assume secrets eventually need to be rotated.

Design for:

``` text
Old key
+
New key
```

during a controlled transition where necessary.

Rotate:

-   API keys.
-   OAuth secrets.
-   Signing keys.
-   Database credentials.
-   Encryption keys where appropriate.

------------------------------------------------------------------------

# 34. Encryption

Understand the difference.

### Hashing

One-way transformation.

Used for:

``` text
Passwords
```

### Encryption

Reversible with a key.

Used for:

``` text
Sensitive data
```

### Encoding

Not security.

Examples:

``` text
Base64
URL encoding
```

Encoding does not protect secrets.

------------------------------------------------------------------------

# 35. Encryption at Rest and in Transit

### In transit

Use HTTPS/TLS.

``` text
Client
 ↓ TLS
Server
```

### At rest

Protect stored sensitive data through appropriate:

-   Database encryption.
-   Disk encryption.
-   Object storage encryption.
-   Backup encryption.

Encryption does not replace authorization.

------------------------------------------------------------------------

# 36. Security Headers

Consider appropriate headers such as:

``` text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

Configure based on the actual application.

Do not blindly copy headers without understanding their effect.

------------------------------------------------------------------------

# 37. Content Security Policy

CSP can reduce the impact of XSS.

A policy controls where the browser can load or execute resources.

Start with a realistic policy and tighten it over time.

Avoid casually allowing:

``` text
unsafe-inline
*
```

unless required and understood.

------------------------------------------------------------------------

# 38. Dependency Security

Third-party packages are part of your attack surface.

Practice:

-   Keep dependencies updated.
-   Remove unused packages.
-   Review security advisories.
-   Lock dependency versions.
-   Use automated vulnerability scanning.
-   Review suspicious package changes.

Do not install a package just because it has many downloads.

------------------------------------------------------------------------

# 39. Supply Chain Security

Protect the software supply chain.

Consider:

-   Dependency lockfiles.
-   Trusted registries.
-   Package verification.
-   CI security.
-   Secret scanning.
-   Dependency scanning.
-   Minimal build permissions.
-   Protected branches.

Treat CI/CD credentials as production secrets.

------------------------------------------------------------------------

# 40. Logging Security

Logs can accidentally become a data leak.

Never log:

``` text
Passwords
Access tokens
Refresh tokens
API keys
Session secrets
Private encryption keys
```

Be careful with:

``` text
Email
Phone
Addresses
Payment information
Personal identifiers
```

Use redaction where appropriate.

------------------------------------------------------------------------

# 41. Security Monitoring

Monitor security-relevant events:

``` text
Repeated login failures
Password changes
MFA changes
Permission changes
New API keys
Suspicious access
Unusual downloads
Admin actions
```

For important systems, maintain an audit trail.

------------------------------------------------------------------------

# 42. Audit Logs

Audit logs should answer:

``` text
Who?
What?
When?
Which resource?
What changed?
```

Example:

``` text
User 123
changed
Project 456
from private → public
at 2026-08-09 20:00
```

Audit logs should be protected from ordinary users modifying their own
history.

------------------------------------------------------------------------

# 43. Webhooks

Treat incoming webhooks as untrusted.

Verify:

-   Signature.
-   Timestamp where applicable.
-   Event type.
-   Payload structure.
-   Idempotency.

Flow:

``` text
Webhook
 ↓
Verify signature
 ↓
Validate payload
 ↓
Check event
 ↓
Process idempotently
```

Never trust:

``` text
"paymentStatus": "paid"
```

just because it came in an HTTP request.

------------------------------------------------------------------------

# 44. Webhook Replay Protection

Attackers or network retries may resend valid webhook requests.

Use:

``` text
Event ID
+
Signature
+
Timestamp
+
Idempotency
```

Store processed event IDs where appropriate.

------------------------------------------------------------------------

# 45. Payments

Payment flows deserve extra security.

Never trust the browser for:

``` text
Price
Amount
Payment status
Order ownership
```

The server should determine authoritative values.

Typical flow:

``` text
Client
 ↓
Server calculates amount
 ↓
Payment Provider
 ↓
Webhook
 ↓
Verify webhook
 ↓
Update order
```

Do not mark an order as paid solely because the frontend says payment
succeeded.

------------------------------------------------------------------------

# 46. Sensitive Operations

Require stronger controls for high-impact operations.

Examples:

``` text
Change password
Change email
Delete account
Change payment method
Generate API key
Grant admin role
Export sensitive data
```

Depending on risk, require:

-   Recent authentication.
-   MFA.
-   Confirmation.
-   Re-authentication.
-   Additional authorization.

------------------------------------------------------------------------

# 47. MFA

Multi-factor authentication adds an additional authentication factor.

Examples:

``` text
Password
+
Authenticator app
```

or:

``` text
Passkey
```

Prefer phishing-resistant authentication methods where practical.

Understand:

-   TOTP.
-   Recovery codes.
-   Passkeys/WebAuthn.
-   MFA enrollment.
-   MFA recovery.

------------------------------------------------------------------------

# 48. Passkeys / WebAuthn

Passkeys are a modern authentication mechanism based on public-key
cryptography.

Conceptually:

``` text
Device
 ↓
Private Key
```

and:

``` text
Server
 ↓
Public Key
```

The private key does not need to be sent to the server.

Understand passkeys as an important modern authentication option rather
than assuming passwords are always necessary.

------------------------------------------------------------------------

# 49. Session Revocation

Provide ways to invalidate sessions.

Examples:

``` text
Logout
Password change
Account compromise
Admin revocation
Refresh token reuse
```

For sensitive systems, consider a session management UI:

``` text
Current device
Chrome / Linux

Other sessions
Phone
Laptop
```

Allow users/admins to revoke sessions where appropriate.

------------------------------------------------------------------------

# 50. Secure Logout

Logout should invalidate the relevant authentication mechanism.

Depending on architecture:

``` text
Delete session
Revoke refresh token
Clear cookie
Invalidate token family
```

Do not assume:

``` text
redirect to /login
```

is equivalent to logout.

------------------------------------------------------------------------

# 51. Error Messages

Avoid revealing unnecessary information.

Bad:

``` text
Email arpit@example.com exists in database
```

during password reset.

Prefer a response that does not disclose account existence where
enumeration matters.

At the same time, do not make every error meaningless. Give users enough
information to recover safely.

------------------------------------------------------------------------

# 52. Account Enumeration

Attackers can use differences in:

``` text
Response text
Status codes
Timing
```

to determine whether accounts exist.

Consider consistent behavior for:

-   Login.
-   Password reset.
-   Signup.
-   Invitation.

------------------------------------------------------------------------

# 53. Security Testing

Security testing should include:

``` text
Authentication tests
Authorization tests
Input validation tests
API security tests
Dependency scanning
SAST
DAST
Penetration testing
```

Test especially:

``` text
Can User A access User B's resource?
Can a normal user perform admin actions?
Can an unauthenticated user call protected endpoints?
Can a modified request bypass frontend restrictions?
```

------------------------------------------------------------------------

# 54. Threat Modeling

Before implementing sensitive functionality, ask:

``` text
What are we protecting?
Who are the attackers?
What can they control?
What happens if they succeed?
Where are the trust boundaries?
```

A simple model:

``` text
Asset
 ↓
Threat
 ↓
Attack Surface
 ↓
Control
 ↓
Residual Risk
```

For important features, document major threats before implementation.

------------------------------------------------------------------------

# 55. Trust Boundaries

Identify where trust changes.

Example:

``` text
Browser
   ↓
PUBLIC / UNTRUSTED
   ↓
API
   ↓
AUTHENTICATED
   ↓
Service
   ↓
DATABASE
   ↓
TRUSTED INFRASTRUCTURE
```

Every boundary should validate and authorize appropriately.

------------------------------------------------------------------------

# 56. Security in Frontend Applications

Remember:

``` text
Anything in browser JavaScript
→ potentially visible to the user.
```

Never ship:

``` text
DATABASE_PASSWORD
PRIVATE_API_KEY
SERVER_SECRET
```

to the browser.

Frontend authorization is UX.

Backend authorization is security.

------------------------------------------------------------------------

# 57. Security in Backend Applications

Every protected operation should have:

``` text
Authentication
+
Authorization
+
Input Validation
+
Business Rule Validation
+
Safe Database Access
```

Do not assume an earlier layer guarantees everything.

------------------------------------------------------------------------

# 58. Security in Database Access

Use:

-   Least privilege.
-   Parameterized queries.
-   Restricted network access.
-   Encrypted connections.
-   Separate credentials.
-   Auditing where required.
-   Encrypted backups.

Avoid production applications connecting as database superusers.

------------------------------------------------------------------------

# 59. Incident Response

Have a plan for:

``` text
Secret leaked
Account compromised
Database exposed
Dependency vulnerability
Suspicious traffic
Data breach
```

Know:

1.  How to revoke credentials.
2.  How to rotate secrets.
3.  How to identify affected users.
4.  How to inspect logs.
5.  How to restore systems.
6.  How to communicate the incident.
7.  How to prevent recurrence.

Security is also about recovery.

------------------------------------------------------------------------

# 60. Security Checklist Before Production

``` text
[ ] HTTPS enabled
[ ] Authentication implemented correctly
[ ] Authorization enforced server-side
[ ] Resource-level access checks
[ ] Passwords securely hashed
[ ] Password reset secured
[ ] Sessions protected
[ ] Cookies configured securely
[ ] OAuth redirect URIs restricted
[ ] PKCE used where appropriate
[ ] CSRF protections considered
[ ] CORS configured intentionally
[ ] Input validation implemented
[ ] SQL injection prevented
[ ] XSS protections implemented
[ ] SSRF protections considered
[ ] File uploads restricted
[ ] Rate limiting enabled
[ ] Brute-force protection
[ ] Secrets not committed
[ ] Secrets not exposed to frontend
[ ] Security headers configured
[ ] Dependencies scanned
[ ] Webhooks verified
[ ] Payment status verified server-side
[ ] Audit logging for critical actions
[ ] Sensitive logs redacted
[ ] Database least privilege
[ ] Backups configured
[ ] Backup restoration tested
[ ] Security monitoring configured
[ ] Incident response plan exists
```

------------------------------------------------------------------------

# 61. Golden Rules

1.  Never trust the client.
2.  Authentication and authorization are different.
3.  Always enforce authorization on the server.
4.  Use least privilege.
5.  Never store plaintext passwords.
6.  Never invent your own cryptography.
7.  Never commit secrets.
8.  Never expose server secrets to the browser.
9.  Use secure cookies for session-based authentication.
10. Validate tokens properly.
11. Use PKCE for appropriate OAuth public-client flows.
12. Restrict OAuth redirect URIs.
13. Protect cookie-based authentication against CSRF.
14. Configure CORS intentionally.
15. Prevent SQL and NoSQL injection.
16. Treat uploaded files as untrusted.
17. Protect against SSRF when the server fetches URLs.
18. Protect sensitive endpoints with rate limiting.
19. Make webhook processing idempotent.
20. Never trust payment status from the frontend.
21. Protect APIs at the resource level.
22. Isolate tenants.
23. Redact secrets from logs.
24. Keep dependencies secure.
25. Use security headers appropriately.
26. Monitor security-sensitive events.
27. Test authorization boundaries.
28. Design for secret rotation.
29. Have backups and an incident recovery plan.
30. Prefer secure defaults over developer discipline.

------------------------------------------------------------------------

# 62. Final Security Mental Model

For every sensitive feature, ask:

``` text
1. What am I protecting?
2. Who is the user?
3. How was identity verified?
4. What is this user allowed to do?
5. Which resource are they accessing?
6. Can the client manipulate IDs or permissions?
7. What input can an attacker control?
8. Can this operation be abused repeatedly?
9. Can the request be replayed?
10. Can the operation be performed twice?
11. Are secrets exposed anywhere?
12. What happens if an external service is compromised?
13. What happens if the database is compromised?
14. What gets logged?
15. Can an attacker enumerate users/resources?
16. How do we detect suspicious activity?
17. How do we revoke access?
18. How do we recover after compromise?
```

The goal is not to make the system impossible to attack.

The goal is to make it:

``` text
Difficult to attack
+
Difficult to abuse
+
Difficult to escalate
+
Easy to monitor
+
Easy to revoke
+
Recoverable when something goes wrong
```

That is the foundation of production-grade authentication and
application security.
