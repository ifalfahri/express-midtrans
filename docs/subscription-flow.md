# Subscription Flow

## Billing Strategy

- Hybrid mode:
  - `auto_charge` for recurring-capable channels (e.g. credit card, gopay)
  - `manual` fallback for other channels (qris, VA, etc)
- Source pricing is defined in USD, while Midtrans charge is sent in IDR.
- FX policy: lock USD->IDR rate at checkout per transaction.

## Plan Pricing (USD)

- weekly: `799 USD / week`
- monthly: `2699 USD / month`
- quarterly: `2429 USD / month`, charged upfront for 3 months
- yearly: `2294 USD / month`, charged upfront for 12 months
- optional add-on: `speed_up` = `799 USD / month` for monthly-based plans

## Checkout Flow

1. Client fetches plans from `/api/subscription/plans`.
2. Client calls `/api/subscription/checkout` with `planCode`, `paymentMethod`, and optional `addons`.
3. Backend creates/updates subscription in `pending`.
4. Backend calculates cycle USD total (plan + optional add-ons).
5. Backend fetches FX USD->IDR rate and locks it on transaction.
6. Backend creates transaction linked to subscription and stores USD/IDR breakdown.
7. Backend sends IDR `gross_amount` to Midtrans Snap and returns `snapToken` + `redirectUrl`.
8. User pays in Midtrans checkout page.

## Webhook-Driven State Updates

Webhook endpoint: `/api/payment/webhook`

- Verify transaction status from Midtrans Core API using `order_id`.
- Map gateway status to local status:
  - `settlement` or accepted `capture` -> `paid`
  - `pending` -> `pending`
  - `deny`, `cancel`, `failure` -> `failed`
  - `expire` -> `expired`
- Update `Transaction` fields.
- If linked to subscription, update subscription lifecycle:
  - `paid` -> `active` + set period dates
  - `failed` -> `past_due` + grace-based `nextBillingAt`
  - `expired` -> `expired` + mark user unpaid

## Period Fields

- `currentPeriodStart`: beginning of active cycle
- `currentPeriodEnd`: end of active cycle
- `nextBillingAt`: when next renewal is due

Period duration is based on plan interval:
- `week` for weekly plan
- `month` for monthly plan
- `quarter` for quarterly plan
- `year` for yearly plan

## Access Rules

- Paid-only endpoint checks `user.isPaid`.
- Subscription endpoint checks:
  - status in `active` / `past_due`
  - and `currentPeriodEnd >= now`

## Dev Simulation Endpoints

Available outside production:

- `POST /api/subscription/dev/make-due`
- `POST /api/subscription/dev/make-expired`
- `POST /api/subscription/dev/reset-active`

Use these to simulate next-cycle due/expired transitions without waiting real time.
