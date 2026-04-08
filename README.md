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
- Testable using Postman or similar REST client

---

## Setup & Installation

### 1. Clone & Install Dependencies

Using **pnpm** (recommended for speed), or you may use **npm** if you prefer.

#### Using pnpm

```bash
git clone <this-repo-url>
cd <project-folder>
pnpm install
```

#### Or using npm

```bash
git clone <this-repo-url>
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
- Use Postman to hit endpoints (see API section above).

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

- All endpoints are plain REST (JSON), test with Postman, HTTPie, Insomnia, etc.
- Payment can be tested in **Midtrans sandbox environment**.

### Quick Postman Flow

1. Login first via `GET /api/auth/google` and finish OAuth in browser.
2. Check current user via `GET /api/auth/me`.
3. Create payment via `POST /api/payment/create-transaction` with body:

```json
{
  "amount": 50000,
  "enabledPayments": ["qris", "gopay", "credit_card", "bank_transfer"]
}
```

4. Response returns both:
   - `snapToken`
   - `redirectUrl`
5. Open `redirectUrl`, complete sandbox payment.
6. Midtrans sends webhook to `POST /api/payment/webhook`.
7. Check `GET /api/payment/status` and ensure `isPaid` becomes `true`.
8. Access `GET /api/protected-content` (should pass only after paid).

### Webhook Simulation

- For local webhook testing, expose localhost using a tunnel (e.g. ngrok) and set Midtrans webhook URL to:
  - `<public-url>/api/payment/webhook`
- You can also trigger status checks manually by resending webhook payload that contains `order_id`.

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
