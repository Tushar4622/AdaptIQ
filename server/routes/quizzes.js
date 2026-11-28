const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  requireQuizAccess,
  requireCourseOwner,
  requireAttemptAccess,
} = require('../middleware/objectAccess');
const { Quiz, QuizAttempt, Enrollment, Concept, LearnerMastery, AuditLog } = require('../models/index');
const { getQuizFeedback, generateAdaptiveMCQs } = require('../controllers/aiController');
const quizAdvancedCtrl = require('../controllers/quizAdvancedController');
const Course = require('../models/Course');
const { addXpToUser, awardEligibleBadges } = require('../utils/gamification');
const { createNotifications } = require('../utils/notifications');

const ensureTeacherOwnsCourse = (course, user) => {
  if (user.role === 'admin') return true;
  return String(course.instructor) === String(user._id);
};

// GET /api/quizzes/course/:courseId
router.get('/course/:courseId', protect, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).select('instructor');
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const query = { course: req.params.courseId };

    if (req.user.role === 'student') {
      const enrolled = await Enrollment.exists({ student: req.user._id, course: req.params.courseId });
      if (!enrolled) {
        return res.status(403).json({ error: 'Enroll in this course before viewing quizzes.' });
      }
      query.isPublished = true;
    } else if (req.user.role === 'teacher' && !ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only access quizzes for your own courses.' });
    }

    let quizzesQuery = Quiz.find(query).sort('-createdAt');
    if (req.user.role === 'student') {
      quizzesQuery = quizzesQuery.select('-questions.correctIndex');
    }

    const quizzes = await quizzesQuery;

    res.json({ quizzes });
  } catch (err) { next(err); }
});

// GET /api/quizzes/:id  (with answers — teacher/admin only)
router.get('/:id', protect, requireQuizAccess('view'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title instructor');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const isInstructor =
      req.user.role === 'admin' ||
      quiz.course?.instructor?.toString() === req.user._id.toString();

    if (!isInstructor) {
      quiz.questions.forEach((q) => { q.correctIndex = undefined; });
    }
    res.json({ quiz });
  } catch (err) { next(err); }
});

// POST /api/quizzes
router.post('/', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const { course: courseId, title, description, timeLimit, passingScore, xpReward, isPublished, questions } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId).select('title instructor');
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (!ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only create quizzes for your own courses.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required.' });
    }

    const normalizedQuestions = questions
      .map((item) => ({
        text: String(item.text || '').trim(),
        options: Array.isArray(item.options)
          ? item.options.map((option) => String(option || '').trim()).filter(Boolean)
          : [],
        correctIndex: Number(item.correctIndex),
        explanation: String(item.explanation || '').trim(),
        points: Number(item.points) > 0 ? Number(item.points) : 1,
        concept: item.concept || undefined,
        cognitiveLevel: item.cognitiveLevel || 'understand',
        status: item.status || 'approved',
        reviewedBy: req.user._id,
        distractorRationales: Array.isArray(item.distractorRationales) ? item.distractorRationales : [],
      }))
      .filter((item) => item.text && item.options.length >= 2 && Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < item.options.length);

    if (normalizedQuestions.length === 0) {
      return res.status(400).json({ error: 'Provide valid quiz questions with options and correct answers.' });
    }

    const quiz = await Quiz.create({
      course: courseId,
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      timeLimit: Number(timeLimit) > 0 ? Number(timeLimit) : 30,
      passingScore: Number(passingScore) > 0 ? Number(passingScore) : 70,
      xpReward: Number(xpReward) > 0 ? Number(xpReward) : 50,
      isPublished: Boolean(isPublished),
      questions: normalizedQuestions,
    });

    let notifiedStudents = 0;

    if (quiz.isPublished) {
      const enrollments = await Enrollment.find({ course: courseId }).select('student');
      const studentIds = Array.from(new Set(enrollments.map((enrollment) => String(enrollment.student))));
      notifiedStudents = studentIds.length;

      if (studentIds.length > 0) {
        await createNotifications({
          io: req.io,
          entries: studentIds.map((studentId) => ({
            user: studentId,
            type: 'quiz-created',
            title: 'New quiz available',
            message: `${req.user.name} published quiz "${quiz.title}" in ${course.title}.`,
            payload: {
              courseId: course._id,
              quizId: quiz._id,
              route: `/courses/${course._id}?tab=assessments`,
            },
          })),
        });
      }
    }

    res.status(201).json({ quiz, notifiedStudents });
  } catch (err) { next(err); }
});

// POST /api/quizzes/generate-ai
router.post('/generate-ai', protect, restrictTo('teacher', 'admin'), generateAdaptiveMCQs);

// GET /api/quizzes/drafts/:courseId
// Fetches staged AI draft quizzes awaiting faculty quality review
router.get('/drafts/:courseId', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).select('instructor');
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (!ensureTeacherOwnsCourse(course, req.user)) {
      return res.status(403).json({ error: 'You can only access drafts for your own courses.' });
    }

    const drafts = await Quiz.find({
      course: req.params.courseId,
      isPublished: false,
    })
      .populate('questions.concept', 'name code difficulty')
      .sort('-createdAt');

    res.json({ count: drafts.length, drafts });
  } catch (err) { next(err); }
});

