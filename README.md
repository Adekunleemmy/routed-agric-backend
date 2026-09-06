# RUUTED Agricultural Platform - Production Backend

A high-performance, production-grade backend architecture, real-time escrow engine, multimodal AI agronomy service, and structured negotiation platform built for **RUUTED Agricultural Platform** ([Frontend Live](https://ruuted.vercel.app/)).

Built with **Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, Socket.io, and Google Gemini AI**.

---

## 🌟 Key Features

1. **Role-Based Authentication & Profiles**:
   - Secure registration & login for **Farmers**, **Buyers**, and **Admins**.
   - Automatic role detection on login.
   - Farmer profile management with agricultural verification, ratings, and active farm listings metrics.

2. **Marketplace & Inventory Pipeline**:
   - Full CRUD produce listings with categories (Vegetables, Tubers, Grains, etc.), packaging units (crate, sack, tuber, kg), stock levels, and Nigerian state/LGA geo-filtering.
   - Smart stock tracking (`available`, `low_stock`, `sold_out`) with automatic decrementing on order placement.

3. **Escrow Lifecycle & Webhooks**:
   - Buyer-initiated orders (`ORD-YYYY-XXXX`).
   - Paystack & Flutterwave transaction initialization with HMAC SHA-512 webhook signature verification.
   - Status transitions (`ACCEPTED` holds escrow, `COMPLETED` disburses funds to farmer, `REJECTED` releases hold).
   - Mock payment simulation mode when secret keys are empty in development.

4. **Structured Negotiations**:
   - Buyers and farmers can counter-propose prices (`PRICE_COUNTER`), quantities (`QUANTITY_CHANGE`), or delivery drop-offs (`LOCATION_CHANGE`).
   - Acceptance automatically recalculates and synchronizes order totals and unit prices in PostgreSQL.

5. **Order-Tied Chat & Anti-Circumvention Security Engine**:
   - Server-side regex sanitization for Nigerian phone numbers (`+234...`, `080...`, `070...`, `090...`, `081...`) and email addresses.
   - Masks contact details with RUUTED escrow protection badges before persisting to database.
   - Real-time broadcasts over Socket.io order rooms (`order_{orderId}`).

6. **AI Crop & Pest Assistant (Gemini 1.5 Flash Vision)**:
   - Multimodal diagnostic pipeline returning structured JSON: `{ possibleProblem, confidence, explanation, possibleCauses[], recommendedActions[], prevention[] }`.
   - Threaded follow-up conversations with AI Agronomist on dosage, withholding periods (PHI), and IPM practices.
   - Built-in tropical agronomic heuristics fallback if API key is not configured.

7. **AI Agronomy Knowledge Repository**:
   - Localized Q&A guidance for West African and Nigerian farming systems.
   - Offline guide bookmarking and retrieval.

8. **Interactive Swagger / OpenAPI Documentation**:
   - Full interactive API sandbox available at `/api/docs`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22.17.1)
- **PostgreSQL**: v14+ (tested on PostgreSQL 18.2)

### 2. Environment Setup
The `.env` file is already created. Secret keys for external providers are left blank for you to insert whenever ready:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/ruuted_db?schema=public"

# External API Keys (Optional - development fallbacks are active)
JWT_SECRET=""
GEMINI_API_KEY=""
PAYSTACK_SECRET_KEY=""
PAYSTACK_PUBLIC_KEY=""
FLUTTERWAVE_SECRET_KEY=""
REDIS_URL=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### 3. Database Migration & Seed
Run Prisma database sync and populate sample Nigerian farmers, buyers, listings, and orders:

```bash
# Push schema to PostgreSQL
npm run prisma:push

# Seed database with realistic agricultural data
npm run seed
```

### 4. Running the Server

```bash
# Development Mode (Hot Reload)
npm run dev

# Production Build & Start
npm run build
npm run start
```

* **API Base URL**: `http://localhost:5000/api/v1`
* **Swagger API Sandbox**: `http://localhost:5000/api/docs`
* **Health Check**: `http://localhost:5000/api/v1/health`

### 5. Running the Automated Test Suite
Run the 43-point comprehensive integration test suite verifying all subsystems:

```bash
npm run test:api
```

---

## 📋 Default Seed Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Farmer** | `ibrahim@danladifarms.ng` | `Password123!` | Ibrahim Danladi (GreenHaven Agro & Farms, Epe, Lagos) |
| **Buyer** | `fatima@foodhublagos.com` | `Password123!` | Fatima Adeyemi (FoodHub Lagos, Lekki) |
| **Admin** | `admin@ruuted.ng` | `Password123!` | RUUTED Platform Super Admin |

---

## 📡 Real-Time WebSockets (Socket.io)

Connect to root `ws://localhost:5000`:
* **Join Order Room**: `socket.emit('join_order_room', 'ORD-2026-8841')`
* **Incoming Message Broadcast**: `socket.on('new_order_message', (payload) => { ... })`
* **Incoming Negotiation Event**: `socket.on('negotiation_updated', (payload) => { ... })`

---

## 🛡️ Anti-Circumvention Protection Test

Any message containing Nigerian phone numbers (e.g. `08031234567`) or emails will be automatically sanitized before reaching the buyer or farmer:

* **Input**: `"Call me on 08031234567 to settle outside escrow"`
* **Stored & Broadcast**: `"Call me on [📞 Phone Number Hidden — Transact on RUUTED for Quality Guarantee] to settle outside escrow"`
