const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceAuditLog = require('../models/AttendanceAuditLog');
const AttendanceChallenge = require('../models/AttendanceChallenge');
const FaceEmbedding = require('../models/FaceEmbedding');
const QRToken = require('../models/QRToken');
const Course = require('../models/Course');
const User = require('../models/User');
const { Enrollment } = require('../models');
const { decryptFaceData, encryptFaceData } = require('../utils/faceDataCrypto');

const QR_LIFETIME_SECONDS = 45;
const FACE_MATCH_THRESHOLD = 0.72;
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const writeAudit = (actor, action, targetType, targetId, metadata = {}) =>
  AttendanceAuditLog.create({ actor, action, targetType, targetId, metadata });

const canManageSession = (session, user) => {
  if (user.role === 'admin') return true;
  return session.targetRole === 'student'
    && user.role === 'teacher'
    && String(session.teacher) === String(user._id);
};

const getSession = async (sessionId) => {
  if (!isValidObjectId(sessionId)) return null;
  return AttendanceSession.findById(sessionId).populate('course', 'title instructor');
};

const ensureCourseTeacher = async (courseId, user) => {
  if (!isValidObjectId(courseId)) return null;
  const course = await Course.findById(courseId).select('title instructor');
  if (!course) return null;
  if (user.role === 'teacher' && String(course.instructor) !== String(user._id)) return false;
  return course;
};

exports.issueQrToken = async (req, res, next) => {
  try {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + QR_LIFETIME_SECONDS * 1000);
    const token = jwt.sign(
      { sub: String(req.user._id), role: req.user.role, jti: tokenId },
      process.env.JWT_SECRET,
      { expiresIn: QR_LIFETIME_SECONDS, audience: 'attendance-qr' }
    );

    await QRToken.create({
      tokenHash: hashToken(token),
      tokenId,
      user: req.user._id,
      role: req.user.role,
      expiresAt,
    });

    res.json({ token, expiresAt, refreshAfterSeconds: QR_LIFETIME_SECONDS });
  } catch (error) {
    next(error);
  }
};

exports.enrollFace = async (req, res, next) => {
  try {
    const { consent, photos } = req.body;
    if (consent !== true) return res.status(400).json({ error: 'Face enrollment consent is required.' });
    if (!Array.isArray(photos) || photos.length < 3 || photos.length > 5) {
      return res.status(400).json({ error: 'Provide 3 to 5 enrollment captures.' });
    }
    if (photos.some((photo) => typeof photo !== 'string' || photo.length > 3_000_000)) {
      return res.status(400).json({ error: 'Enrollment captures must be valid, size-limited images.' });
    }

    const faceVerifier = req.app.locals.faceVerifier;
    if (!faceVerifier || typeof faceVerifier.enroll !== 'function') {
      return res.status(503).json({ error: 'Face enrollment is disabled until an approved server-side face model is configured.' });
    }
    const enrollment = await faceVerifier.enroll({ userId: req.user._id, role: req.user.role, photos });
    const { embeddings, modelVersion } = enrollment || {};
    const vectorLength = Array.isArray(embeddings?.[0]) ? embeddings[0].length : 0;
    if (
      !Array.isArray(embeddings)
      || embeddings.length < 3
      || embeddings.length > 5
      || vectorLength < 64
      || vectorLength > 2048
      || embeddings.some((vector) => (
        !Array.isArray(vector)
        || vector.length !== vectorLength
        || vector.some((value) => !Number.isFinite(Number(value)))
      ))
      || !String(modelVersion || '').trim()
    ) {
      return res.status(502).json({ error: 'The configured face model returned invalid enrollment data.' });
    }

    const encrypted = encryptFaceData(embeddings);
    const faceEmbedding = await FaceEmbedding.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          ...encrypted,
          role: req.user.role,
          modelVersion: String(modelVersion).trim().slice(0, 80),
          consentAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).select('user role modelVersion consentAt updatedAt');

    await writeAudit(req.user._id, 'face_enrollment_consented', 'FaceEmbedding', faceEmbedding._id, {
      embeddingCount: embeddings.length,
      modelVersion: faceEmbedding.modelVersion,
    });
    res.status(201).json({ faceEnrollment: faceEmbedding });
  } catch (error) {
    if (error.message.includes('FACE_DATA_ENCRYPTION_KEY')) {
      return res.status(503).json({ error: 'Face enrollment is unavailable until FACE_DATA_ENCRYPTION_KEY is configured.' });
    }
    next(error);
  }
};