// PUT /api/quizzes/:id/questions/:questionIndex/review
// Allows instructor to review, modify, approve, or reject an individual staged item
router.put('/:id/questions/:questionIndex/review', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'instructor');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    if (!ensureTeacherOwnsCourse(quiz.course, req.user)) {
      return res.status(403).json({ error: 'You can only review quizzes for your own courses.' });
    }

    const qIndex = Number(req.params.questionIndex);
    if (!Number.isInteger(qIndex) || qIndex < 0 || qIndex >= quiz.questions.length) {
      return res.status(400).json({ error: 'Invalid question index.' });
    }

    const targetQuestion = quiz.questions[qIndex];
    const { status, text, options, correctIndex, explanation, reviewNotes, cognitiveLevel } = req.body;

    if (status && ['ai_draft', 'approved', 'rejected', 'flagged'].includes(status)) {
      targetQuestion.status = status;
      targetQuestion.reviewedBy = req.user._id;
    }
    if (text) targetQuestion.text = String(text).trim();
    if (Array.isArray(options) && options.length >= 2) {
      targetQuestion.options = options.map(o => String(o).trim()).filter(Boolean);
    }
    if (Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < targetQuestion.options.length) {
      targetQuestion.correctIndex = correctIndex;
    }
    if (explanation) targetQuestion.explanation = String(explanation).trim();
    if (reviewNotes) targetQuestion.reviewNotes = String(reviewNotes).trim();
    if (cognitiveLevel) targetQuestion.cognitiveLevel = cognitiveLevel;

    await quiz.save();

    // ── Audit log: faculty question review ────────────────────────────────────
    await AuditLog.create({
      actor: req.user._id,
      action: `question_${targetQuestion.status}`,
      targetType: 'Quiz',
      targetId: quiz._id,
      metadata: {
        quizTitle: quiz.title,
        questionIndex: qIndex,
        questionPreview: String(targetQuestion.text || '').slice(0, 80),
        reviewNotes: targetQuestion.reviewNotes || null,
      },
    }).catch(() => {}); // non-blocking

    res.json({
      message: `Question #${qIndex + 1} updated to status "${targetQuestion.status}".`,
      question: targetQuestion,
      quiz,
    });
  } catch (err) { next(err); }
});

// POST /api/quizzes/:id/publish-approved
// Publishes only approved questions, filtering out rejected ones
router.post('/:id/publish-approved', protect, restrictTo('teacher', 'admin'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title instructor');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    if (!ensureTeacherOwnsCourse(quiz.course, req.user)) {
      return res.status(403).json({ error: 'You can only publish quizzes for your own courses.' });
    }

    // Filter out rejected items
    const approvedQuestions = quiz.questions.filter((q) => q.status === 'approved');

    if (approvedQuestions.length === 0) {
      return res.status(400).json({
        error: 'No approved questions found. Please review and approve at least one question before publishing.',
      });
    }

    quiz.questions = approvedQuestions;
    quiz.isPublished = true;
    await quiz.save();

    // Notify enrolled students
    const enrollments = await Enrollment.find({ course: quiz.course._id }).select('student');
    const studentIds = Array.from(new Set(enrollments.map((e) => String(e.student))));

    if (studentIds.length > 0) {
      await createNotifications({
        io: req.io,
        entries: studentIds.map((studentId) => ({
          user: studentId,
          type: 'quiz-created',
          title: 'New validated assessment available',
          message: `${req.user.name} published faculty-approved assessment "${quiz.title}".`,
          payload: {
            courseId: quiz.course._id,
            quizId: quiz._id,
            route: `/courses/${quiz.course._id}?tab=assessments`,
          },
        })),
      });
    }

    // ── Audit log: quiz publish ────────────────────────────────────────────────
    await AuditLog.create({
      actor: req.user._id,
      action: 'quiz_published',
      targetType: 'Quiz',
      targetId: quiz._id,
      metadata: {
        quizTitle: quiz.title,
        courseId: quiz.course._id,
        approvedCount: approvedQuestions.length,
        notifiedStudents: studentIds.length,
      },
    }).catch(() => {}); // non-blocking

    res.json({
      message: `Quiz "${quiz.title}" published successfully with ${approvedQuestions.length} approved questions.`,
      quiz,
      publishedQuestionsCount: approvedQuestions.length,
      notifiedStudents: studentIds.length,
    });
  } catch (err) { next(err); }
});

// PUT /api/quizzes/:id
router.put('/:id', protect, restrictTo('teacher', 'admin'), requireQuizAccess('manage'), async (req, res, next) => {
  try {
    const updates = {};
    for (const field of ['title', 'description', 'timeLimit', 'passingScore', 'questions', 'isPublished', 'xpReward']) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = req.body[field];
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ quiz });
  } catch (err) { next(err); }
});

