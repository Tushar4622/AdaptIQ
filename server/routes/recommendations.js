const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const recommendationCtrl = require('../controllers/recommendationController');

// Adaptive remedial learning path based on prerequisite DAG traversal
router.get('/remediation', protect, recommendationCtrl.getRemedialPath);

// Career & competency aligned course recommendations
router.get('/courses', protect, recommendationCtrl.getCourseRecommendations);

module.exports = router;
