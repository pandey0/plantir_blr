# Frontend Engineering Standards

## Purpose

This document defines general rules for building maintainable, scalable,
accessible, secure, performant, and production-ready frontend
applications.

The principles are framework-agnostic, but the examples are particularly
applicable to React, Next.js, Vue, Angular, and similar modern frontend
stacks.

------------------------------------------------------------------------

# 1. Core Principle: Separation of Concerns

Keep different frontend responsibilities separate.

A typical frontend flow:

``` text
User Interaction
      ↓
UI Component
      ↓
UI State / Form State
      ↓
Action / Hook / Use Case
      ↓
API Client
      ↓
Backend
```

For larger applications:

``` text
Page / Screen
    ↓
Feature
    ↓
Components
    ↓
Hooks / State
    ↓
API / Services
    ↓
Backend
```

Do not put API calls, business rules, complex state management, and
large UI markup into one component.

------------------------------------------------------------------------

# 2. Component Architecture

Components should have clear responsibilities.

Prefer:

``` text
components/
├── Button
├── Modal
├── DataTable
├── FormField
└── Card
```

and feature-specific components:

``` text
features/
├── users/
│   ├── UserList
│   ├── UserForm
│   └── UserCard
│
└── orders/
    ├── OrderList
    ├── OrderDetails
    └── OrderForm
```

Avoid giant components such as:

``` text
Dashboard.tsx
  2000 lines
```

Split large components based on responsibility and meaningful UI
boundaries.

------------------------------------------------------------------------

# 3. Presentational vs Logic

A component should ideally focus on rendering UI.

Move complex logic into:

-   Hooks.
-   Services.
-   Utility functions.
-   State machines where appropriate.
-   Feature modules.

Instead of:

``` tsx
function Checkout() {
  // 500 lines of state
  // API calls
  // validation
  // payment logic
  // UI
}
```

prefer:

``` text
Checkout
 ├── CheckoutForm
 ├── useCheckout()
 ├── checkoutService
 └── validationSchema
```

------------------------------------------------------------------------

# 4. Pages / Routes

Pages should compose features rather than become massive implementation
files.

Example:

``` tsx
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <StatsSection />
      <RecentOrders />
      <ActivityFeed />
    </DashboardLayout>
  );
}
```

The page defines composition.

Feature components contain feature behavior.

Reusable components contain reusable UI.

------------------------------------------------------------------------

# 5. Design System

Use a consistent design system.

Define:

-   Typography.
-   Spacing.
-   Colors.
-   Border radius.
-   Shadows.
-   Breakpoints.
-   Buttons.
-   Inputs.
-   Modals.
-   Tables.
-   Cards.
-   Toasts.
-   Loading states.

Avoid arbitrary values everywhere.

Prefer:

``` text
Design Token
    ↓
Component
    ↓
Feature
```

rather than:

``` text
random padding
random font size
random colors
random border radius
```

For Tailwind-based applications, establish reusable tokens and component
conventions instead of repeatedly inventing styles.

------------------------------------------------------------------------

# 6. Reusable UI Components

Build reusable components when they have a stable abstraction.

Good candidates:

-   Button.
-   Input.
-   Select.
-   Dialog.
-   Dropdown.
-   Table.
-   Tabs.
-   Badge.
-   Card.
-   Tooltip.
-   Toast.
-   Date picker.

Do not over-generalize components prematurely.

Bad:

``` text
UniversalComponent<T, X, Y, Z, A>
```

that is harder to use than the original UI.

Reuse when the abstraction actually simplifies development.

------------------------------------------------------------------------

# 7. Feature-Based Organization

For larger applications, organize code around business features rather
than only technical types.

Instead of:

``` text
components/
hooks/
services/
utils/
pages/
```

with hundreds of unrelated files, consider:

``` text
features/
├── authentication/
├── users/
├── payments/
├── orders/
└── notifications/
```