// POST /api/quizzes/:id/attempt
router.post('/:id/attempt', protect, restrictTo('student'), requireQuizAccess('attempt'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const { answers, timeTaken } = req.body;

    let correct = 0;
    const conceptStats = new Map();

    const details = answers.map((a, i) => {
      const q = quiz.questions[i];
      const isCorrect = q && a.selectedIndex === q.correctIndex;
      if (isCorrect) correct++;

      const conceptId = q?.concept ? String(q.concept) : null;
      if (conceptId) {
        if (!conceptStats.has(conceptId)) {
          conceptStats.set(conceptId, { total: 0, correct: 0, conceptId });
        }
        const stat = conceptStats.get(conceptId);
        stat.total += 1;
        if (isCorrect) stat.correct += 1;
      }

      return {
        questionIndex: i,
        selectedIndex: a.selectedIndex,
        responseTime: Number(a.responseTime) || 0,
        isCorrect,
        concept: q?.concept || undefined,
      };
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Continuous competency loop: compute concept-level mastery & update LearnerMastery
    const conceptBreakdown = [];
    for (const [conceptId, stat] of conceptStats.entries()) {
      const conceptDoc = await Concept.findById(conceptId);
      if (!conceptDoc) continue;

      const performance = Math.round((stat.correct / stat.total) * 100);
      let masteryDoc = await LearnerMastery.findOne({
        student: req.user._id,
        concept: conceptId,
      });

      let updatedScore = performance;
      if (masteryDoc) {
        // Moving average updating: 35% prior + 65% recent
        updatedScore = Math.round(0.35 * masteryDoc.masteryScore + 0.65 * performance);
      }

      const status = LearnerMastery.deriveStatus(updatedScore);

      if (!masteryDoc) {
        masteryDoc = new LearnerMastery({
          student: req.user._id,
          concept: conceptId,
          competency: conceptDoc.competency,
          course: quiz.course,
          masteryScore: updatedScore,
          status,
          totalAttempts: stat.total,
          correctAttempts: stat.correct,
          avgResponseLatency: Math.round(Number(timeTaken) / quiz.questions.length) || 0,
        });
      } else {
        masteryDoc.masteryScore = updatedScore;
        masteryDoc.status = status;
        masteryDoc.totalAttempts += stat.total;
        masteryDoc.correctAttempts += stat.correct;
        masteryDoc.lastAssessedAt = new Date();
      }

      masteryDoc.history.push({
        quizId: quiz._id,
        isCorrect: stat.correct === stat.total,
        responseTime: Number(timeTaken) || 0,
        timestamp: new Date(),
      });

      await masteryDoc.save();

      conceptBreakdown.push({
        concept: conceptDoc._id,
        conceptName: conceptDoc.name,
        correctCount: stat.correct,
        totalCount: stat.total,
        masteryScore: updatedScore,
        status,
      });
    }

    const attempt = await QuizAttempt.create({
      student: req.user._id,
      quiz: quiz._id,
      answers: details,
      conceptBreakdown,
      score,
      passed,
      timeTaken,
      completedAt: new Date(),
    });

    let awardedBadges = [];

    // Award XP if passed
    if (passed) {
      const updatedUser = await addXpToUser(req.user._id, quiz.xpReward);

      const badgeCriteria = ['reach_expert'];
      if (score === 100) {
        badgeCriteria.push('perfect_quiz');
      }

      awardedBadges = await awardEligibleBadges(req.user._id, badgeCriteria, {
        score,
        userDoc: updatedUser,
      });
    }

    const detectedGaps = conceptBreakdown.filter((c) => c.status === 'unmet');

    res.json({
      attempt: {
        ...attempt.toObject(),
        details,
        totalQuestions: quiz.questions.length,
        correct,
        conceptBreakdown,
        detectedGaps,
      },
      awardedBadges,
    });
  } catch (err) { next(err); }
});

// GET /api/quizzes/:id/results
router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.find({ quiz: req.params.id, student: req.user._id })
      .sort('-completedAt').limit(5);
    res.json({ attempts });
  } catch (err) { next(err); }
});

// POST /api/quizzes/feedback
router.post('/feedback', protect, getQuizFeedback);

// ── Advanced Adaptive AI Assessment & Evaluation Routes ──────────────────────
router.post(
  '/generate-advanced',
  protect,
  restrictTo('teacher', 'admin'),
  requireCourseOwner({ body: 'courseId' }),
  quizAdvancedCtrl.generateAdaptiveQuiz
);
router.post(
  '/upload-quiz',
  protect,
  restrictTo('teacher', 'admin'),
  requireCourseOwner({ body: 'courseId' }),
  quizAdvancedCtrl.uploadQuizWithAutoTag
);
router.post(
  '/:id/submit-advanced',
  protect,
  restrictTo('student'),
  requireQuizAccess('attempt'),
  quizAdvancedCtrl.evaluateAndGenerateReport
);
router.get(
  '/class-analytics/:courseId',
  protect,
  restrictTo('teacher', 'admin'),
  requireCourseOwner({ param: 'courseId' }),
  quizAdvancedCtrl.getClassAnalytics
);
router.get(
  '/attempts/:attemptId/report',
  protect,
  requireAttemptAccess,
  quizAdvancedCtrl.getAttemptDetailedReport
);

module.exports = router;
