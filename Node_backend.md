# Frontend Integration Guide: Broker Management (Supabase → Node + Doppler)

This document explains how to update the frontend to work with the new **Node.js backend + Doppler-based secret storage architecture**.

---

# 🧠 Architecture Shift (Important)

### ❌ Old Flow

Frontend → Supabase → store credentials directly

### ✅ New Flow

Frontend → Node API → Supabase (metadata) + Doppler (secrets)

* **Supabase** → stores broker metadata + secret reference
* **Doppler** → stores actual credentials securely
* **Node backend** → acts as the orchestration layer

---

# 🔗 Base API

```
http://localhost:3000/brokers
```

Production (Railway): `https://hedgeonenode-production.up.railway.app/brokers`

---

# 🌐 CORS (Required for frontend)

The browser will block requests from `https://hedgeone.co.in` (or localhost) unless the Node server sends CORS headers. **Add this on your Railway Node backend.**

### Option A: Express with `cors` package

```bash
npm install cors
```

```js
const cors = require('cors');

const allowedOrigins = [
  'https://hedgeone.co.in',
  'https://www.hedgeone.co.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Option B: Manual CORS (any Node server)

Run this for **every** response (and handle OPTIONS preflight):

```js
function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    'https://hedgeone.co.in',
    'https://www.hedgeone.co.in',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
app.use(corsMiddleware);
```

Without one of these, the browser will show: *"CORS header 'Access-Control-Allow-Origin' missing"* even when the API returns 200.

---

# 🔐 Doppler: "Secrets must be an object"

If Railway logs show:

```text
Secrets must be an object
expected: 'object', received: 'array'
```

then the **Node backend** is passing `secrets` as an **array** to Doppler (or to your validation schema). Doppler expects a **plain object** of key/value pairs, not an array.

**Fix in your Node backend:**

- **Wrong:** `secrets: [credentials]` or `secrets: Object.entries(credentials)` or `secrets: [req.body.credentials]`
- **Correct:** `secrets: credentials` or `secrets: req.body.credentials` (plain object, e.g. `{ api_key: "...", api_secret: "..." }`)

Example when creating/updating a broker:

```js
// When writing to Doppler, pass an object:
const secrets = typeof req.body.credentials === 'object' && !Array.isArray(req.body.credentials)
  ? req.body.credentials
  : {};

await dopplerClient.secrets.update({ secrets });  // secrets must be { key: value, ... }
```

Do **not** wrap credentials in an array or pass `Object.entries()` result as `secrets`.

---

# 📦 Data Model (Frontend Perspective)

## Broker Object (from GET)

```json
{
  "id": "uuid",
  "name": "Primary",
  "platform": "zerodha",
  "is_active": true,
  "session_status": "active",
  "created_at": "timestamp"
}
```

⚠️ Note:

* No credentials returned here
* Credentials are fetched separately

---

# 🚀 1. Create Broker

## Endpoint

```
POST /brokers
```

## Payload

```json
{
  "user_id": "uuid",
  "name": "Primary",
  "platform": "zerodha",
  "credentials": {
    "api_key": "abc",
    "api_secret": "xyz"
  }
}
```

## Frontend Implementation

### Form Fields

* Broker Name
* Platform (dropdown: Zerodha, Angel, etc.)
* Credentials (dynamic based on platform)

### Example Fetch

```ts
await fetch('/brokers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id,
    name,
    platform,
    credentials
  })
});
```

## Response

```json
{
  "success": true,
  "broker_id": "uuid"
}
```

## UI Behavior

* Show success toast
* Redirect or refresh broker list

---

# 📖 2. Get Brokers (List View)

## Endpoint

```
GET /brokers/:user_id
```

## Example

```ts
const res = await fetch(`/brokers/${user_id}`);
const brokers = await res.json();
```

## UI Rendering

Each broker card should show:

* Name
* Platform
* Status (`active/inactive`)
* Session status

---

# 🔐 3. Get Broker Credentials (Edit Form Prefill)

## Endpoint

```
GET /brokers/:broker_id/credentials
```

## Example

```ts
const res = await fetch(`/brokers/${broker_id}/credentials`);
const credentials = await res.json();
```

## Response

```json
{
  "api_key": "abc",
  "api_secret": "xyz"
}
```

## UI Behavior

* Populate edit form fields
* NEVER store credentials in frontend state long-term

---

# ✏️ 4. Update Broker Credentials

## Endpoint

```
POST /brokers/update
```

## Payload

```json
{
  "broker_id": "uuid",
  "credentials": {
    "api_secret": "new_secret"
  }
}
```

## Example

```ts
await fetch('/brokers/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    broker_id,
    credentials
  })
});
```

## Behavior

* Merges with existing credentials
* Updates session status internally

## UI Behavior

* Show success message
* Optionally refresh broker list

---

# 🗑️ 5. Delete Broker

## Endpoint

```
DELETE /brokers/:broker_id
```

## Example

```ts
await fetch(`/brokers/${broker_id}`, {
  method: 'DELETE'
});
```

## UI Behavior

* Confirm dialog (important)
* Remove from UI list on success

---

# 🎯 UI Requirements

## 1. Broker List Page

* Display all brokers
* Actions:

  * Edit
  * Delete
  * View status

---

## 2. Create Broker Modal/Page

Dynamic form based on platform:

### Example (Zerodha)

* API Key
* API Secret

---

## 3. Edit Broker Modal

* Fetch credentials on open
* Allow partial updates

---

## 4. Delete Confirmation

* Modal confirmation before delete

---

# ⚠️ Important Frontend Rules

## 🔐 Never Store Credentials

* Do NOT save in localStorage
* Do NOT cache in global state
* Only hold temporarily in form

---

## 🔄 Always Fetch Fresh Credentials

When editing:

```
Open modal → fetch credentials → populate form
```

---

## ⚡ Handle Errors Gracefully

All endpoints may return:

```json
{ "error": "message" }
```

Display:

* Toast notifications
* Inline form errors

---

# 🧩 Suggested Frontend Structure

## API Layer

```
/api/brokers.ts
```

## Functions

```ts
export const getBrokers = (userId) => ...
export const createBroker = (data) => ...
export const getBrokerCredentials = (id) => ...
export const updateBroker = (data) => ...
export const deleteBroker = (id) => ...
```

---

## Components

```
BrokerList.tsx
BrokerCard.tsx
CreateBrokerModal.tsx
EditBrokerModal.tsx
```

---

# 🔄 Full Flow Summary

## Create

```
Form → POST /brokers → success → refresh list
```

## Edit

```
Open modal → GET credentials → edit → POST /update
```

## Delete

```
Click delete → confirm → DELETE → remove from UI
```

---

# 🚀 Optional Enhancements

* Show session status badge (active/inactive)
* Add loading states for API calls
* Add platform-specific credential validation
* Add optimistic UI updates

---

# ✅ Final Outcome

Frontend now:

* Does NOT handle secrets directly
* Delegates all secure logic to backend
* Works seamlessly with Doppler-backed storage

---

If needed, next step:

* Generate full React components for this flow
* Add Zustand/Redux integration
* Add form validation schemas (Zod)