exports.getFaceStatus = async (req, res, next) => {
  try {
    const enrollment = await FaceEmbedding.findOne({ user: req.user._id })
      .select('role modelVersion consentAt updatedAt');
    res.json({ enrolled: Boolean(enrollment), enrollment });
  } catch (error) {
    next(error);
  }
};

exports.removeFaceEnrollment = async (req, res, next) => {
  try {
    const enrollment = await FaceEmbedding.findOneAndDelete({ user: req.user._id }).select('_id');
    if (enrollment) {
      await writeAudit(req.user._id, 'face_enrollment_removed', 'FaceEmbedding', enrollment._id);
    }
    res.json({ removed: Boolean(enrollment) });
  } catch (error) {
    next(error);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const targetRole = req.user.role === 'teacher' ? 'student' : 'teacher';
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Session name is required.' });

    let course = null;
    if (targetRole === 'student') {
      course = await ensureCourseTeacher(req.body.courseId, req.user);
      if (course === false) return res.status(403).json({ error: 'You can only take attendance for your own courses.' });
      if (!course) return res.status(400).json({ error: 'A valid course is required for student attendance.' });
    }

    const session = await AttendanceSession.create({
      name,
      targetRole,
      course: course?._id || null,
      teacher: req.user._id,
      openedBy: req.user._id,
    });
    await writeAudit(req.user._id, 'session_opened', 'AttendanceSession', session._id, {
      targetRole,
      course: session.course,
    });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin'
      ? { targetRole: 'teacher' }
      : { targetRole: 'student', teacher: req.user._id };
    if (req.query.courseId && isValidObjectId(req.query.courseId)) query.course = req.query.courseId;
    if (req.query.from || req.query.to) {
      query.startedAt = {};
      if (req.query.from) query.startedAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        query.startedAt.$lte = toDate;
      }
    }

    const sessions = await AttendanceSession.find(query)
      .populate('course', 'title')
      .populate('teacher', 'name email')
      .sort('-startedAt')
      .limit(250);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

exports.closeSession = async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Attendance session not found.' });
    if (!canManageSession(session, req.user)) return res.status(403).json({ error: 'You cannot close this session.' });
    if (session.status === 'closed') return res.json({ session });

    session.status = 'closed';
    session.closedAt = new Date();
    await session.save();
    await writeAudit(req.user._id, 'session_closed', 'AttendanceSession', session._id);
    res.json({ session });
  } catch (error) {
    next(error);
  }
};

exports.getSessionRecords = async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Attendance session not found.' });
    if (!canManageSession(session, req.user)) return res.status(403).json({ error: 'You cannot view this session.' });

    const records = await AttendanceRecord.find({ session: session._id })
      .populate('subject', 'name email role')
      .populate('markedBy', 'name role')
      .sort('markedAt');
    let eligibleSubjects;
    if (session.targetRole === 'student') {
      const enrollments = await Enrollment.find({ course: session.course?._id || session.course })
        .populate('student', 'name email role')
        .sort('createdAt');
      eligibleSubjects = enrollments.map((enrollment) => enrollment.student).filter(Boolean);
    } else {
      eligibleSubjects = await User.find({ role: 'teacher', isActive: true })
        .select('name email role')
        .sort('name');
    }

    res.json({ session, records, eligibleSubjects });
  } catch (error) {
    next(error);
  }
};

