# Testing with Bruno

## Prerequisites

- Server running (`pnpm dev`)
- Logged in via browser OAuth (`/api/auth/google`)
- `connect.sid` cookie added in Bruno Cookies UI

## Suggested Request Order

1. `02 Auth Me`
2. `08 Subscription Plans`
3. `09 Subscription Checkout`
4. Complete payment in Midtrans sandbox via `redirectUrl`
5. `05 Payment Webhook Manual` (if local webhook is not public)
6. `10 Subscription Me`
7. `12 Protected Content Subscription`
8. `06 Protected Content Paid`
9. `11 Subscription Cancel` (optional)

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