Each feature can contain:

``` text
orders/
├── components/
├── hooks/
├── api/
├── schemas/
├── types/
├── utils/
└── index.ts
```

This keeps related code together.

------------------------------------------------------------------------

# 8. State Management

Separate types of state.

## Local UI State

Examples:

``` text
Modal open/closed
Selected tab
Dropdown state
Input value
```

Keep this close to the component.

## Server State

Examples:

``` text
Users
Orders
Products
Dashboard data
```

Use an appropriate server-state solution when necessary.

Examples include:

-   TanStack Query.
-   SWR.
-   Framework-native data fetching.

## Global Client State

Examples:

``` text
Theme
Current workspace
Shopping cart
Global UI state
```

Use a state library only when the complexity justifies it.

Do not put every piece of state into Redux/Zustand/etc.

------------------------------------------------------------------------

# 9. Server State vs Client State

Do not treat server data as ordinary local state by default.

Server state has concerns such as:

-   Caching.
-   Refetching.
-   Stale data.
-   Loading.
-   Errors.
-   Mutations.
-   Synchronization.

A dedicated server-state strategy can simplify these problems.

------------------------------------------------------------------------

# 10. API Layer

Do not scatter raw API calls throughout components.

Avoid:

``` tsx
fetch("/api/users")
```

in ten different components.

Prefer:

``` text
Component
   ↓
Hook / Action
   ↓
API Client
   ↓
Backend
```

Example:

``` ts
export const userApi = {
  getUsers: () => api.get("/users"),
  getUser: (id: string) => api.get(`/users/${id}`),
  createUser: (data: CreateUserInput) =>
    api.post("/users", data),
};
```

Centralize:

-   Base URL.
-   Headers.
-   Authentication.
-   Error normalization.
-   Request IDs where appropriate.
-   Interceptors.
-   Retry behavior where appropriate.

------------------------------------------------------------------------

# 11. API Contracts

Keep frontend/backend contracts explicit.

Define:

-   Request types.
-   Response types.
-   Error formats.
-   Enums.
-   Pagination structures.

Prefer generated or shared types when practical.

Never assume the backend response shape without verification.

------------------------------------------------------------------------

# 12. Forms

Forms should have:

-   Schema validation.
-   Clear field errors.
-   Loading state.
-   Disabled submission during processing.
-   Success feedback.
-   Server error handling.

Example:

``` text
Form
 ↓
Client validation
 ↓
Submit
 ↓
Loading
 ↓
API
 ↓
Success / Error
```

Use libraries such as React Hook Form where they meaningfully reduce
complexity.

------------------------------------------------------------------------

# 13. Validation

Validate at multiple boundaries.

Frontend validation provides:

-   Better UX.
-   Immediate feedback.
-   Reduced unnecessary requests.

But frontend validation is NOT security.

The backend must validate again.

``` text
Frontend validation
        ↓
       API
        ↓
Backend validation
```

Never rely on frontend validation for authorization or security.

------------------------------------------------------------------------

# 14. Loading States

Every asynchronous UI should have a deliberate loading strategy.

Consider:

-   Initial loading.
-   Button loading.
-   Skeleton loading.
-   Refreshing state.
-   Pagination loading.
-   Upload progress.

Avoid leaving users staring at an unchanged screen while an operation
runs.

------------------------------------------------------------------------

# 15. Error States

Design errors intentionally.

Handle:

``` text
Network failure
Unauthorized
Forbidden
Not found
Validation error
Server error
Timeout
Empty result
```

A good UI should explain:

-   What happened.
-   Whether the user can fix it.
-   What action they can take next.

Avoid:

``` text
Something went wrong
```

for every possible error.

------------------------------------------------------------------------

# 16. Empty States

Empty data is not necessarily an error.

Examples:

``` text
No projects yet.
Create your first project.
```

Provide:

-   Explanation.
-   Relevant action.
-   Helpful guidance.

