# System Overview

## Core Modules

- Authentication: Google OAuth (Passport session)
- Payments: Midtrans Snap checkout + Core API status verification
- Subscription: Monthly/Yearly plans with hybrid billing mode
- Access control: Separate gates for paid user and subscription user

## Main Data Models

- User
  - Basic profile from Google OAuth
  - Compatibility flag: `isPaid`
- Plan
  - `monthly` and `yearly`
  - Price + interval metadata
- Subscription
  - Lifecycle status (`pending`, `active`, `past_due`, `canceled`, `expired`)
  - Billing mode (`auto_charge` or `manual`)
  - Period windows (`currentPeriodStart`, `currentPeriodEnd`, `nextBillingAt`)
- Transaction
  - Midtrans order/payment record
  - Optional relation to a subscription

## Endpoint Groups

- `/api/auth/*`
  - Google login, callback, current user, logout
- `/api/payment/*`
  - One-time transaction create/status + webhook processing
- `/api/subscription/*`
  - Plans, checkout, subscription status, cancel
  - Dev simulation endpoints for local testing
- `/api/protected-content-paid`
  - Access requires `isPaid = true`
- `/api/protected-content-subscription`
  - Access requires active and valid subscription period
