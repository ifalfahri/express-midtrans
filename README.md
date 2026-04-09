# Express Midtrans

This is a backend demo project to help understand:

- **Google Authentication (OAuth)**
- **Payment Integration (Midtrans)**
- **Conditional Access Based on Paid Status**

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

### 3. Payment Status & Access Control

- User's payment status: `unpaid` / `paid`
- Updates status on successful payment notification from Midtrans.
- Access logic:
    - Unpaid users have restricted access
    - Paid users have full access (e.g., can view protected content)

### 4. API Endpoints

| Area         | Endpoint                               | Description                                    |
|--------------|----------------------------------------|------------------------------------------------|
| Auth         | `/api/auth/google`                     | Start Google login flow                        |
|              | `/api/auth/callback/google`            | Google login callback                          |
|              | `/api/auth/me`                        | Get current user info                          |
| Payment      | `/api/payment/create-transaction`      | Create new payment, get payment URL/token      |
|              | `/api/payment/status`                  | Get user's payment status                      |
|              | `/api/payment/webhook`                 | (POST) Webhook endpoint for Midtrans           |
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

### 5. Run the App

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

### 6. Install Bruno (API Client)

- Download Bruno from the official website: [https://www.usebruno.com](https://www.usebruno.com)
- Open this project collection folder in Bruno: `./bruno`

---

## Flow Overview

### Authentication

1. User clicks "Login with Google" (redirects to `/api/auth/google`)
2. If not registered, user info is stored in DB.
3. Session established. Use `/api/auth/me` to check login state.

### Payment

1. User initiates payment at `/api/payment/create-transaction`.
2. Receives payment link or token compatible with various methods (QRIS, OVO, etc).
3. Once payment is made, Midtrans sends a webhook to `/api/payment/webhook`.
4. System updates user status from `unpaid` to `paid`.

### Access Control

- Middleware will check:
    - User authenticated
    - User has `isPaid: true`
- Otherwise, restricted endpoints respond with an error.

---

## Testing

- All endpoints are plain REST (JSON), tested using **Bruno**.
- Payment is tested in **Midtrans sandbox environment**.

### Final Testing Flow (Bruno + Browser OAuth)

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
6. Run `03 Payment Create Transaction` with body:

```json
{
  "amount": 50000,
  "enabledPayments": ["qris", "gopay", "credit_card", "bank_transfer"]
}
```

7. Response returns both:
   - `snapToken`
   - `redirectUrl`
8. Open `redirectUrl`, complete sandbox payment.
9. Process webhook:
   - Preferred: use ngrok/public tunnel and configure Midtrans notification URL to `<public-url>/api/payment/webhook`.
   - Local fallback: run `05 Payment Webhook Manual` and set `orderId` env var from step 7.
10. Run `04 Payment Status` and ensure `isPaid` becomes `true`.
11. Run `06 Protected Content` (should pass only after paid).
12. Run `07 Auth Logout` to end session.

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
   - `03 Payment Create Transaction`
   - `04 Payment Status`
   - `05 Payment Webhook Manual` (fill `orderId` env var first)
   - `06 Protected Content`
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
