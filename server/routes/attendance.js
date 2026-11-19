const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const attendanceCtrl = require('../controllers/attendanceController');

const router = express.Router();

router.use(protect);

router.get('/qr-token', restrictTo('student', 'teacher'), attendanceCtrl.issueQrToken);
router.get('/records/me', restrictTo('student'), attendanceCtrl.getMyRecords);
router.get('/face/status', restrictTo('student', 'teacher'), attendanceCtrl.getFaceStatus);
router.post('/face/enroll', restrictTo('student', 'teacher'), attendanceCtrl.enrollFace);
router.delete('/face/enroll', restrictTo('student', 'teacher'), attendanceCtrl.removeFaceEnrollment);

router.get('/courses/:courseId/summary', restrictTo('teacher', 'admin'), attendanceCtrl.getCourseSummary);
router.get('/reports/teachers', restrictTo('admin'), attendanceCtrl.getTeacherReport);
router.get('/sessions', restrictTo('teacher', 'admin'), attendanceCtrl.listSessions);
router.post('/sessions', restrictTo('teacher', 'admin'), attendanceCtrl.createSession);
router.get('/sessions/:sessionId/records', restrictTo('teacher', 'admin'), attendanceCtrl.getSessionRecords);
router.post('/sessions/:sessionId/manual', restrictTo('teacher', 'admin'), attendanceCtrl.markManual);
router.get('/sessions/:sessionId/challenge', restrictTo('teacher', 'admin'), attendanceCtrl.createLivenessChallenge);
router.post('/sessions/:sessionId/scan', restrictTo('teacher', 'admin'), attendanceCtrl.verifyQrAndMark);
router.post('/sessions/:sessionId/close', restrictTo('teacher', 'admin'), attendanceCtrl.closeSession);
router.patch('/records/:recordId', restrictTo('teacher', 'admin'), attendanceCtrl.editRecord);

module.exports = router;