exports.markManual = async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Attendance session not found.' });
    if (!canManageSession(session, req.user)) return res.status(403).json({ error: 'You cannot manage this session.' });
    if (session.status !== 'open') return res.status(409).json({ error: 'This attendance session is closed.' });

    const { userId, status = 'present', reason } = req.body;
    if (!isValidObjectId(userId)) return res.status(400).json({ error: 'A valid attendee is required.' });
    if (!['present', 'late', 'absent'].includes(status)) return res.status(400).json({ error: 'Invalid attendance status.' });
    if (String(reason || '').trim().length < 8) {
      return res.status(400).json({ error: 'A brief reason is required for manual attendance.' });
    }

    const subject = await User.findOne({ _id: userId, role: session.targetRole, isActive: true }).select('_id role');
    if (!subject) return res.status(404).json({ error: 'Attendee was not found or has the wrong role.' });
    if (session.targetRole === 'student') {
      const enrolled = await Enrollment.exists({ student: subject._id, course: session.course?._id || session.course });
      if (!enrolled) return res.status(403).json({ error: 'This student is not enrolled in the session course.' });
    }

    const priorRecord = await AttendanceRecord.findOne({ session: session._id, subject: subject._id }).select('_id');
    const record = await AttendanceRecord.findOneAndUpdate(
      { session: session._id, subject: subject._id },
      {
        $set: {
          subjectRole: session.targetRole,
          course: session.course?._id || session.course,
          status,
          markedAt: new Date(),
          markedBy: req.user._id,
          method: 'manual_override',
          faceConfidence: null,
          overrideReason: String(reason).trim(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('subject', 'name email role').populate('markedBy', 'name role');

    await writeAudit(req.user._id, priorRecord ? 'record_edited' : 'record_marked', 'AttendanceRecord', record._id, {
      session: session._id,
      subject: subject._id,
      status,
      reason: String(reason).trim(),
      method: 'manual_override',
    });
    res.status(priorRecord ? 200 : 201).json({ record });
  } catch (error) {
    next(error);
  }
};

exports.editRecord = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.recordId)) return res.status(400).json({ error: 'Invalid attendance record.' });
    const record = await AttendanceRecord.findById(req.params.recordId).populate('session');
    if (!record) return res.status(404).json({ error: 'Attendance record not found.' });
    if (!canManageSession(record.session, req.user)) return res.status(403).json({ error: 'You cannot edit this record.' });
    if (!['present', 'late', 'absent'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid attendance status.' });
    if (String(req.body.reason || '').trim().length < 8) return res.status(400).json({ error: 'A brief edit reason is required.' });

    const previousStatus = record.status;
    record.status = req.body.status;
    record.markedAt = new Date();
    record.markedBy = req.user._id;
    record.method = 'manual_override';
    record.faceConfidence = null;
    record.overrideReason = String(req.body.reason).trim();
    await record.save();
    await writeAudit(req.user._id, 'record_edited', 'AttendanceRecord', record._id, {
      previousStatus,
      status: record.status,
      reason: record.overrideReason,
    });
    await record.populate([{ path: 'subject', select: 'name email role' }, { path: 'markedBy', select: 'name role' }]);
    res.json({ record });
  } catch (error) {
    next(error);
  }
};

exports.createLivenessChallenge = async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Attendance session not found.' });
    if (!canManageSession(session, req.user)) return res.status(403).json({ error: 'You cannot scan for this session.' });
    if (session.status !== 'open') return res.status(409).json({ error: 'This attendance session is closed.' });
    const faceVerifier = req.app.locals.faceVerifier;
    if (!faceVerifier || typeof faceVerifier.verify !== 'function') {
      return res.status(503).json({ error: 'Camera verification is disabled until an approved server-side face and liveness model is configured.' });
    }

    const actions = ['blink', 'turn-left', 'turn-right'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60000);
    const token = jwt.sign(
      { sub: String(req.user._id), session: String(session._id), jti: tokenId, action },
      process.env.JWT_SECRET,
      { expiresIn: 60, audience: 'attendance-liveness' }
    );
    await AttendanceChallenge.create({
      tokenHash: hashToken(token),
      tokenId,
      session: session._id,
      issuedTo: req.user._id,
      action,
      expiresAt,
    });
    res.json({ token, action, expiresAt });
  } catch (error) {
    next(error);
  }
};

