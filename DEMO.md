# PromptFence Demo Guide

5-minute walkthrough for testing PromptFence.

## Prerequisites

- Chrome or Edge browser
- Access to the demo server: `https://promptfenceapp-production.up.railway.app`

## Demo Script (5 minutes)

### 1. Sign Up (1 min)

1. Go to: `https://promptfenceapp-production.up.railway.app/demo`
2. Check API status shows green "OK"
3. Click **Sign Up**
4. Enter any email (e.g., `test@yourname.com`) and password (8+ chars)
5. **Copy the Install Code** shown after signup (e.g., `A1B2C3D4`)

### 2. Configure Rules (30 sec)

1. You'll land on `/setup` automatically
2. Default rules are fine for demo:
   - EMAIL: WARN
   - PHONE: WARN
   - IBAN: BLOCK
3. Click **Save Configuration**

### 3. Install Extension (2 min)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Click the PromptFence icon → **Options**
6. Enter:
   - **Install Code**: (paste from step 1)
   - **API Base URL**: `https://promptfenceapp-production.up.railway.app`
7. Click **Save**
8. Verify status shows "OK"

### 4. Trigger Events (1 min)

1. Go to https://chatgpt.com (or claude.ai)
2. Click in the prompt textarea
3. Paste: `Contact me at test@example.com`
4. **Expected**: Yellow WARN modal appears, paste goes through
5. Paste: `Pay to DE89370400440532013000`
6. **Expected**: Red BLOCK modal, paste prevented

### 5. View Dashboard (30 sec)

1. Go to: `https://promptfenceapp-production.up.railway.app/events`
2. See WARN and BLOCK events logged
3. Check `/users` to see your extension as "installed"

## Test Data

Copy these to test different data types:

```
Email: test@example.com
Phone: +1 555 123 4567
Valid IBAN: DE89370400440532013000
```

## What This Demo Does NOT Cover

This is a friend-testing demo, not a production deployment. It does not include: enterprise SSO/SAML, password reset flows, email verification, multi-admin support, role-based permissions, audit logging, data retention policies, or production-grade rate limiting. The SQLite database resets if the Railway volume is removed. This demo is for validating core functionality only.
