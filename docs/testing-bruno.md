# Testing with Bruno

## Prerequisites

- Server running (`pnpm dev`)
- Logged in via browser OAuth (`/api/auth/google`)
- `connect.sid` cookie added in Bruno Cookies UI

## Suggested Request Order

1. `00 FX Rate Healthcheck` (validate FX token and IDR rate endpoint)
2. `02 Auth Me`
3. `08 Subscription Plans`
4. Set Bruno vars:
   - `planCode`: weekly/monthly/quarterly/yearly
   - `paymentMethod`: a channel available in your Midtrans account
5. Run one of:
   - `09 Subscription Checkout (No Add-on)` for base pricing
   - `09b Subscription Checkout (With Speed Up)` for monthly-based plans
6. Complete payment in Midtrans sandbox via `redirectUrl`
7. `05 Payment Webhook Manual` (if local webhook is not public)
8. `10 Subscription Me`
9. `12 Protected Content Subscription`
10. `06 Protected Content Paid`
11. `11 Subscription Cancel` (optional)

## Simulation Scenarios

### A) Make Due

1. `13 Dev Subscription Make Due`
2. `10 Subscription Me`
3. `12 Protected Content Subscription` (expect denied until renewed)

### B) Make Expired

1. `14 Dev Subscription Make Expired`
2. `10 Subscription Me`
3. `12 Protected Content Subscription` (expect denied)

### C) Reset Active

1. `15 Dev Subscription Reset Active`
2. `10 Subscription Me`
3. `12 Protected Content Subscription` (expect allowed)