exports.verifyQrAndMark = async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Attendance session not found.' });
    if (!canManageSession(session, req.user)) return res.status(403).json({ error: 'You cannot scan for this session.' });
    if (session.status !== 'open') return res.status(409).json({ error: 'This attendance session is closed.' });

    let claims;
    try {
      claims = jwt.verify(String(req.body.token || ''), process.env.JWT_SECRET, { audience: 'attendance-qr' });
    } catch {
      return res.status(401).json({ error: 'The QR token is invalid or expired. Ask the attendee to refresh it.' });
    }
    if (claims.role !== session.targetRole || !isValidObjectId(claims.sub)) {
      return res.status(403).json({ error: 'This QR code is not valid for this attendance session.' });
    }
    const tokenRecord = await QRToken.findOne({
      tokenHash: hashToken(String(req.body.token)),
      tokenId: claims.jti,
      user: claims.sub,
      role: claims.role,
      expiresAt: { $gt: new Date() },
      consumedAt: null,
    });
    if (!tokenRecord) return res.status(409).json({ error: 'This QR code has expired or has already been used.' });

    const user = await User.findOne({ _id: claims.sub, role: session.targetRole, isActive: true }).select('_id');
    if (!user) return res.status(404).json({ error: 'Attendee is no longer active.' });
    if (session.targetRole === 'student') {
      const enrolledInCourse = await Enrollment.exists({ student: user._id, course: session.course?._id || session.course });
      if (!enrolledInCourse) return res.status(403).json({ error: 'Student is not enrolled in this course.' });
    }

    let challengeClaims;
    try {
      challengeClaims = jwt.verify(String(req.body.challengeToken || ''), process.env.JWT_SECRET, { audience: 'attendance-liveness' });
    } catch {
      return res.status(401).json({ error: 'The liveness challenge is invalid or expired. Start a new scan.' });
    }
    if (
      String(challengeClaims.sub) !== String(req.user._id)
      || String(challengeClaims.session) !== String(session._id)
    ) {
      return res.status(403).json({ error: 'This liveness challenge belongs to a different staff member or session.' });
    }
    const challengeRecord = await AttendanceChallenge.findOne({
      tokenHash: hashToken(String(req.body.challengeToken)),
      tokenId: challengeClaims.jti,
      session: session._id,
      issuedTo: req.user._id,
      expiresAt: { $gt: new Date() },
      consumedAt: null,
    });
    if (!challengeRecord) return res.status(409).json({ error: 'This liveness challenge has expired or has already been used.' });

    const enrollment = await FaceEmbedding.findOne({ user: claims.sub })
      .select('user role modelVersion consentAt +ciphertext +iv +authTag');
    if (!enrollment) return res.status(403).json({ error: 'Attendee has not completed face enrollment.' });

    const faceVerifier = req.app.locals.faceVerifier;
    if (!faceVerifier || typeof faceVerifier.verify !== 'function') {
      return res.status(503).json({ error: 'Automatic attendance is disabled until a server-side face and liveness verifier is configured.' });
    }
    if (
      !Array.isArray(req.body.faceImages)
      || req.body.faceImages.length < 3
      || req.body.faceImages.length > 10
      || req.body.faceImages.some((image) => typeof image !== 'string' || image.length > 1500000)
    ) {
      return res.status(400).json({ error: 'A short sequence of live camera frames is required.' });
    }

    let templates;
    try {
      templates = decryptFaceData(enrollment);
    } catch (error) {
      return res.status(503).json({ error: 'Stored face enrollment cannot be decrypted. Contact an administrator.' });
    }
    const verification = await faceVerifier.verify({
      userId: claims.sub,
      images: req.body.faceImages,
      templates,
      modelVersion: enrollment.modelVersion,
      challenge: challengeClaims.action,
    });
    if (!verification?.live || Number(verification.confidence) < FACE_MATCH_THRESHOLD) {
      return res.status(403).json({ error: 'Face or liveness verification failed. Ask staff for a manual review.' });
    }

    const consumed = await QRToken.findOneAndUpdate(
      { _id: tokenRecord._id, consumedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    );
    if (!consumed) return res.status(409).json({ error: 'This QR code has already been used.' });
    const consumedChallenge = await AttendanceChallenge.findOneAndUpdate(
      { _id: challengeRecord._id, consumedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    );
    if (!consumedChallenge) return res.status(409).json({ error: 'This liveness challenge has already been used.' });

    const record = await AttendanceRecord.create({
      session: session._id,
      subject: user._id,
      subjectRole: session.targetRole,
      course: session.course?._id || session.course,
      status: 'present',
      markedBy: req.user._id,
      method: 'qr_face',
      faceConfidence: Number(verification.confidence),
    });
    await writeAudit(req.user._id, 'record_marked', 'AttendanceRecord', record._id, {
      session: session._id,
      subject: user._id,
      method: 'qr_face',
      confidence: record.faceConfidence,
    });
    res.status(201).json({ record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Attendance is already recorded for this attendee and session.' });
    next(error);
  }
};

exports.getCourseSummary = async (req, res, next) => {
  try {
    const course = await ensureCourseTeacher(req.params.courseId, req.user);
    if (course === false) return res.status(403).json({ error: 'You can only view attendance for your own courses.' });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const sessionQuery = { course: course._id, targetRole: 'student', status: 'closed' };
    if (req.query.from || req.query.to) {
      sessionQuery.startedAt = {};
      if (req.query.from && !Number.isNaN(Date.parse(req.query.from))) {
        sessionQuery.startedAt.$gte = new Date(req.query.from);
      }
      if (req.query.to && !Number.isNaN(Date.parse(req.query.to))) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        sessionQuery.startedAt.$lte = toDate;
      }
    }

    const [sessions, enrollments] = await Promise.all([
      AttendanceSession.find(sessionQuery).select('_id'),
      Enrollment.find({ course: course._id }).populate('student', 'name email'),
    ]);
    const records = await AttendanceRecord.find({
      course: course._id,
      session: { $in: sessions.map((session) => session._id) },
    }).select('subject status');
    const recordsByStudent = new Map();
    records.forEach((record) => {
      const key = String(record.subject);
      recordsByStudent.set(key, (recordsByStudent.get(key) || 0) + (record.status === 'present' || record.status === 'late' ? 1 : 0));
    });
    const students = enrollments.map(({ student }) => {
      if (!student) return null;
      const attended = recordsByStudent.get(String(student._id)) || 0;
      const percentage = sessions.length ? Math.round((attended / sessions.length) * 100) : 0;
      return { ...student.toObject(), attended, totalSessions: sessions.length, percentage, lowAttendance: sessions.length > 0 && percentage < 75 };
    }).filter(Boolean);

    res.json({ course, totalSessions: sessions.length, students });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherReport = async (req, res, next) => {
  try {
    const query = { targetRole: 'teacher' };
    const start = req.query.from ? new Date(req.query.from) : null;
    const end = req.query.to ? new Date(req.query.to) : null;
    if (start || end) {
      query.startedAt = {};
      if (start && !Number.isNaN(start.getTime())) query.startedAt.$gte = start;
      if (end && !Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.startedAt.$lte = end;
      }
    }
    const sessions = await AttendanceSession.find(query).sort('-startedAt').limit(500);
    const records = await AttendanceRecord.find({ session: { $in: sessions.map((session) => session._id) } })
      .populate('subject', 'name email role')
      .populate('markedBy', 'name role')
      .populate('session', 'name startedAt status');
    res.json({ sessions, records });
  } catch (error) {
    next(error);
  }
};

exports.getMyRecords = async (req, res, next) => {
  try {
    const records = await AttendanceRecord.find({ subject: req.user._id })
      .populate('session', 'name startedAt status targetRole')
      .populate('course', 'title')
      .sort('-markedAt')
      .limit(250);
    res.json({ records });
  } catch (error) {
    next(error);
  }
};