Do not show a blank screen.

------------------------------------------------------------------------

# 17. Optimistic UI

For fast, reversible actions, optimistic updates can improve UX.

Example:

``` text
User clicks Like
      ↓
UI updates immediately
      ↓
API request
      ↓
Success → keep change
Failure → rollback
```

Use carefully for operations where rollback behavior is well-defined.

------------------------------------------------------------------------

# 18. Authentication UI

Authentication flows should handle:

-   Login.
-   Logout.
-   Registration.
-   Password reset.
-   Email verification.
-   Session expiration.
-   OAuth redirects.
-   Loading states.
-   Error states.

Never expose secrets or sensitive tokens unnecessarily to client-side
code.

------------------------------------------------------------------------

# 19. Authorization UI

Frontend authorization improves UX but does not provide security.

Example:

``` text
Admin
 → Show Delete button

User
 → Hide Delete button
```

But the backend must still enforce:

``` text
DELETE
 → Authentication
 → Authorization
 → Operation
```

Never trust the frontend.

------------------------------------------------------------------------

# 20. Routing

Keep routing predictable.

Use:

-   Meaningful URLs.
-   Nested routes where appropriate.
-   Route-level loading states.
-   Route-level error handling.
-   Protected routes where necessary.
-   Proper redirects.

Avoid putting business logic directly into routing code.

------------------------------------------------------------------------

# 21. URL State

Use the URL for state that should be:

-   Shareable.
-   Bookmarkable.
-   Refresh-safe.

Examples:

``` text
/search?q=react
/products?category=shoes
/dashboard?tab=analytics
/orders?page=2
```

Do not unnecessarily store navigation-related state only in memory.

------------------------------------------------------------------------

# 22. Accessibility

Accessibility is part of correctness.

Follow:

-   Semantic HTML.
-   Keyboard navigation.
-   Focus management.
-   Visible focus indicators.
-   Proper labels.
-   Accessible names.
-   ARIA only when necessary.
-   Sufficient contrast.
-   Screen-reader compatibility.

Prefer:

``` html
<button>
```

over:

``` html
<div onclick="...">
```

when the element is actually a button.

------------------------------------------------------------------------

# 23. Responsive Design

Design for multiple screen sizes.

Think in terms of:

``` text
Mobile
Tablet
Desktop
Large Desktop
```

Do not simply shrink the desktop design.

Consider:

-   Navigation.
-   Tables.
-   Forms.
-   Modals.
-   Touch targets.
-   Typography.
-   Content density.

------------------------------------------------------------------------

# 24. Performance

Performance should be measured, not guessed.

Watch:

-   Bundle size.
-   JavaScript execution.
-   Image size.
-   Font loading.
-   Network requests.
-   Rendering cost.
-   Hydration cost.
-   Layout shifts.
-   Long tasks.

Use:

-   Code splitting.
-   Lazy loading.
-   Image optimization.
-   Memoization only where useful.
-   Virtualization for large lists.
-   Caching.
-   Prefetching where appropriate.

Do not blindly add `useMemo` and `useCallback` everywhere.

------------------------------------------------------------------------

# 25. Rendering Strategy

Understand the rendering model of your framework.

For Next.js, for example, distinguish between:

``` text
Server Components
Client Components
Static Rendering
Dynamic Rendering
Streaming
```

Choose based on actual requirements.

Do not make everything a client component by default.

Use client-side JavaScript when interactivity actually requires it.

------------------------------------------------------------------------

# 26. Data Fetching

Choose data-fetching strategy based on the data.

Consider:

-   Static data.
-   Server-rendered data.
-   Client-side data.
-   Cached data.
-   Frequently changing data.
-   User-specific data.

Avoid duplicate requests.

Avoid fetching the same data independently in many nested components
when it can be composed more efficiently.

------------------------------------------------------------------------

# 27. Security

Frontend security includes:

