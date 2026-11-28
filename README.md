# AdaptIQ — Adaptive Learning Platform

A full-stack adaptive learning platform with role-based access (Student, Teacher, Admin), AI-powered skill extraction, gamification, real-time collaboration, and market trend analytics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas or local) + Mongoose ODM |
| Auth | 15-minute in-memory access JWT + rotating HttpOnly refresh cookie |
| AI | Groq API (default when configured) or Google Gemini |
| Realtime | Socket.io |

---

## Quick Start

### Prerequisites
- Node.js ≥ 22 (required by the current Zod and upload-inspection dependencies)
- MongoDB Atlas URI (or local MongoDB)
- Groq API key or Google Gemini API key

### 1. Clone & Install

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

```bash
# server/.env
cp server/.env.example server/.env
# Fill in: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL
# Set GROQ_API_KEY (or GEMINI_API_KEY); AI_PROVIDER=groq is optional when GROQ_API_KEY is set
# Set MFA_ENCRYPTION_KEY to a separately generated 32-byte key (64 hex characters)
# Set SEED_ADMIN_PASSWORD, SEED_TEACHER_PASSWORD, and SEED_STUDENT_PASSWORD before running the destructive seed command
# For attendance face enrollment, also set FACE_DATA_ENCRYPTION_KEY and FACE_VERIFIER_* values

# client/.env (optional for local dev)
# Set VITE_API_BASE_URL only when the API is not available at /api
```

### 3. Seed the Database (optional)

```bash
cd server && npm run seed
```

### 4. Run Development Servers

```bash
# Terminal 1 — API server (port 8080)
cd server && npm run dev

# Terminal 2 — React client (port 5173)
cd client && npm run dev
```

---

## Deployment (Vercel + Render)

### Backend on Render

1. Create a new Web Service from this repository and set Root Directory to `server`.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set environment variables:
    - `NODE_ENV=production`
    - `MONGO_URI=<your_mongodb_connection_string>`
    - `JWT_SECRET=<long_random_secret>`
    - `MFA_ENCRYPTION_KEY=<separate_64_character_hex_key>`
    - `AI_PROVIDER=groq`
    - `GROQ_API_KEY=<your_groq_key>`
    - `GROQ_MODEL=llama-3.3-70b-versatile`
    - `CLIENT_URL=https://app.<your-domain>`
    - `CLAMAV_ENABLED=true` (also the production default)

Notes:
- `CLIENT_URL` supports multiple origins via comma-separated values.
- The server already enables proxy trust for correct rate-limiting behind Render.
- Install ClamAV (`clamscan`) on the API host; set `CLAMSCAN_PATH` if it is not on `PATH`.
  Production uploads fail closed with HTTP 503 if the scanner is unavailable.
- Refresh cookies use `SameSite=Strict`. Use same-site custom domains for the frontend and API
  (for example, `app.example.com` and `api.example.com`); the default Vercel and Render hostnames
  are cross-site and browsers will not send these cookies between them.

### Refresh-token migration

The client exchanges an existing `localStorage` refresh token for the cookie on its first session
restore, then removes both legacy token entries. The migration script hashes active refresh tokens
in place while preserving their sessions:

1. Back up the intended MongoDB database.
2. Deploy the new backend with `ALLOW_LEGACY_REFRESH_TOKENS=true` so already-deployed clients can
   continue their existing JSON refresh flow during rollout.
3. Run `npm run migrate:refresh-tokens` once from `server` with the intended `MONGO_URI` and the
   same `JWT_REFRESH_SECRET` used by the current deployment.
4. Deploy the updated client and verify session restore via the refresh cookie.
5. Set `ALLOW_LEGACY_REFRESH_TOKENS=false` and redeploy the backend to stop returning refresh
   tokens in JSON.

The migration command is not run automatically during startup.

### Frontend on Vercel

1. Create a new Vercel project and set Root Directory to `client`.
2. Framework preset: Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
    - `VITE_API_BASE_URL=https://api.<your-domain>/api`

### Production Checklist

- Do not commit `.env` files.
- Keep `JWT_SECRET` long and unique.
- Keep `MFA_ENCRYPTION_KEY` separate from JWT and face-encryption keys; back it up securely because
  losing it makes enrolled authenticator secrets unrecoverable.
- Set `CLIENT_URL` to exact browser origin(s); use same-site custom domains for cookie auth.
- Verify `/api/health` on Render after deploy.

### MFA and password policy

- Teacher and admin accounts must enroll an authenticator app before accessing the API. Enrollment
  displays one-time recovery codes; store them securely. Student sign-in does not require MFA.
- Set `MFA_ENCRYPTION_KEY` to 32 random bytes encoded as 64 hexadecimal characters. Generate one
  with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and store it in
  the deployment secret manager. Do not reuse `JWT_SECRET` or `FACE_DATA_ENCRYPTION_KEY`.
