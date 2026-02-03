# PromptFence V2 — API Contracts

## Authentication

### Admin (Web App)
- **Method:** Bearer token (JWT)
- **Header:** `Authorization: Bearer <token>`
- **Token payload:**
  ```json
  {
    "userId": "uuid",
    "orgId": "uuid",
    "role": "admin",
    "exp": 1234567890
  }
  ```
- **Expiry:** 7 days

### Extension (Employee)
- **Method:** Install code
- **Header:** `X-Install-Code: <code>`
- **Code format:** 8-character alphanumeric (e.g., `A1B2C3D4`)
- **Behavior:** Creates user if not exists, returns org config

---

## Schemas

### Event Payload (Extension → Backend)

**CRITICAL: Clipboard contents and prompts are NEVER included.**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "aiDomain": "chatgpt.com",
  "ruleId": "R1",
  "dataTypes": ["EMAIL", "PHONE"],
  "action": "BLOCK",
  "extensionVersion": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | string (ISO 8601) | Yes | When the event occurred |
| aiDomain | string | Yes | AI site hostname |
| ruleId | string | Yes | Rule that triggered |
| dataTypes | string[] | Yes | Detected types: EMAIL, PHONE, IBAN |
| action | string | Yes | WARN or BLOCK |
| extensionVersion | string | Yes | Extension version |

### Org Config (Backend → Extension)

```json
{
  "orgId": "uuid",
  "aiTools": {
    "chatgpt": true,
    "claude": true,
    "gemini": true,
    "other": false
  },
  "rules": {
    "EMAIL": "WARN",
    "PHONE": "WARN",
    "IBAN": "BLOCK"
  },
  "approvedAiUrl": "https://internal-ai.company.com"
}
```

| Field | Type | Description |
|-------|------|-------------|
| orgId | string | Organization UUID |
| aiTools | object | Which AI tools are approved (true) or warn-only (false) |
| rules | object | Action per data type: WARN or BLOCK |
| approvedAiUrl | string \| null | Optional alternative AI URL to show in modal |

---

## Endpoints

### POST /api/signup

Create admin account and organization.

**Auth:** None (public)

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "userId": "uuid",
  "orgId": "uuid",
  "domain": "acme.com",
  "installCode": "A1B2C3D4",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Invalid email or password
- `409` - Email already registered

---

### POST /api/login

Authenticate admin.

**Auth:** None (public)

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "userId": "uuid",
  "orgId": "uuid",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `401` - Invalid credentials

---

### POST /api/invite

Generate or regenerate install code.

**Auth:** Bearer token (admin)

**Request:**
```json
{
  "regenerate": false
}
```

**Response (200 OK):**
```json
{
  "installCode": "A1B2C3D4",
  "installUrl": "https://promptfence.com/install?code=A1B2C3D4"
}
```

**Errors:**
- `401` - Unauthorized

---

### GET /api/config

Fetch organization config for extension.

**Auth:** `X-Install-Code` header

**Request:**
```
GET /api/config
X-Install-Code: A1B2C3D4
X-User-Hash: sha256-of-browser-fingerprint (optional)
```

**Response (200 OK):**
```json
{
  "orgId": "uuid",
  "userId": "uuid",
  "aiTools": {
    "chatgpt": true,
    "claude": true,
    "gemini": true,
    "other": false
  },
  "rules": {
    "EMAIL": "WARN",
    "PHONE": "WARN",
    "IBAN": "BLOCK"
  },
  "approvedAiUrl": null
}
```

**Errors:**
- `401` - Invalid install code

**Side effects:**
- Creates user if not exists (using email domain or hashed ID)
- Updates `extension_installed = 1`
- Updates `last_seen_at`

---

### POST /api/config

Update organization config. **This is the only config write endpoint (admin-only).**

**Auth:** Bearer token (admin required)

**Request:**
```json
{
  "aiTools": {
    "chatgpt": true,
    "claude": true,
    "gemini": false,
    "other": false
  },
  "rules": {
    "EMAIL": "WARN",
    "PHONE": "BLOCK",
    "IBAN": "BLOCK"
  },
  "approvedAiUrl": "https://internal-ai.company.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**
- `401` - Unauthorized
- `400` - Invalid config values

---

### POST /api/events

Report enforcement event from extension.

**Auth:** `X-Install-Code` header

**Headers:**
```
X-Install-Code: A1B2C3D4
X-User-Hash: sha256-of-browser-fingerprint (optional)
```

**Request:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "aiDomain": "chatgpt.com",
  "ruleId": "R1",
  "dataTypes": ["EMAIL", "PHONE"],
  "action": "BLOCK",
  "extensionVersion": "1.0.0"
}
```

**Response (201 Created):**
```json
{
  "eventId": "uuid"
}
```

**Errors:**
- `401` - Invalid install code
- `400` - Invalid event payload

**Side effects:**
- Increments user `block_count` if action is BLOCK
- Updates `last_seen_at`

---

### GET /api/events

List events for admin dashboard.

**Auth:** Bearer token (admin)

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 50, max: 100) |
| dataType | string | Filter by EMAIL, PHONE, or IBAN |
| aiDomain | string | Filter by AI domain |
| action | string | Filter by WARN or BLOCK |
| format | string | Response format: json (default) or csv |

**Request:**
```
GET /api/events?page=1&limit=50&action=BLOCK
Authorization: Bearer <token>
```

**Response (200 OK) - JSON:**
```json
{
  "events": [
    {
      "id": "uuid",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "userId": "uuid",
      "userEmail": "employee@acme.com",
      "aiDomain": "chatgpt.com",
      "ruleId": "R1",
      "dataTypes": ["EMAIL", "PHONE"],
      "action": "BLOCK",
      "extensionVersion": "1.0.0"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142,
    "totalPages": 3
  }
}
```

**Response (200 OK) - CSV:**
```csv
id,timestamp,userId,userEmail,aiDomain,ruleId,dataTypes,action,extensionVersion
uuid,2024-01-15T10:30:00.000Z,uuid,employee@acme.com,chatgpt.com,R1,"EMAIL,PHONE",BLOCK,1.0.0
```

**Errors:**
- `401` - Unauthorized

---

### GET /api/users

List users for admin dashboard.

**Auth:** Bearer token (admin)

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 50, max: 100) |

**Request:**
```
GET /api/users?page=1&limit=50
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "employee@acme.com",
      "hashedId": null,
      "role": "employee",
      "extensionInstalled": true,
      "lastSeenAt": "2024-01-15T10:30:00.000Z",
      "blockCount": 5,
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

**Errors:**
- `401` - Unauthorized

---

## Error Response Format

All errors return consistent format:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | INVALID_REQUEST | Malformed request body |
| 401 | UNAUTHORIZED | Missing or invalid auth |
| 401 | INVALID_CREDENTIALS | Wrong email/password |
| 401 | INVALID_INSTALL_CODE | Install code not found |
| 403 | FORBIDDEN | Insufficient permissions |
| 409 | CONFLICT | Resource already exists |
| 500 | INTERNAL_ERROR | Server error |

---

## Privacy Guarantees

1. **No clipboard content:** Event payloads contain only metadata
2. **No prompt text:** AI prompts are never captured or transmitted
3. **No browsing history:** Only AI domain is logged per event
4. **Minimal PII:** User identified by email or anonymous hash
5. **No tracking:** Extension does not track behavior beyond enforcement events