-   XSS prevention.
-   Safe rendering of HTML.
-   Secure authentication flows.
-   CSRF considerations.
-   Content Security Policy.
-   Dependency security.
-   Secure storage decisions.
-   Avoiding secret exposure.

Never put private API keys in client-side code.

Anything shipped to the browser should be considered public.

------------------------------------------------------------------------

# 28. Environment Variables

Separate:

``` text
Public configuration
Private configuration
```

Only expose values intended for the browser.

Never put:

``` text
DATABASE_URL
PRIVATE_API_KEY
SECRET_KEY
```

into client-exposed variables.

------------------------------------------------------------------------

# 29. File Uploads

Handle uploads carefully.

Provide:

-   File type validation.
-   Size limits.
-   Progress indication.
-   Cancellation where useful.
-   Upload errors.
-   Retry behavior where appropriate.
-   Preview only when safe.

Prefer direct-to-object-storage uploads for large files when
appropriate.

------------------------------------------------------------------------

# 30. Notifications

Standardize feedback mechanisms.

Use consistent patterns for:

``` text
Success
Warning
Error
Info
```

Avoid random `alert()` calls throughout the application.

A centralized notification/toast system provides a consistent UX.

------------------------------------------------------------------------

# 31. Modals and Dialogs

Use dialogs intentionally.

Handle:

-   Focus trapping.
-   Escape key.
-   Keyboard navigation.
-   Scroll behavior.
-   Loading state.
-   Destructive-action confirmation.

Do not use modals for every interaction.

------------------------------------------------------------------------

# 32. Tables and Large Lists

For large datasets:

-   Paginate.
-   Virtualize where necessary.
-   Avoid rendering thousands of DOM nodes.
-   Provide loading states.
-   Provide empty states.
-   Provide error states.
-   Support sorting/filtering when needed.

Prefer server-side pagination for genuinely large datasets.

------------------------------------------------------------------------

# 33. Frontend Architecture for SaaS

A useful structure:

``` text
src/
├── app/
│   ├── routes/
│   ├── layouts/
│   └── providers/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── billing/
│   ├── dashboard/
│   └── settings/
│
├── lib/
│   ├── api/
│   ├── auth/
│   └── config/
│
├── hooks/
├── stores/
├── types/
└── utils/
```

For very large applications, prefer feature ownership over a huge global
`components` folder.

------------------------------------------------------------------------

# 34. Dependency Management

Avoid adding libraries unnecessarily.

Before adding a dependency ask:

1.  Can the platform already do this?
2.  Is the problem common enough to justify a dependency?
3.  Is the dependency maintained?
4.  What is its bundle impact?
5.  Does it introduce security risk?
6.  Can the team understand and maintain it?

Keep dependencies updated and remove unused ones.

------------------------------------------------------------------------

# 35. Type Safety

Use strong typing where the framework supports it.

Avoid excessive:

``` ts
any
```

Prefer:

``` ts
unknown
```

when data is genuinely unknown, then validate/narrow it.

Keep API types synchronized with backend contracts.

Types should improve correctness, not become an enormous layer of
duplicated boilerplate.

------------------------------------------------------------------------

# 36. Error Boundaries

Use error boundaries or framework-equivalent mechanisms around
appropriate UI sections.

A failure in one part of the application should not necessarily destroy
the entire application.

For example:

``` text
Dashboard
├── Analytics  ← fails
├── Orders     ← still works
└── Activity   ← still works
```

Provide recovery actions where appropriate.

------------------------------------------------------------------------

# 37. Analytics

Analytics should not contaminate business components.

Prefer:

``` text
Component
   ↓
Analytics abstraction
   ↓
Analytics provider
```

Track meaningful events:

``` text
signup_completed
checkout_started
payment_completed
feature_used
```

Avoid uncontrolled event naming across the application.

------------------------------------------------------------------------

# 38. Testing

Use multiple levels.