- New passwords must be 12–72 UTF-8 bytes and contain uppercase, lowercase, numeric, and symbol
  characters. Five failed password or MFA attempts trigger a one-minute lock; repeated failures
  progressively increase the lock up to one hour.
- MFA and lockout fields are optional in the existing MongoDB user documents; no migration or
  backfill is required.

### Request and API hardening

- `CLIENT_URL` is the CORS allowlist and accepts comma-separated exact origins. Production startup
  fails if it is empty; configure it explicitly for every browser origin.
- Helmet is enabled. JSON request bodies are capped at 1 MiB; face-enrollment JSON has a separate
  16 MiB ceiling to accommodate the existing image-capture flow. URL-encoded bodies are capped at
  1 MiB and 500 parameters; multipart assignment uploads also have field, file, and part limits.
- Every API request body is checked by Zod for JSON shape, bounded strings, arrays, object fields,
  and nesting. Authentication and administrator role changes use stricter schemas. Syllabus model
  fields also enforce their own length and collection limits.
- Pagination accepts `page` values up to 10,000 and `limit` values up to 100.
- Login is limited to 5 requests per 15 minutes, registration to 5 per hour, and refresh to 20 per
  15 minutes per client IP. A 5-per-hour limiter is mounted on the password-reset URL namespace;
  this project currently has no password-reset handler to protect.
- Socket.IO requires a valid access token for each connection, rechecks account status on every
  event, validates event payloads, and limits each socket to 60 events per 10 seconds. Private
  user, course, chat, and live-class rooms check self identity, enrollment/ownership, membership,
  or live-class registration as appropriate; live-class signaling and camera events recheck access.
- Assignment uploads accept only detected PDF, PNG, JPEG, and WebP content, with an 8-file and
  10 MiB-per-file cap. Files use random server names and are stored outside static serving in
  `server/private_uploads`. ClamAV scanning is enabled by default in production; it is disabled
  in development unless `CLAMAV_ENABLED=true`. Downloads require authentication and assignment
  access (course owner/admin or enrolled student); historic `/uploads/assignments` links are
  served through the same protected download checks.
- HTTP requests receive a server-generated `X-Request-ID`. Security logs record only request IDs,
  route templates, methods, status, role, and action category; they do not include request bodies,
  user identifiers, IP addresses, tokens, passwords, or query strings. Raw exception messages and
  Morgan request logs are not emitted.
- Gitleaks runs in GitHub Actions on pushes and pull requests with full history. Exact fingerprints
  for previously committed demo seed passwords and a public RFC TOTP test vector are ignored so
  old findings do not block builds; new seed-password literals remain detectable. Seed passwords
  now come from `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, and `SEED_STUDENT_PASSWORD`.
  Rotate any accounts created with the historical seed credentials; the old values still exist in
  Git history even though they are removed from the current source.

---

## Project Structure

```
adaptiq/
├── server/                  # Express API
│   ├── config/db.js         # MongoDB connection
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Auth, role guards, error handler
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express routers
│   ├── utils/               # Helpers, AI client
│   └── server.js            # Entry point
│
└── client/                  # React + Vite
    └── src/
        ├── components/      # Shared UI components
        ├── context/         # Auth context
        ├── hooks/           # Custom hooks
        ├── lib/             # API client, utils
        ├── pages/           # Route pages
        └── types/           # TypeScript types
```

---

## Roles & Permissions

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| Browse courses | ✓ | ✓ | ✓ |
| Enroll in courses | ✓ | — | — |
| Take quizzes | ✓ | — | — |
| Create courses | — | ✓ | ✓ |
| Grade submissions | — | ✓ | ✓ |
| Manage users | — | — | ✓ |
| View platform analytics | — | — | ✓ |

---

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/users/me
PUT    /api/users/profile

GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id
POST   /api/courses/:id/enroll

GET    /api/quizzes/:courseId
POST   /api/quizzes
POST   /api/quizzes/:id/attempt
GET    /api/quizzes/:id/results

GET    /api/assignments/:courseId
POST   /api/assignments
POST   /api/assignments/:id/submit

GET    /api/badges
GET    /api/users/:id/badges

GET    /api/skills/map
POST   /api/skills/analyze

GET    /api/discussions/:courseId
POST   /api/discussions
POST   /api/discussions/:id/reply

GET    /api/market-trends
POST   /api/admin/users
```

## AdaptIQ Setup Notes

