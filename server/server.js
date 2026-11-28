require('dotenv').config();
const { getAIProviderName, isAIConfigured } = require('./services/aiProvider');
try {
  const providerName = getAIProviderName();
  if (!isAIConfigured()) {
    const keyName = providerName === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';
    console.error(`[startup] ${keyName} is missing. AI generation is unavailable; non-AI LMS features will continue to run.`);
  }
} catch (error) {
  console.error(`[startup] AI provider configuration failed (${error?.name || 'Error'}).`);
}
if (!/^[a-f0-9]{64}$/i.test(process.env.FACE_DATA_ENCRYPTION_KEY || '')) {
  console.warn('[startup] FACE_DATA_ENCRYPTION_KEY is missing or invalid. Face enrollment is unavailable.');
}
if (!/^[a-f0-9]{64}$/i.test(process.env.MFA_ENCRYPTION_KEY || '')) {
  console.warn('[startup] MFA_ENCRYPTION_KEY is missing or invalid. Teacher/admin MFA sign-in and setup are unavailable.');
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimitPackage = require('express-rate-limit');
const rateLimit = rateLimitPackage.rateLimit || rateLimitPackage;
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { loadFaceVerifier } = require('./services/faceVerifierLoader');
const { createSocketSecurity } = require('./services/socketSecurity');
const requestId = require('./middleware/requestId');
const { auditDeniedRequests } = require('./middleware/securityAudit');
const { validatePagination } = require('./middleware/paginationValidation');
const {
  JSON_BODY_LIMIT,
  validateRequestBody,
} = require('./middleware/requestValidation');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const quizRoutes = require('./routes/quizzes');
const assignmentRoutes = require('./routes/assignments');
const assignmentFileRoutes = require('./routes/assignmentFiles');
const badgeRoutes = require('./routes/badges');
const discussionRoutes = require('./routes/discussions');
const skillRoutes = require('./routes/skills');
const marketRoutes = require('./routes/market');
const adminRoutes = require('./routes/admin');
const liveClassRoutes = require('./routes/liveClasses');
const competencyRoutes = require('./routes/competencies');
const recommendationRoutes = require('./routes/recommendations');
const syllabusRoutes = require('./routes/syllabus');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const server = http.createServer(app);
try {
  app.locals.faceVerifier = loadFaceVerifier();
  if (app.locals.faceVerifier) console.log('[startup] Server-side face verifier loaded.');
} catch (error) {
  app.locals.faceVerifier = null;
  console.error(`[startup] Face verifier unavailable (${error?.name || 'Error'}).`);
}

app.disable('x-powered-by');
app.use(requestId);
app.use(auditDeniedRequests);

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173'];
if (allowedOrigins.length === 0) {
  throw new Error('CLIENT_URL must define at least one allowed browser origin in production.');
}

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (e.g., health checks, curl, server-to-server)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    return callback(Object.assign(new Error('Not allowed by CORS'), { statusCode: 403 }));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Auth-Token-Mode'],
  exposedHeaders: ['X-Request-ID'],
};

// Socket.io for real-time discussions
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Render/other platforms sit behind a proxy; trust first hop for rate limiting and IPs.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const sendLimitResponse = (req, res, _next, options) => {
  const resetAt = req.rateLimit?.resetTime?.getTime?.();
  const retryAfterSeconds = resetAt
    ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    : 60;
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(options.statusCode).json(options.message);
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skip: (req) => Boolean(getRateLimitUserId(req)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: sendLimitResponse,
});
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  keyGenerator: (req) => `user:${getRateLimitUserId(req)}`,
  skip: (req) => !getRateLimitUserId(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: sendLimitResponse,
});
app.use('/api', limiter, userLimiter);

function getRateLimitUserId(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;

  try {
    const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    return decoded.id ? String(decoded.id) : null;
  } catch {
    return null;
  }
}

// Auth endpoints get stricter limiting
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// Body parsing
app.use('/api/attendance/face/enroll', express.json({ limit: '16mb' }));
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 500 }));
app.use(cookieParser());
app.use('/api', validatePagination);
app.use('/api', validateRequestBody);

// Attach io to request for use in controllers
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// API Routes
app.get('/', (_req, res) => {
  res.json({ message: 'Api is running!' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/uploads/assignments', assignmentFileRoutes);
app.use('/api/assignments/files', assignmentFileRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV, timestamp: new Date() });
});

// Socket.IO connections and events use the same access-token and object-access rules as the API.
createSocketSecurity().install(io);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`\nAdaptIQ API running on port ${PORT} [${process.env.NODE_ENV}]\n`);
});

module.exports = { app, io };
