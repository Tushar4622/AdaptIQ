// ─── Assignments ──────────────────────────────────────────────────────────────
const express = require('express');
const fs = require('fs');
const crypto = require('node:crypto');
const multer = require('multer');
const assignmentRouter = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  requireAssignmentEnrollment,
  requireSubmissionCourseOwner,
} = require('../middleware/objectAccess');
const { Assignment, Submission, Enrollment } = require('../models/index');
const Course = require('../models/Course');
const { addXpToUser, awardEligibleBadges } = require('../utils/gamification');
const { createNotification, createNotifications } = require('../utils/notifications');
const { validateRequestBody } = require('../middleware/requestValidation');
const {
  ASSIGNMENT_UPLOAD_DIR,
  MAX_ASSIGNMENT_FILE_SIZE,
  MAX_ASSIGNMENT_FILES,
  processUploadedFiles,
} = require('../services/assignmentUploads');
const { createClamAvScanner } = require('../services/clamAvScanner');

fs.mkdirSync(ASSIGNMENT_UPLOAD_DIR, { recursive: true, mode: 0o700 });
const scanUploadedFile = createClamAvScanner();

const assignmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ASSIGNMENT_UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
});

const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: {
    fileSize: MAX_ASSIGNMENT_FILE_SIZE,
    files: MAX_ASSIGNMENT_FILES,
    fieldSize: 100_000,
    fields: 20,
    parts: 30,
  },
});

const receiveAssignmentFiles = (req, res, next) => {
  assignmentUpload.array('files', MAX_ASSIGNMENT_FILES)(req, res, (error) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);

    const isLimitError = error.code.startsWith('LIMIT_');
    return res.status(isLimitError ? 413 : 400).json({
      error: isLimitError ? 'Assignment upload limits were exceeded.' : 'Invalid multipart upload.',
    });
  });
};

const toPrivateUploadUrl = (fileName) => `/api/assignments/files/${fileName}`;

const ensureTeacherOwnsCourse = (course, user) => {
  if (user.role === 'admin') return true;
  return String(course.instructor) === String(user._id);
};

assignmentRouter.get('/course/:courseId', protect, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).select('title instructor');
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (req.user.role === 'teacher' && !ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only access assignments for your own courses.' });
    }

    if (req.user.role === 'student') {
      const enrolled = await Enrollment.exists({ student: req.user._id, course: req.params.courseId });
      if (!enrolled) {
        return res.status(403).json({ error: 'Enroll in this course before viewing assignments.' });
      }
    }

    const assignments = await Assignment.find({ course: req.params.courseId }).sort('dueDate');

    const now = Date.now();
    const withStatus = assignments.map((assignment) => {
      const item = assignment.toObject();
      item.isClosed = new Date(item.dueDate).getTime() < now;
      return item;
    });

    res.json({ assignments: withStatus });
  } catch (err) { next(err); }
});

assignmentRouter.get('/course/:courseId/my-submissions', protect, restrictTo('student'), async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ course: req.params.courseId }).select('_id');
    const assignmentIds = assignments.map((assignment) => assignment._id);

    const submissions = await Submission.find({
      student: req.user._id,
      assignment: { $in: assignmentIds },
    })
      .select('assignment status score feedback createdAt gradedAt attachments')
      .sort('-createdAt');

    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

