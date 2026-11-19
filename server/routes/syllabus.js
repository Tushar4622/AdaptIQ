const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const syllabusCtrl = require('../controllers/syllabusController');

// ── Teacher Master Syllabus Routes ───────────────────────────────────────────
router.post('/parse', protect, restrictTo('teacher', 'admin'), syllabusCtrl.parseAndCreateMasterSyllabus);
router.get('/master/:courseId', protect, syllabusCtrl.getMasterSyllabus);
router.put('/master/:courseId', protect, restrictTo('teacher', 'admin'), syllabusCtrl.updateMasterSyllabus);

// ── Student Personalized Syllabus Routes ─────────────────────────────────────
router.get('/personalized/:courseId', protect, syllabusCtrl.getPersonalizedSyllabus);
router.get('/plans/:courseId', protect, restrictTo('teacher', 'admin'), syllabusCtrl.getCoursePersonalizedPlans);
router.put('/personalized/:planId/override', protect, restrictTo('teacher', 'admin'), syllabusCtrl.teacherOverridePersonalizedSyllabus);

module.exports = router;
