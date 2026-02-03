# PromptFence Admin App

Admin web application for PromptFence - protect sensitive data from AI prompts.

## Getting Started

### Installation

```bash
cd app
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Flow

### 1. Admin Signup

1. Visit http://localhost:3000/signup
2. Enter your work email (e.g., `admin@company.com`) and password
3. Copy the **Install Code** shown after signup - share this with your team

### 2. Configure Rules

1. After signup, you'll be redirected to `/setup`
2. Configure allowed AI tools (ChatGPT, Claude, Gemini)
3. Set data protection rules:
   - EMAIL: Warn or Block
   - PHONE: Warn or Block
   - IBAN: Warn or Block (default: Block)
4. Optionally set an approved AI URL for internal tools
5. Click "Save Configuration"

### 3. Install Extension

1. Share the Install Code with employees
2. Employees install the browser extension
3. In extension options, enter the Install Code
4. Extension fetches org config from backend

### 4. View Events

1. Go to `/events` to see WARN/BLOCK events
2. Filter by action, domain, or data type
3. Export to CSV for reporting

### 5. View Users

1. Go to `/users` to see all users
2. See extension install status, last activity, and block counts

## Default Rules

- EMAIL: WARN (allow paste, show warning)
- PHONE: WARN (allow paste, show warning)
- IBAN: BLOCK (prevent paste)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` | Admin registration |
| `/login` | Admin authentication |
| `/setup` | Configuration editor |
| `/events` | Event log viewer |
| `/users` | User list |

## API Endpoints

See `shared/contracts.md` for full API documentation.

---

## Deployment (Railway)

Deploy PromptFence to Railway for staging/demo environments.

### Prerequisites

- [Railway account](https://railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli) (optional)

### Quick Deploy

1. **Create a new Railway project:**
   ```bash
   # Via CLI
   railway login
   railway init

   # Or use the Railway dashboard: https://railway.app/new
   ```

2. **Link the app directory:**
   ```bash
   cd app
   railway link
   ```

3. **Add a persistent volume for SQLite:**
   - In Railway dashboard → Service → Settings → Volumes
   - Add volume: Mount path = `/data`
   - This persists the database across deploys

4. **Set environment variables:**
   ```bash
   # Generate a secure JWT secret
   railway variables set JWT_SECRET=$(openssl rand -base64 32)
   railway variables set DATABASE_PATH=/data/promptfence.db
   railway variables set NODE_ENV=production
   ```

   Or set via Railway dashboard → Service → Variables:
   | Variable | Value |
   |----------|-------|
   | `JWT_SECRET` | (generate: `openssl rand -base64 32`) |
   | `DATABASE_PATH` | `/data/promptfence.db` |
   | `NODE_ENV` | `production` |

5. **Deploy:**
   ```bash
   railway up
   ```

   Or push to GitHub and connect the repo in Railway dashboard.

6. **Get your deployment URL:**
   - Railway dashboard → Service → Settings → Domains
   - Add a Railway-provided domain (e.g., `promptfence-staging.up.railway.app`)

### Post-Deploy Setup

1. **Create admin account:**
   - Visit `https://<your-domain>/signup`
   - Sign up with your email
   - Copy the **Install Code**

2. **Configure extension:**
   - Open extension Options
   - Set **API Base URL** to `https://<your-domain>`
   - Set **Install Code** from step 1
   - Save

3. **Verify:**
   - Visit an AI chat (chatgpt.com)
   - Paste an email address
   - WARN modal should appear
   - Check `/events` on your staging domain

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** (prod) | dev-only default | JWT signing key |
| `DATABASE_PATH` | No | `./data/promptfence.db` | SQLite file path |
| `NODE_ENV` | No | `development` | Environment mode |

### Health Check

The app exposes `/api/health` for monitoring:
```bash
curl https://<your-domain>/api/health
# {"status":"ok","timestamp":"2024-..."}
```

### Troubleshooting

**Database not persisting:**
- Ensure volume is mounted at `/data`
- Set `DATABASE_PATH=/data/promptfence.db`

**JWT errors in production:**
- Verify `JWT_SECRET` is set
- App will fail to start without it in production

**Extension can't connect:**
- Verify the domain is publicly accessible (HTTPS)
- Check extension Options has correct API Base URL
- Verify Install Code matches

---

## Notes

- Auth tokens stored in localStorage (TODO: httpOnly cookies for production)
- SQLite database stored in `data/promptfence.db`
- No clipboard content or prompts are ever stored