``` text
Unit
 ↓
Component
 ↓
Integration
 ↓
E2E
```

### Unit

Test pure functions and important logic.

### Component

Test meaningful component behavior.

### Integration

Test feature interactions and API integration.

### E2E

Test critical user journeys:

``` text
Login
 ↓
Create project
 ↓
Invite user
 ↓
Submit form
 ↓
Verify result
```

Test behavior rather than implementation details.

------------------------------------------------------------------------

# 39. Visual Testing

For important design systems or complex applications, consider:

-   Screenshot testing.
-   Visual regression testing.
-   Cross-browser testing.
-   Responsive testing.

Especially useful after major UI changes.

------------------------------------------------------------------------

# 40. Code Quality

Prefer:

-   Small components.
-   Clear names.
-   Predictable props.
-   Minimal side effects.
-   Strong typing.
-   Consistent patterns.
-   Composition over duplication.
-   Feature ownership.

Avoid:

-   Giant components.
-   Excessive prop drilling.
-   Global state for everything.
-   Duplicate API logic.
-   Duplicate validation.
-   Random styling conventions.
-   Unnecessary abstractions.

------------------------------------------------------------------------

# 41. Git / Collaboration

Use clear commits.

Example:

``` text
feat: add interview scheduling
fix: handle expired session
refactor: extract order form
test: add checkout flow
```

Keep pull requests focused.

Avoid combining:

``` text
Feature
+
Complete redesign
+
Dependency upgrade
+
Random refactoring
```

into one PR unless necessary.

------------------------------------------------------------------------

# 42. Production Checklist

Before shipping a feature:

``` text
[ ] Responsive
[ ] Accessible
[ ] Loading state
[ ] Error state
[ ] Empty state
[ ] Success state
[ ] Form validation
[ ] Server validation
[ ] Authorization handled by backend
[ ] API errors handled
[ ] Network failure handled
[ ] Performance checked
[ ] Images optimized
[ ] No secrets exposed
[ ] No unnecessary client-side JavaScript
[ ] Analytics added if required
[ ] Tests added
[ ] Browser tested
```

------------------------------------------------------------------------

# 43. Golden Rules

1.  Keep components focused.
2.  Separate UI from complex business/application logic.
3.  Keep API calls out of random components.
4.  Centralize API communication.
5.  Separate server state from local UI state.
6.  Validate user input.
7.  Never trust frontend validation for security.
8.  Keep authorization on the backend.
9.  Design loading, error, and empty states intentionally.
10. Build accessibility into components from the beginning.
11. Make responsive behavior intentional.
12. Optimize based on measurements.
13. Do not make everything global state.
14. Do not make everything a client component.
15. Do not overuse memoization.
16. Avoid giant components.
17. Avoid premature abstractions.
18. Keep feature-related code together.
19. Keep public and private configuration separate.
20. Treat everything shipped to the browser as potentially public.

------------------------------------------------------------------------

# 44. Final Mental Model

When building any frontend feature, ask:

``` text
1. What does the user need to do?
2. What component owns the interaction?
3. Is this local state or server state?
4. Where should the API call live?
5. What validation is required?
6. What happens while loading?
7. What happens if it fails?
8. What happens when there is no data?
9. Is the UI accessible?
10. Is it responsive?
11. Is authorization enforced by the backend?
12. Does this add unnecessary client-side JavaScript?
13. Does this need caching or optimistic updates?
14. How will it perform with real data?
15. How will it be tested?
16. Can another developer understand the feature six months later?
```

The goal is not to use every frontend pattern.

The goal is to create a frontend where:

``` text
UI is predictable
      +
State is controlled
      +
API boundaries are clear
      +
Components are reusable
      +
Features are modular
      +
Accessibility is built in
      +
Performance is measured
      +
Errors are handled
      +
Security boundaries are respected
      +
The code remains maintainable
```

That is the foundation of production-grade frontend engineering.
