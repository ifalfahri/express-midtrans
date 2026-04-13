# Express Midtrans

This is a backend demo project to help understand:

- **Google Authentication (OAuth)**
- **Payment Integration (Midtrans)**
- **Conditional Access Based on Subscription Status**

## Features

### 1. Google Authentication

- Login via Google OAuth2 (using Passport.js).
- Persist user info (id, email, name) in the database.
- Endpoints:
    - `/api/auth/google` to trigger login
    - `/api/auth/callback/google` for Google OAuth callback
    - `/api/auth/me` to get currently logged in user

### 2. Payment Integration with Midtrans

- Supports multiple payment methods:
    - QRIS, OVO, GoPay, DANA, Credit Card, Bank Transfer
- Flow:
    - Create transaction and generate payment link/token
    - Handle Midtrans webhook to update payment status

### 3. Subscription Status & Access Control

- Hybrid billing model:
    - `auto_charge` for recurring-capable channels (`credit_card`, `gopay`)
    - `manual` fallback for other channels (e.g. `qris`, VA)
- Multi-plan support:
    - `monthly`
    - `yearly`
- Subscription status lifecycle: `pending`, `active`, `past_due`, `canceled`, `expired`
- Updates status on Midtrans webhook and local status mapping.
- Access logic:
    - Subscription inactive/expired users have restricted access
    - Active subscribers have full access (e.g., protected content)

### 4. API Endpoints

| Area         | Endpoint                               | Description                                    |
|--------------|----------------------------------------|------------------------------------------------|
| Auth         | `/api/auth/google`                     | Start Google login flow                        |
|              | `/api/auth/callback/google`            | Google login callback                          |
|              | `/api/auth/me`                        | Get current user info                          |
| Payment      | `/api/payment/create-transaction`      | Create new payment, get payment URL/token      |
|              | `/api/payment/status`                  | Get user's payment status                      |
|              | `/api/payment/webhook`                 | (POST) Webhook endpoint for Midtrans           |
| Subscription | `/api/subscription/plans`              | List active subscription plans                 |
|              | `/api/subscription/checkout`           | Start subscription checkout                    |
|              | `/api/subscription/me`                 | Get current user subscription                  |
|              | `/api/subscription/cancel`             | Mark subscription cancel at period end         |
| Protected    | `/api/protected-content`               | Example route only for paid users              |
| Auth         | `/api/auth/logout`                     | Logout the current user                        |

## Technical Stack

- **Node.js** with **Express**
- **PostgreSQL** for database (via Prisma ORM)
- **Passport.js** for Google OAuth2
- **Midtrans** (sandbox mode) for payment gateway
- **Docker** for local database
- Testable using **Bruno** API client

---

## Setup & Installation

### 1. Clone & Install Dependencies

Using **pnpm** (recommended for speed), or you may use **npm** if you prefer.

#### Using pnpm

```bash
git clone https://github.com/ifalfahri/express-midtrans.git
cd express-midtrans
pnpm install
```

#### Or using npm

```bash
git clone https://github.com/ifalfahri/express-midtrans.git
cd <project-folder>
npm install
```

### 2. Setup PostgreSQL using Docker

If you don't have PostgreSQL installed, start one easily with Docker:

```bash
docker run --name dummy-payments-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dummy_payments_db -p 5432:5432 -d postgres:18-alpine
```

Test connection:

```bash
docker ps         # Make sure the postgres container is running
```

### 3. Environment Variables

Copy env template:

```bash
cp .env.example .env
```

Then fill the values in `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `MIDTRANS_IS_PRODUCTION` (use `false` for sandbox)
- `MIDTRANS_WEBHOOK_URL` (set to `http://localhost:3000/api/payment/webhook`)
- `SUBSCRIPTION_GRACE_DAYS` (e.g. `3`)
- `SUBSCRIPTION_DEFAULT_MONTHLY_CODE` (e.g. `monthly`)
- `SUBSCRIPTION_DEFAULT_YEARLY_CODE` (e.g. `yearly`)
- `SESSION_SECRET`

### 4. Prisma Setup & Database Migration

#### Using pnpm

```bash
pnpm prisma migrate dev --name init
```

#### Or using npm

```bash
npx prisma migrate dev --name init
```

