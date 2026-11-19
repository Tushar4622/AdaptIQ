# AdaptIQ — Adaptive Learning Platform

A full-stack adaptive learning platform with role-based access (Student, Teacher, Admin), AI-powered skill extraction, gamification, real-time collaboration, and market trend analytics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas or local) + Mongoose ODM |
| Auth | JWT (access + refresh tokens) |
| AI | Groq API (default when configured) or Google Gemini |
| Realtime | Socket.io |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
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
    - `JWT_EXPIRES_IN=1d`
    - `AI_PROVIDER=groq`
    - `GROQ_API_KEY=<your_groq_key>`
    - `GROQ_MODEL=llama-3.3-70b-versatile`
    - `CLIENT_URL=https://<your-vercel-domain>`

Notes:
- `CLIENT_URL` supports multiple origins via comma-separated values.
- The server already enables proxy trust for correct rate-limiting behind Render.

### Frontend on Vercel

1. Create a new Vercel project and set Root Directory to `client`.
2. Framework preset: Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
    - `VITE_API_BASE_URL=https://<your-render-domain>/api`

### Production Checklist

- Do not commit `.env` files.
- Keep `JWT_SECRET` long and unique.
- Use only your deployed Vercel domain(s) in `CLIENT_URL`.
- Verify `/api/health` on Render after deploy.

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
- The existing MongoDB URI is intentionally preserved. Changing its database name from `smartedu` would point at a different, empty database and requires a separately planned migration.
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
