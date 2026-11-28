const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { requireConceptCreationAccess } = require('../middleware/objectAccess');
const competencyCtrl = require('../controllers/competencyController');

// Learner mastery & gaps endpoint (authenticated student)
router.get('/learner/mastery', protect, competencyCtrl.getLearnerMastery);

// Cohort-wide concept mastery & gap analysis for faculty
router.get('/cohort-gaps/:courseId', protect, restrictTo('teacher', 'admin'), competencyCtrl.getCohortGaps);

// Prerequisite Directed Acyclic Graph (DAG) for visual rendering
router.get('/graph/:courseId', protect, competencyCtrl.getCompetencyGraph);
router.get('/graph', protect, competencyCtrl.getCompetencyGraph);

// Competencies collection
router.get('/', protect, competencyCtrl.getCompetencies);
router.post('/', protect, restrictTo('teacher', 'admin'), competencyCtrl.createCompetency);

// Single competency
router.get('/:id', protect, competencyCtrl.getCompetencyById);
router.put('/:id', protect, restrictTo('teacher', 'admin'), competencyCtrl.updateCompetency);
router.delete('/:id', protect, restrictTo('teacher', 'admin'), competencyCtrl.deleteCompetency);

// Concept sub-items
router.post(
  '/concept',
  protect,
  restrictTo('teacher', 'admin'),
  requireConceptCreationAccess,
  competencyCtrl.createConcept
);

module.exports = router;
