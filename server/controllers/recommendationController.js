const mongoose = require('mongoose');
const { Competency, Concept } = require('../models/Competency');
const LearnerMastery = require('../models/LearnerMastery');
const Course = require('../models/Course');
const { Quiz } = require('../models/index');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// GET /api/recommendations/remediation
// Generates an adaptive remedial learning path traversing prerequisite DAGs
exports.getRemedialPath = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { courseId } = req.query;

    const filter = {
      student: studentId,
      status: { $in: ['unmet', 'in-progress'] },
    };

    if (courseId && isValidObjectId(courseId)) {
      filter.course = courseId;
    }

    // 1. Fetch all under-mastered concepts for this learner
    const weakRecords = await LearnerMastery.find(filter)
      .populate({
        path: 'concept',
        populate: [
          { path: 'prerequisites', select: 'name code difficulty moduleIndex lessonIndex course' },
          { path: 'competency', select: 'title code domain' },
          { path: 'course', select: 'title modules' },
        ],
      })
      .sort('masteryScore');

    if (weakRecords.length === 0) {
      return res.json({
        hasGaps: false,
        message: 'No critical concept gaps detected! You are on track with your competencies.',
        path: [],
      });
    }

    // Collect all concepts the student has already mastered
    const masteredRecords = await LearnerMastery.find({
      student: studentId,
      status: 'mastered',
    }).select('concept');
    const masteredConceptIds = new Set(masteredRecords.map((r) => String(r.concept)));

    const steps = [];
    const addedLessonKeys = new Set();
    let stepNumber = 1;

    for (const record of weakRecords) {
      const concept = record.concept;
      if (!concept) continue;

      // 2. Prerequisite Rule Traversal:
      // Check if any prerequisite concepts are unmet or unattempted
      const prereqs = concept.prerequisites || [];
      for (const prereq of prereqs) {
        const prereqIdStr = String(prereq._id);
        if (!masteredConceptIds.has(prereqIdStr)) {
          // Found an unmet foundational prerequisite!
          const prereqCourse = prereq.course ? await Course.findById(prereq.course).select('title modules') : concept.course;
          const modIdx = prereq.moduleIndex || 0;
          const lesIdx = prereq.lessonIndex || 0;
          const lesson = prereqCourse?.modules?.[modIdx]?.lessons?.[lesIdx];
          const lessonKey = `${prereqCourse?._id}:${modIdx}:${lesIdx}`;

          if (!addedLessonKeys.has(lessonKey)) {
            addedLessonKeys.add(lessonKey);
            steps.push({
              step: stepNumber++,
              type: 'foundational_prerequisite',
              priority: 'high',
              conceptId: prereq._id,
              conceptName: prereq.name,
              conceptCode: prereq.code,
              competencyTitle: concept.competency?.title || 'Foundations',
              title: `Foundational Prerequisite: ${prereq.name}`,
              courseId: prereqCourse?._id,
              courseTitle: prereqCourse?.title || 'Core Curriculum',
              moduleIndex: modIdx,
              lessonIndex: lesIdx,
              lessonTitle: lesson?.title || `${prereq.name} Lesson`,
              lessonType: lesson?.type || 'text',
              duration: lesson?.duration || 15,
              route: `/courses/${prereqCourse?._id}?module=${modIdx}&lesson=${lesIdx}`,
              rationale: `Prerequisite barrier: ${prereq.name} must be reviewed before attempting ${concept.name}.`,
            });
          }
        }
      }

      // 3. Core Concept Remedial Lesson
      const course = concept.course;
      const modIdx = concept.moduleIndex || 0;
      const lesIdx = concept.lessonIndex || 0;
      const lesson = course?.modules?.[modIdx]?.lessons?.[lesIdx];
      const lessonKey = `${course?._id}:${modIdx}:${lesIdx}`;

      if (!addedLessonKeys.has(lessonKey)) {
        addedLessonKeys.add(lessonKey);
        steps.push({
          step: stepNumber++,
          type: 'core_remediation',
          priority: record.masteryScore < 30 ? 'high' : 'medium',
          conceptId: concept._id,
          conceptName: concept.name,
          conceptCode: concept.code,
          competencyTitle: concept.competency?.title,
          currentMastery: record.masteryScore,
          title: `Core Remediation: ${concept.name}`,
          courseId: course?._id,
          courseTitle: course?.title || 'Core Course',
          moduleIndex: modIdx,
          lessonIndex: lesIdx,
          lessonTitle: lesson?.title || `${concept.name} Lesson`,
          lessonType: lesson?.type || 'text',
          duration: lesson?.duration || 20,
          route: `/courses/${course?._id}?module=${modIdx}&lesson=${lesIdx}`,
          rationale: `Direct gap identified: Current mastery is ${record.masteryScore}%. Review this lesson to reinforce key concepts.`,
        });
      }

      // 4. Targeted Formative Re-assessment Quiz
      if (course?._id) {
        const matchingQuiz = await Quiz.findOne({
          course: course._id,
          isPublished: true,
          'questions.concept': concept._id,
        }).select('title passingScore timeLimit questions');

        if (matchingQuiz) {
          steps.push({
            step: stepNumber++,
            type: 'practice_assessment',
            priority: 'medium',
            conceptId: concept._id,
            conceptName: concept.name,
            conceptCode: concept.code,
            title: `Formative Verification: ${matchingQuiz.title}`,
            courseId: course._id,
            courseTitle: course.title,
            quizId: matchingQuiz._id,
            passingScore: matchingQuiz.passingScore,
            timeLimit: matchingQuiz.timeLimit,
            route: `/quizzes/${matchingQuiz._id}`,
            rationale: `Validate mastery closure: Retake quiz items aligned to ${concept.name}.`,
          });
        }
      }
    }

    res.json({
      hasGaps: true,
      weakConceptsCount: weakRecords.length,
      totalRemedialSteps: steps.length,
      path: steps,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/recommendations/courses
// Suggests courses based on unacquired competencies and user profile
exports.getCourseRecommendations = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    // Enrolled courses to exclude
    const { Enrollment } = require('../models/index');
    const enrollments = await Enrollment.find({ student: studentId }).select('course');
    const enrolledCourseIds = new Set(enrollments.map((e) => String(e.course)));

    // Active competencies
    const competencies = await Competency.find({ isActive: true })
      .populate('course', 'title category difficulty rating thumbnail banner enrollmentCount')
      .limit(10);

    const recommendedCourses = [];
    const seenCourseIds = new Set();

    competencies.forEach((comp) => {
      const course = comp.course;
      if (!course || enrolledCourseIds.has(String(course._id)) || seenCourseIds.has(String(course._id))) {
        return;
      }
      seenCourseIds.add(String(course._id));
      recommendedCourses.push({
        course,
        targetCompetency: comp.title,
        domain: comp.domain,
        reason: `Builds institutional competency in ${comp.domain}`,
      });
    });

    res.json({
      count: recommendedCourses.length,
      recommendations: recommendedCourses,
    });
  } catch (err) {
    next(err);
  }
};