assignmentRouter.post(
  '/upload',
  protect,
  restrictTo('teacher', 'admin'),
  receiveAssignmentFiles,
  validateRequestBody,
  async (req, res, next) => {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one file.' });
    }

    let processedFiles;
    try {
      processedFiles = await processUploadedFiles(files, {
        storageDirectory: ASSIGNMENT_UPLOAD_DIR,
        scanFile: scanUploadedFile,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return next(error);
    }

    const uploadedFiles = processedFiles.map((file, index) => ({
      name: `Attachment ${index + 1}.${file.extension}`,
      fileName: file.fileName,
      size: file.size,
      mimeType: file.mimeType,
      url: toPrivateUploadUrl(file.fileName),
    }));

    res.status(201).json({
      files: uploadedFiles,
      urls: uploadedFiles.map((file) => file.url),
    });
  }
);

assignmentRouter.post('/', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const { course: courseId, title, description, dueDate, maxScore, xpReward, attachments } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId).select('title instructor');
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (!ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only add assignments to your own courses.' });
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ error: 'A valid assignment deadline is required.' });
    }

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    const assignment = await Assignment.create({
      course: courseId,
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      dueDate: parsedDueDate,
      maxScore: Number(maxScore) || 100,
      xpReward: Number(xpReward) || 100,
      attachments: normalizedAttachments,
    });

    const enrollments = await Enrollment.find({ course: courseId }).select('student');
    const studentIds = Array.from(new Set(enrollments.map((enrollment) => String(enrollment.student))));

    if (studentIds.length > 0) {
      await createNotifications({
        io: req.io,
        entries: studentIds.map((studentId) => ({
          user: studentId,
          type: 'assignment-created',
          title: 'New assignment posted',
          message: `${req.user.name} added "${assignment.title}" in ${course.title}.`,
          payload: {
            courseId: course._id,
            assignmentId: assignment._id,
            route: `/courses/${course._id}?tab=assessments`,
          },
        })),
      });
    }

    res.status(201).json({ assignment, notifiedStudents: studentIds.length });
  } catch (err) { next(err); }
});

assignmentRouter.post('/:id/submit', protect, restrictTo('student'), requireAssignmentEnrollment, async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('course', 'title instructor');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

    if (new Date(assignment.dueDate).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Assignment submission window is closed.' });
    }

    const existing = await Submission.findOne({ assignment: req.params.id, student: req.user._id });
    if (existing) return res.status(409).json({ error: 'Already submitted.' });

    const submission = await Submission.create({
      assignment: req.params.id,
      student: req.user._id,
      content: req.body.content,
      attachments: req.body.attachments || [],
    });

    const teacherId = assignment.course?.instructor;
    if (teacherId && String(teacherId) !== String(req.user._id)) {
      await createNotification({
        io: req.io,
        entry: {
          user: teacherId,
          type: 'assignment-submitted',
          title: 'Assignment submitted',
          message: `${req.user.name} submitted "${assignment.title}".`,
          payload: {
            courseId: assignment.course?._id,
            assignmentId: assignment._id,
            submissionId: submission._id,
            route: `/courses/${assignment.course?._id}/analytics`,
          },
        },
      });
    }

    res.status(201).json({ submission });
  } catch (err) { next(err); }
});

assignmentRouter.put('/:id/grade', protect, restrictTo('teacher', 'admin'), requireSubmissionCourseOwner, async (req, res, next) => {
  try {
    const sub = await Submission.findByIdAndUpdate(
      req.params.id,
      { score: req.body.score, feedback: req.body.feedback, status: 'graded', gradedBy: req.user._id, gradedAt: new Date() },
      { new: true }
    ).populate('student', 'name email');
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });

    let awardedBadges = [];

    // Award XP
    const assignment = await Assignment.findById(sub.assignment);
    if (assignment && sub.score >= 60) {
      const updatedUser = await addXpToUser(sub.student._id, assignment.xpReward);
      awardedBadges = await awardEligibleBadges(sub.student._id, ['reach_expert'], {
        userDoc: updatedUser,
      });
    }

    res.json({ submission: sub, awardedBadges });
  } catch (err) { next(err); }
});

assignmentRouter.get('/:courseId/submissions', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).select('instructor');
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (!ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only access submissions for your own courses.' });
    }

    const assignments = await Assignment.find({ course: req.params.courseId });
    const ids = assignments.map(a => a._id);
    const submissions = await Submission.find({ assignment: { $in: ids } })
      .populate('student', 'name email avatar')
      .populate('assignment', 'title dueDate')
      .sort('-createdAt');
    res.json({ submissions });
  } catch (err) { next(err); }
});

module.exports = assignmentRouter;