> Edit the `prisma/schema.prisma` file if you need to adjust tables.

### 5. Seed Subscription Plans

```bash
pnpm seed:plans
```

### 6. Run the App

#### Using pnpm

```bash
pnpm start
```

#### Or using npm

```bash
npm start
```

- Server should run on: `http://localhost:3000`
- Use Bruno to hit endpoints (see testing flow below).

### 7. Install Bruno (API Client)

- Download Bruno from the official website: [https://www.usebruno.com](https://www.usebruno.com)
- Open this project collection folder in Bruno: `./bruno`

---

## Flow Overview

### Authentication

1. User clicks "Login with Google" (redirects to `/api/auth/google`)
2. If not registered, user info is stored in DB.
3. Session established. Use `/api/auth/me` to check login state.

### Subscription + Payment

1. User fetches plans from `/api/subscription/plans`.
2. User starts checkout at `/api/subscription/checkout` with `planCode` and `paymentMethod`.
3. Backend creates pending subscription + transaction and returns Snap link/token.
4. User completes payment in Midtrans sandbox.
5. Midtrans webhook hits `/api/payment/webhook`.
6. System updates transaction + subscription status and subscription period window.

### Access Control

- Middleware will check:
    - User authenticated
    - User has valid active subscription period
- Otherwise, restricted endpoints respond with an error.

---

## Testing

- All endpoints are plain REST (JSON), tested using **Bruno**.
- Payment is tested in **Midtrans sandbox environment**.

### Final Testing Flow (Bruno + Browser OAuth + Subscription)

1. Start app with `pnpm dev`.
2. Open folder `bruno` in Bruno app and select environment `local`.
3. Login first in browser:
   - `http://localhost:3000/api/auth/google`
   - Complete OAuth consent.
4. Copy `connect.sid` from browser cookie (`localhost`) and add it via **Bruno Cookies UI**:
   - Domain: `localhost`
   - Key: `connect.sid`
   - Value: `<your_cookie_value>`
5. Run `02 Auth Me` to verify session login.
6. Run `08 Subscription Plans` and choose `monthly` or `yearly`.
7. Set Bruno env vars:
   - `planCode`: `monthly` or `yearly`
   - `paymentMethod`: `qris`, `credit_card`, `gopay`, etc.
8. Run `09 Subscription Checkout`.

9. Response returns both:
   - `snapToken`
   - `redirectUrl`
10. Open `redirectUrl`, complete sandbox payment.
11. Process webhook:
   - Preferred: use ngrok/public tunnel and configure Midtrans notification URL to `<public-url>/api/payment/webhook`.
   - Local fallback: run `05 Payment Webhook Manual` and set `orderId` env var from step 7.
12. Run `10 Subscription Me` and verify `status` and billing period fields.
13. Run `04 Payment Status` and ensure `isPaid` becomes `true`.
14. Run `06 Protected Content` (should pass only after subscription is active).
15. Optional: run `11 Subscription Cancel` to mark cancel at period end.
16. Run `07 Auth Logout` to end session.

### Webhook Simulation

- For local webhook testing, expose localhost using a tunnel (e.g. ngrok) and set Midtrans webhook URL to:
  - `<public-url>/api/payment/webhook`
- You can also trigger status checks manually by resending webhook payload that contains `order_id`.

### Bruno Usage

1. Open folder `bruno` in Bruno app.
2. Select environment `local`.
3. Run requests in sequence:
   - `01 Auth Google Login` (complete OAuth in browser)
   - `02 Auth Me`
   - `08 Subscription Plans`
   - `09 Subscription Checkout`
   - `10 Subscription Me`
   - `04 Payment Status`
   - `05 Payment Webhook Manual` (fill `orderId` env var first)
   - `06 Protected Content`
   - `11 Subscription Cancel` (optional)
   - `07 Auth Logout`

## Learning Outcomes

- Understand OAuth2 authentication flow
- Understand payment gateway flow and webhook handling
- Learn to manage user state and role-based access
- See a simple, scalable backend project structure

---

## Notes

- For actual production, **secure your secrets** and enhance error handling
- This example is minimal and does not include frontend code
- All payments are simulated (sandbox)

---

## License

MIT
