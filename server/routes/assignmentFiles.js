const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Assignment, Enrollment } = require('../models');
const { protect } = require('../middleware/auth');
const { ASSIGNMENT_UPLOAD_DIR } = require('../services/assignmentUploads');

const router = express.Router();
const LEGACY_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'assignments');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getAttachmentPattern = (fileName) => new RegExp(
  `/(?:api/assignments/files|uploads/assignments)/${escapeRegex(fileName)}$`
);

const findFile = async (directory, fileName) => {
  const filePath = path.resolve(directory, fileName);
  if (path.dirname(filePath) !== path.resolve(directory)) return null;

  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? filePath : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

router.get('/:fileName', protect, async (req, res, next) => {
  try {
    const { fileName } = req.params;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(fileName)) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const assignment = await Assignment.findOne({
      attachments: getAttachmentPattern(fileName),
    }).populate('course', 'instructor');
    if (!assignment?.course) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const userId = String(req.user.id || req.user._id);
    const isAdmin = req.user.role === 'admin';
    const isCourseTeacher = req.user.role === 'teacher'
      && String(assignment.course.instructor) === userId;
    const isEnrolledStudent = req.user.role === 'student'
      && await Enrollment.exists({ student: userId, course: assignment.course._id });
    if (!isAdmin && !isCourseTeacher && !isEnrolledStudent) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const filePath = await findFile(ASSIGNMENT_UPLOAD_DIR, fileName)
      || await findFile(LEGACY_UPLOAD_DIR, fileName);
    if (!filePath) return res.status(404).json({ error: 'Attachment not found.' });

    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.attachment(fileName);
    res.type('application/octet-stream');
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