- The Groq key is read only by the Express server from `GROQ_API_KEY` in `server/.env`. Paste your key after `GROQ_API_KEY=`. When a Groq key is present it is selected automatically; you can also set `AI_PROVIDER=groq`. Restart with `cd server && npm run dev`. Gemini remains available with `AI_PROVIDER=gemini` and `GEMINI_API_KEY`. Missing credentials produce a startup warning while non-AI LMS features remain available.
- Generate the face-data encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, then paste it after `FACE_DATA_ENCRYPTION_KEY=` in `server/.env`. Never use the example placeholder as a real key.
- Keep `.env` files local. `.gitignore` excludes them; `.env.example` contains placeholders only.
- Use a dedicated MongoDB application user with only `readWrite` on the application database; never use an Atlas project owner or cluster-admin credential in `MONGO_URI`. Use separate, narrowly scoped credentials for backup and restore operations.
- Production MongoDB connections require verified TLS. The application rejects URI flags that disable TLS or certificate verification. Keep the database on a private network or Atlas IP access list and do not expose a MongoDB port publicly; these network controls must be configured at the hosting/provider layer.
- Install MongoDB Database Tools (`mongodump` and `mongorestore`) on the maintenance host; set `MONGODUMP_PATH` or `MONGORESTORE_PATH` only if they are not on `PATH`.
- Create encrypted backups with `cd server && npm run db:backup`. Set `BACKUP_ENCRYPTION_KEY` to a separate random 32-byte key (64 hex characters) and keep it outside the database and backup storage. Backups are AES-256-GCM encrypted archives and refuse to overwrite an existing file.
- Restore only to a separate, empty database: set `MONGO_RESTORE_URI`, then run `cd server && npm run db:restore -- <encrypted-archive-path>`. The script remaps source collections to the target database, refuses to restore over the source, and does not drop existing collections. It authenticates the archive before restore and temporarily decrypts it in the OS temp directory; restrict host access and ensure the temp volume has adequate capacity. A failed restore can leave partial data in the target; inspect and remove that isolated target before retrying.
- Run a destructive-but-isolated restore drill with `BACKUP_DRILL_SOURCE_URI` and `BACKUP_DRILL_TARGET_URI` set to two empty, distinct loopback MongoDB databases, then run `cd server && npm run db:restore-drill`. The drill inserts synthetic data and drops only those two databases after checking that they were empty and local.
- CI runs npm audit, Semgrep, and Trivy. High and critical npm advisories fail the audit jobs; review the reported package advisories and update dependencies before merging.
- To create the attendance collections and indexes, back up the database, then run `cd server && npm run migrate:attendance`.

## Attendance And Biometrics

Attendance uses the existing Express/Mongoose/JWT stack. Teachers manage student sessions for their own courses; admins manage teacher sessions. Manual overrides require a reason and are audit logged. QR tokens are signed, expire after 45 seconds, are stored as hashes, and are single-use. Unique session/user indexes prevent duplicate records. The migration creates `attendance_sessions`, `attendance_records`, `face_embeddings`, `qr_tokens`, `attendance_challenges`, and `audit_log`.

An optional Python face-verifier service is included under `server/face-verifier`. It uses DeepFace FaceNet512 embeddings, DeepFace anti-spoof checks, and MediaPipe blink/head-turn challenges. The Node server calls it through `server/services/faceVerifierProvider.js`; embeddings are encrypted by Node with AES-256-GCM and compared at a 0.72 confidence threshold. No images are saved by the verifier. Calibrate this service with your approved camera conditions and obtain institutional privacy/security approval before using it for consequential attendance decisions; staff can use audited manual overrides when verification fails.

### Run the Python face verifier (Windows PowerShell)

```powershell
cd server/face-verifier
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -c "import secrets; print(secrets.token_urlsafe(48))"
$env:FACE_VERIFIER_API_TOKEN = "<paste-the-generated-token-here>"
python -m uvicorn app:app --host 127.0.0.1 --port 8090
```

Paste the generated token into the PowerShell assignment and use that same value in `server/.env`, along with:

```env
FACE_VERIFIER_MODULE=./services/faceVerifierProvider
FACE_VERIFIER_URL=http://127.0.0.1:8090
FACE_VERIFIER_API_TOKEN=<same-generated-token>
FACE_DATA_ENCRYPTION_KEY=<64-hex-character-key>
```

In a second terminal, start the LMS API with `cd server && npm run dev`, then start the client with `cd client && npm run dev`. The verifier downloads model weights on first use; expect the first enrollment or scan to take longer. For a remote verifier, use HTTPS and a private network; never expose its token or port publicly. Browser camera access requires HTTPS or localhost.

Camera access requires HTTPS or `localhost`. The current QR scanner uses the browser `BarcodeDetector` API, available in current Chromium-based browsers. Review institutional consent, retention, access, and biometric-data policies before production use.

## Attendance API

```text
GET    /api/attendance/qr-token
GET    /api/attendance/records/me
GET    /api/attendance/face/status
POST   /api/attendance/face/enroll
DELETE /api/attendance/face/enroll
POST   /api/attendance/sessions
GET    /api/attendance/sessions
GET    /api/attendance/sessions/:sessionId/challenge
POST   /api/attendance/sessions/:sessionId/scan
POST   /api/attendance/sessions/:sessionId/manual
POST   /api/attendance/sessions/:sessionId/close
GET    /api/attendance/sessions/:sessionId/records
GET    /api/attendance/courses/:courseId/summary
GET    /api/attendance/reports/teachers
PATCH  /api/attendance/records/:recordId
```
