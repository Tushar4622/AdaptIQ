const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { requireSyllabusCourseAccess } = require('../middleware/syllabusAccess');
const syllabusCtrl = require('../controllers/syllabusController');

router.use(protect);

// ── Teacher Master Syllabus Routes ───────────────────────────────────────────
router.post(
  '/parse',
  restrictTo('teacher', 'admin'),
  requireSyllabusCourseAccess(),
  syllabusCtrl.parseAndCreateMasterSyllabus
);
router.get(
  '/master/:courseId',
  requireSyllabusCourseAccess({ allowEnrolledStudentRead: true }),
  syllabusCtrl.getMasterSyllabus
);
router.put(
  '/master/:courseId',
  restrictTo('teacher', 'admin'),
  requireSyllabusCourseAccess(),
  syllabusCtrl.updateMasterSyllabus
);

// ── Student Personalized Syllabus Routes ─────────────────────────────────────
router.get(
  '/personalized/:courseId',
  requireSyllabusCourseAccess({
    allowEnrolledStudentRead: true,
    personalizedPlanRead: true,
  }),
  syllabusCtrl.getPersonalizedSyllabus
);
router.get(
  '/plans/:courseId',
  restrictTo('teacher', 'admin'),
  requireSyllabusCourseAccess(),
  syllabusCtrl.getCoursePersonalizedPlans
);
router.put(
  '/personalized/:planId/override',
  restrictTo('teacher', 'admin'),
  requireSyllabusCourseAccess(),
  syllabusCtrl.teacherOverridePersonalizedSyllabus
);

module.exports = router;
