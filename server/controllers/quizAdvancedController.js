const { Quiz, QuizAttempt, User, Course } = require('../models/index');
const { MasterSyllabus } = require('../models/Syllabus');
const SkillProfile = require('../models/SkillProfile');
const PersonalizedPlan = require('../models/PersonalizedPlan');
const llmEngine = require('../services/llmEngine');
const { addXpToUser, awardEligibleBadges } = require('../utils/gamification');

/**
 * 1. POST /api/quizzes/generate-advanced
 * Teacher generates an adaptive quiz with target difficulty & HOT/LOT mix
 */
exports.generateAdaptiveQuiz = async (req, res, next) => {
  try {
    const {
      courseId,
      title,
      targetTopics = [],
      questionCount = 5,
      difficulty = 'Moderate',
      hotPercentage = 40,
      sourceMaterial = '',
      timeLimit = 20,
      passingScore = 70,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    // Call AI Engine
    const generatedQuestions = await llmEngine.generateAdaptiveQuiz({
      courseTitle: course.title,
      targetTopics,
      questionCount,
      difficulty,
      hotPercentage,
      sourceMaterial: sourceMaterial || `${course.title}. ${course.description}`,
    });

    // Normalize and stage questions as ai_draft for teacher review
    const normalizedQuestions = generatedQuestions.map((q) => {
      const cognitiveLevel = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].includes(q.cognitiveLevel)
        ? q.cognitiveLevel
        : 'understand';

      const thinkingOrder = ['analyze', 'evaluate', 'create'].includes(cognitiveLevel) ? 'hot' : 'lot';

      return {
        text: q.text,
        questionType: ['mcq', 'scenario', 'case_study', 'short_answer'].includes(q.questionType)
          ? q.questionType
          : 'mcq',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
        explanation: q.explanation || 'Pedagogical explanation of the correct answer.',
        points: Number(q.points) || 1,
        topic: q.topic || targetTopics[0] || 'Core Concepts',
        skillArea: q.skillArea || 'Full Stack',
        difficulty: ['Easy', 'Moderate', 'Tough'].includes(q.difficulty) ? q.difficulty : difficulty,
        cognitiveLevel,
        thinkingOrder,
        status: 'ai_draft', // Staged: teacher must review/approve
        distractorRationales: Array.isArray(q.distractorRationales) ? q.distractorRationales : [],
        rubric: q.rubric || '',
      };
    });

    const quiz = await Quiz.create({
      course: courseId,
      title: title || `${course.title} — Adaptive Assessment`,
      description: `Targeting ${targetTopics.join(', ') || 'Core Topics'} with ${hotPercentage}% HOT / ${100 - hotPercentage}% LOT cognitive distribution.`,
      timeLimit: Number(timeLimit) || 20,
      passingScore: Number(passingScore) || 70,
      xpReward: 60,
      isPublished: false, // Guardrail: unpublished until teacher approves
      questions: normalizedQuestions,
    });

    res.status(201).json({
      message: 'Adaptive quiz generated and staged for faculty review.',
      quiz,
      questionsCount: normalizedQuestions.length,
      hotPercentage,
      lotPercentage: 100 - hotPercentage,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/quizzes/upload-quiz
 * Teacher uploads a quiz (JSON/Form). Missing topics/difficulty/Bloom auto-tagged by AI.
 */
exports.uploadQuizWithAutoTag = async (req, res, next) => {
  try {
    const { courseId, title, timeLimit, passingScore, rawQuestions } = req.body;

    if (!courseId || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return res.status(400).json({ error: 'courseId and an array of rawQuestions are required.' });
    }

    const masterSyllabus = await MasterSyllabus.findOne({ course: courseId, isMaster: true });
    const syllabusTopics = [];
    if (masterSyllabus) {
      masterSyllabus.units.forEach((u) => {
        u.topics.forEach((t) => syllabusTopics.push({ name: t.name, skillArea: t.skillArea }));
      });
    }

    const taggedQuestions = rawQuestions.map((q) => {
      // Auto-tag missing fields
      const cognitiveLevel = q.cognitiveLevel || (q.difficulty === 'Tough' ? 'analyze' : 'understand');
      const thinkingOrder = ['analyze', 'evaluate', 'create'].includes(cognitiveLevel) ? 'hot' : 'lot';
      const questionType = q.questionType || (q.options?.length >= 2 ? 'mcq' : 'short_answer');
      const difficulty = q.difficulty || (thinkingOrder === 'hot' ? 'Tough' : 'Moderate');
      const topic = q.topic || (syllabusTopics[0]?.name || 'General Core');
      const skillArea = q.skillArea || (syllabusTopics[0]?.skillArea || 'Full Stack');

      return {
        text: q.text,
        questionType,
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
        explanation: q.explanation || '',
        points: Number(q.points) || 1,
        topic,
        skillArea,
        difficulty,
        cognitiveLevel,
        thinkingOrder,
        status: 'approved',
        rubric: q.rubric || '',
        distractorRationales: Array.isArray(q.distractorRationales) ? q.distractorRationales : [],
      };
    });

    const quiz = await Quiz.create({
      course: courseId,
      title: title || 'Faculty Uploaded Quiz',
      timeLimit: Number(timeLimit) || 30,
      passingScore: Number(passingScore) || 70,
      questions: taggedQuestions,
      isPublished: true,
    });

    res.status(201).json({
      message: 'Quiz uploaded and auto-tagged successfully.',
      quiz,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. POST /api/quizzes/:id/submit-advanced
 * Auto-evaluation (MCQs + Descriptive with rubric), 8-dimension report, SkillProfile & Personalized Syllabus update
 */
exports.evaluateAndGenerateReport = async (req, res, next) => {
  try {
    const { id: quizId } = req.params;
    const { answers, timeTaken } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const totalQuestions = quiz.questions.length;
    let pointsEarned = 0;
    let totalPoints = 0;

    let hotCount = 0;
    let hotPoints = 0;
    let lotCount = 0;
    let lotPoints = 0;

    const topicStats = new Map();
    const evaluatedAnswers = [];
    const questionDiagnostics = [];

    for (let i = 0; i < totalQuestions; i++) {
      const q = quiz.questions[i];
      const submitted = (answers || [])[i] || {};
      const maxPts = q.points || 1;
      totalPoints += maxPts;

      const isHOT = q.thinkingOrder === 'hot' || ['analyze', 'evaluate', 'create'].includes(q.cognitiveLevel);
      if (isHOT) hotCount++;
      else lotCount++;

      const topicKey = q.topic || 'General Core';
      if (!topicStats.has(topicKey)) {
        topicStats.set(topicKey, {
          topicName: topicKey,
          skillArea: q.skillArea || 'Full Stack',
          total: 0,
          earned: 0,
        });
      }
      const tStat = topicStats.get(topicKey);
      tStat.total += maxPts;

      let isCorrect = false;
      let earned = 0;
      let misconception = null;
      let feedback = '';

      if (q.questionType === 'mcq' || q.questionType === 'scenario' || q.questionType === 'case_study') {
        const selectedIdx = Number(submitted.selectedIndex);
        isCorrect = selectedIdx === q.correctIndex;
        earned = isCorrect ? maxPts : 0;

        if (!isCorrect && Array.isArray(q.distractorRationales) && q.distractorRationales[selectedIdx]) {
          misconception = q.distractorRationales[selectedIdx];
        } else if (!isCorrect) {
          misconception = `Misidentified core concept in ${topicKey}; selected plausible distractor.`;
        }
      } else {
        // Descriptive or short answer -> AI Rubric Evaluation
        const descEval = await llmEngine.evaluateDescriptiveAnswer({
          questionText: q.text,
          rubric: q.rubric || q.explanation,
          studentAnswer: submitted.studentAnswerText || '',
          maxPoints: maxPts,
        });
        earned = descEval.scoreEarned;
        isCorrect = descEval.isCorrect;
        feedback = descEval.feedback;
        misconception = descEval.misconception;
      }

      pointsEarned += earned;
      tStat.earned += earned;

      if (isHOT) hotPoints += earned;
      else lotPoints += earned;

      evaluatedAnswers.push({
        questionIndex: i,
        selectedIndex: submitted.selectedIndex,
        studentAnswerText: submitted.studentAnswerText,
        responseTime: Number(submitted.responseTime) || 0,
        isCorrect,
        scoreEarned: earned,
        maxPoints: maxPts,
        topic: q.topic,
        skillArea: q.skillArea,
        questionType: q.questionType,
        thinkingOrder: q.thinkingOrder,
        misconception,
        descriptiveFeedback: feedback,
      });

      questionDiagnostics.push({
        questionIndex: i,
        topic: q.topic,
        isCorrect,
        explanation: q.explanation,
        misconception,
      });
    }

    const overallScore = Math.round((pointsEarned / Math.max(1, totalPoints)) * 100);
    const passed = overallScore >= quiz.passingScore;
    const hotAccuracy = hotCount > 0 ? Math.round((hotPoints / hotCount) * 100) : overallScore;
    const lotAccuracy = lotCount > 0 ? Math.round((lotPoints / lotCount) * 100) : overallScore;

    const topicResults = Array.from(topicStats.values()).map((ts) => ({
      topicName: ts.topicName,
      skillArea: ts.skillArea,
      score: Math.round((ts.earned / Math.max(1, ts.total)) * 100),
    }));

    // ── Call AI Engine for Detailed 8-Dimension Report
    const detailedReport = await llmEngine.generateDetailedResultReport({
      overallScore,
      pointsEarned,
      totalPoints,
      timeTakenSeconds: Number(timeTaken) || 300,
      questionCount: totalQuestions,
      topicResults,
      questionDiagnostics,
      hotCount,
      hotAccuracy,
      lotCount,
      lotAccuracy,
    });

    // ── Save QuizAttempt Document
    const attempt = await QuizAttempt.create({
      student: req.user._id,
      quiz: quiz._id,
      answers: evaluatedAnswers,
      score: overallScore,
      pointsEarned,
      totalPoints,
      passed,
      timeTaken: Number(timeTaken) || 300,
      aiFeedback: detailedReport.overallSummary,
      detailedReport,
      completedAt: new Date(),
    });

    // ── Update Student's SkillProfile (Weighted Recent Performance: 35% Prior + 65% Recent)
    let profile = await SkillProfile.findOne({
      student: req.user._id,
      course: quiz.course,
    });

    if (!profile) {
      profile = new SkillProfile({
        student: req.user._id,
        course: quiz.course,
        topicMasteries: [],
      });
    }

    topicResults.forEach((tr) => {
      let tm = profile.topicMasteries.find(
        (t) => t.topicName.toLowerCase().trim() === tr.topicName.toLowerCase().trim()
      );
      if (!tm) {
        profile.topicMasteries.push({
          topicName: tr.topicName,
          skillArea: tr.skillArea,
          masteryScore: tr.score,
          status: SkillProfile.deriveTopicStatus(tr.score),
          attemptsCount: 1,
          lastScore: tr.score,
          lastAssessedAt: new Date(),
          history: [{ quizId: quiz._id, score: tr.score, weight: 1.0 }],
        });
      } else {
        // Continuous competency loop: 35% prior + 65% recent
        const updatedScore = Math.round(0.35 * tm.masteryScore + 0.65 * tr.score);
        tm.masteryScore = updatedScore;
        tm.status = SkillProfile.deriveTopicStatus(updatedScore);
        tm.attemptsCount += 1;
        tm.lastScore = tr.score;
        tm.lastAssessedAt = new Date();
        tm.history.push({ quizId: quiz._id, score: tr.score, weight: 1.0 });
      }
    });

    profile.hotScore = hotAccuracy;
    profile.lotScore = lotAccuracy;
    profile.hotVerdict = detailedReport.hotVsLotAnalysis.verdict;
    profile.quizzesCompletedCount += 1;
    profile.overallAccuracy = overallScore;

    // Append detected mistake patterns
    (detailedReport.mistakePatterns || []).forEach((p) => {
      const existing = profile.mistakePatterns.find((mp) => mp.pattern === p);
      if (existing) existing.frequency += 1;
      else profile.mistakePatterns.push({ pattern: p, frequency: 1 });
    });

    await profile.save();

    // ── Trigger Adaptive Loop: Regenerate Personalized Syllabus for this student
    const masterSyllabus = await MasterSyllabus.findOne({ course: quiz.course, isMaster: true });
    if (masterSyllabus) {
      const planData = await llmEngine.generatePersonalizedSyllabus({
        masterSyllabus,
        skillProfile: profile,
      });

      let plan = await PersonalizedPlan.findOne({
        student: req.user._id,
        course: quiz.course,
      });

      if (!plan) {
        plan = new PersonalizedPlan({
          student: req.user._id,
          course: quiz.course,
          masterSyllabus: masterSyllabus._id,
          masterVersion: masterSyllabus.version,
          planTitle: planData.planTitle,
          summaryNarrative: planData.summaryNarrative,
          adaptedTopics: planData.adaptedTopics,
          lastEvaluatedQuiz: quiz._id,
        });
      } else {
        plan.planTitle = planData.planTitle;
        plan.summaryNarrative = planData.summaryNarrative;
        plan.adaptedTopics = planData.adaptedTopics;
        plan.lastEvaluatedQuiz = quiz._id;
        plan.generatedAt = new Date();
      }

      await plan.save();
    }

    // Award Gamification XP if passed
    if (passed) {
      await addXpToUser(req.user._id, quiz.xpReward || 50);
      if (overallScore === 100) {
        await awardEligibleBadges(req.user._id, ['perfect_quiz'], { score: 100 });
      }
    }

    res.json({
      attemptId: attempt._id,
      overallScore,
      pointsEarned,
      totalPoints,
      passed,
      detailedReport,
      evaluatedAnswers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/quizzes/class-analytics/:courseId
 * Teacher class-level view: weakest topics for whole class, most-missed questions, students who need attention
 */
exports.getClassAnalytics = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const [profiles, attempts] = await Promise.all([
      SkillProfile.find({ course: courseId }).populate('student', 'name email xp avatar'),
      QuizAttempt.find({}).populate({
        path: 'quiz',
        match: { course: courseId },
        select: 'title course questions',
      }),
    ]);

    const courseAttempts = attempts.filter((a) => a.quiz);

    // Aggregate topic performance across class
    const topicAgg = new Map();
    profiles.forEach((p) => {
      p.topicMasteries.forEach((tm) => {
        if (!topicAgg.has(tm.topicName)) {
          topicAgg.set(tm.topicName, {
            topicName: tm.topicName,
            skillArea: tm.skillArea,
            totalScore: 0,
            count: 0,
          });
        }
        const t = topicAgg.get(tm.topicName);
        t.totalScore += tm.masteryScore;
        t.count += 1;
      });
    });

    const topicRankings = Array.from(topicAgg.values())
      .map((t) => ({
        topicName: t.topicName,
        skillArea: t.skillArea,
        avgMastery: Math.round(t.totalScore / Math.max(1, t.count)),
        studentsAssessed: t.count,
      }))
      .sort((a, b) => a.avgMastery - b.avgMastery); // Weakest at top

    // Students who need attention (any student with avg score < 50 or weak topics >= 2)
    const atRiskStudents = profiles
      .map((p) => {
        const weakCount = p.topicMasteries.filter((tm) => tm.status === 'Weak').length;
        const avgScore =
          p.topicMasteries.length > 0
            ? Math.round(p.topicMasteries.reduce((sum, tm) => sum + tm.masteryScore, 0) / p.topicMasteries.length)
            : 0;

        return {
          studentId: p.student?._id,
          name: p.student?.name || 'Unknown',
          email: p.student?.email,
          weakTopicsCount: weakCount,
          averageMastery: avgScore,
          hotScore: p.hotScore,
          lotScore: p.lotScore,
          needsAttention: weakCount >= 2 || avgScore < 50,
        };
      })
      .filter((s) => s.needsAttention)
      .sort((a, b) => a.averageMastery - b.averageMastery);

    res.json({
      totalStudentsTracked: profiles.length,
      totalQuizSubmissions: courseAttempts.length,
      weakestTopics: topicRankings.slice(0, 5),
      allTopicRankings: topicRankings,
      atRiskStudents,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/quizzes/attempts/:attemptId/report
 * Retrieve stored detailed report for an attempt
 */
exports.getAttemptDetailedReport = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz', 'title course passingScore questions')
      .populate('student', 'name email');

    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    res.json({
      attempt,
      report: attempt.detailedReport,
    });
  } catch (err) {
    next(err);
  }
};
