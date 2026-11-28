const mongoose = require('mongoose');
const Course = require('../models/Course');
const { Enrollment, Assignment, Submission, Quiz, QuizAttempt, Discussion } = require('../models');
const { Competency } = require('../models/Competency');

const idOf = (value) => String(value?._id || value || '');
const userIdOf = (user) => idOf(user?.id || user?._id);
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const createObjectAccessMiddleware = ({
  Course: CourseModel = Course,
  Enrollment: EnrollmentModel = Enrollment,
  Assignment: AssignmentModel = Assignment,
  Submission: SubmissionModel = Submission,
  Quiz: QuizModel = Quiz,
  QuizAttempt: QuizAttemptModel = QuizAttempt,
  Discussion: DiscussionModel = Discussion,
  Competency: CompetencyModel = Competency,
} = {}) => {
  const loadCourse = async (courseId) => {
    if (!isValidId(courseId)) return null;
    const query = CourseModel.findById(courseId);
    return typeof query.select === 'function'
      ? query.select('instructor isPublished')
      : query;
  };

  const isOwnerOrAdmin = (course, user) => user?.role === 'admin'
    || (
      user?.role === 'teacher'
      && Boolean(course)
      && idOf(course.instructor) === userIdOf(user)
    );

  const isEnrolled = (studentId, courseId) =>
    EnrollmentModel.exists({ student: studentId, course: courseId });

  const requireUser = (req, res) => {
    if (userIdOf(req.user)) return true;
    res.status(401).json({ error: 'Authentication required.' });
    return false;
  };

  const deny = (res, message = 'Access denied.', status = 403) =>
    res.status(status).json({ error: message });

  const requireCourseAccess = ({
    param = 'courseId',
    body = 'courseId',
    allowEnrolledStudent = false,
    requirePublishedForStudent = false,
  } = {}) => async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      const courseId = req.params?.[param] || req.body?.[body];
      if (!isValidId(courseId)) return deny(res, 'A valid course ID is required.', 400);

      const course = await loadCourse(courseId);
      if (!course) return deny(res, 'Course not found.', 404);
      req.accessCourse = course;

      if (isOwnerOrAdmin(course, req.user)) return next();
      if (
        req.user.role === 'student' &&
        allowEnrolledStudent &&
        (!requirePublishedForStudent || course.isPublished) &&
        await isEnrolled(userIdOf(req.user), course._id)
      ) {
        return next();
      }

      return deny(res, 'Course access denied.', req.user.role === 'student' ? 404 : 403);
    } catch (error) {
      return next(error);
    }
  };

  const requireAssignmentEnrollment = async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      if (req.user.role !== 'student') return deny(res);
      if (!isValidId(req.params.id)) return deny(res, 'Assignment not found.', 404);

      const assignment = await AssignmentModel.findById(req.params.id).populate('course', '_id');
      if (!assignment) return deny(res, 'Assignment not found.', 404);
      const courseId = assignment.course?._id || assignment.course;
      if (!isValidId(courseId)) return deny(res, 'Assignment not found.', 404);
      if (!(await isEnrolled(userIdOf(req.user), courseId))) {
        return deny(res, 'Enroll in this course before submitting.');
      }

      req.accessAssignment = assignment;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireSubmissionCourseOwner = async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      if (!['teacher', 'admin'].includes(req.user.role)) return deny(res);
      if (!isValidId(req.params.id)) return deny(res, 'Submission not found.', 404);

      const submission = await SubmissionModel.findById(req.params.id).populate({
        path: 'assignment',
        populate: { path: 'course', select: 'instructor' },
      });
      if (!submission) return deny(res, 'Submission not found.', 404);
      if (!isOwnerOrAdmin(submission.assignment?.course, req.user)) {
        return deny(res, 'Not authorized to grade this submission.');
      }

      req.accessSubmission = submission;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireQuizAccess = (mode) => async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      if (!isValidId(req.params.id)) return deny(res, 'Quiz not found.', 404);

      const quiz = await QuizModel.findById(req.params.id).populate('course', 'instructor isPublished');
      if (!quiz) return deny(res, 'Quiz not found.', 404);
      req.accessQuiz = quiz;

      if (mode === 'manage') {
        if (!['teacher', 'admin'].includes(req.user.role) || !isOwnerOrAdmin(quiz.course, req.user)) {
          return deny(res, 'Not authorized to manage this quiz.');
        }
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'course')) {
          const targetCourseId = req.body.course;
          if (!isValidId(targetCourseId)) return deny(res, 'A valid course ID is required.', 400);
          const targetCourse = await loadCourse(targetCourseId);
          if (!targetCourse) return deny(res, 'Course not found.', 404);
          if (!isOwnerOrAdmin(targetCourse, req.user)) {
            return deny(res, 'You can only move quizzes to courses you own.');
          }
        }
        return next();
      }

      if (mode === 'attempt') {
        if (req.user.role !== 'student' || !quiz.isPublished) {
          return deny(res, 'Quiz not found.', 404);
        }
        const courseId = quiz.course?._id || quiz.course;
        if (!isValidId(courseId)) return deny(res, 'Quiz not found.', 404);
        if (!(await isEnrolled(userIdOf(req.user), courseId))) {
          return deny(res, 'Enroll in this course before attempting quizzes.');
        }
        return next();
      }

      if (isOwnerOrAdmin(quiz.course, req.user)) return next();
      if (
        req.user.role === 'student' &&
        quiz.isPublished &&
        isValidId(quiz.course?._id || quiz.course) &&
        await isEnrolled(userIdOf(req.user), quiz.course?._id || quiz.course)
      ) {
        return next();
      }
      return deny(res, 'Quiz not found.', 404);
    } catch (error) {
      return next(error);
    }
  };

  const requireCourseOwner = ({
    param = 'courseId',
    body = 'courseId',
  } = {}) => async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      const courseId = req.params?.[param] || req.body?.[body];
      if (!isValidId(courseId)) return deny(res, 'A valid course ID is required.', 400);

      const course = await loadCourse(courseId);
      if (!course) return deny(res, 'Course not found.', 404);
      if (!isOwnerOrAdmin(course, req.user)) {
        return deny(res, 'You can only manage your own courses.');
      }

      req.accessCourse = course;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireAttemptAccess = async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      if (!isValidId(req.params.attemptId)) return deny(res, 'Attempt not found.', 404);

      const attempt = await QuizAttemptModel.findById(req.params.attemptId)
        .populate({
          path: 'quiz',
          populate: { path: 'course', select: 'instructor' },
        })
        .populate('student', 'name email');
      if (!attempt) return deny(res, 'Attempt not found.', 404);

      const isAttemptOwner = idOf(attempt.student) === userIdOf(req.user);
      if (!isAttemptOwner && !isOwnerOrAdmin(attempt.quiz?.course, req.user)) {
        return deny(res, 'Attempt not found.', 404);
      }

      req.accessAttempt = attempt;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireConceptCreationAccess = async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      if (!['teacher', 'admin'].includes(req.user.role)) return deny(res);

      const { competency: competencyId, course: requestedCourseId } = req.body || {};
      if (!isValidId(competencyId)) return deny(res, 'Invalid competency ID.', 400);
      if (requestedCourseId && !isValidId(requestedCourseId)) {
        return deny(res, 'Invalid course ID.', 400);
      }

      const competency = await CompetencyModel.findById(competencyId);
      if (!competency) return deny(res, 'Competency not found.', 404);

      const competencyCourseId = competency.course?._id || competency.course;
      const targetCourseId = requestedCourseId || competencyCourseId;
      let course = targetCourseId ? await loadCourse(targetCourseId) : null;
      if (targetCourseId && !course) return deny(res, 'Course not found.', 404);

      if (req.user.role !== 'admin') {
        if (competencyCourseId) {
          if (!course || !isOwnerOrAdmin(course, req.user)) {
            return deny(res, 'Not authorized for this competency.');
          }
        } else if (idOf(competency.createdBy) !== userIdOf(req.user)) {
          return deny(res, 'Not authorized for this competency.');
        }

        if (
          competencyCourseId &&
          requestedCourseId &&
          idOf(competencyCourseId) !== idOf(requestedCourseId)
        ) {
          return deny(res, 'Concept course must match its competency course.');
        }

        if (targetCourseId) {
          if (!course || !isOwnerOrAdmin(course, req.user)) {
            return deny(res, 'Not authorized for this course.');
          }
        }
      }

      req.accessCompetency = competency;
      req.accessCourse = course;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireDiscussionAccess = (mode) => async (req, res, next) => {
    try {
      if (!requireUser(req, res)) return;
      let course;
      let discussion = null;

      if (mode === 'reply') {
        if (!isValidId(req.params.id)) return deny(res, 'Discussion not found.', 404);
        discussion = await DiscussionModel.findById(req.params.id)
          .populate('course', 'instructor');
        if (!discussion) return deny(res, 'Discussion not found.', 404);
        course = discussion.course;
      } else {
        const courseId = req.params.courseId;
        if (!isValidId(courseId)) return deny(res, 'Invalid course ID.', 400);
        course = await loadCourse(courseId);
      }

      if (!course) return deny(res, 'Course not found.', 404);
      const isEnrolledStudent = req.user.role === 'student'
        && await isEnrolled(userIdOf(req.user), course._id || course);
      if (!isOwnerOrAdmin(course, req.user) && !isEnrolledStudent) {
        return deny(res, 'Discussion access denied.');
      }

      req.accessCourse = course;
      if (discussion) req.accessDiscussion = discussion;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  return {
    requireCourseAccess,
    requireAssignmentEnrollment,
    requireSubmissionCourseOwner,
    requireQuizAccess,
    requireCourseOwner,
    requireAttemptAccess,
    requireConceptCreationAccess,
    requireDiscussionAccess,
  };
};

const {
  requireCourseAccess,
  requireAssignmentEnrollment,
  requireSubmissionCourseOwner,
  requireQuizAccess,
  requireCourseOwner,
  requireAttemptAccess,
  requireConceptCreationAccess,
  requireDiscussionAccess,
} = createObjectAccessMiddleware();

module.exports = {
  createObjectAccessMiddleware,
  requireCourseAccess,
  requireAssignmentEnrollment,
  requireSubmissionCourseOwner,
  requireQuizAccess,
  requireCourseOwner,
  requireAttemptAccess,
  requireConceptCreationAccess,
  requireDiscussionAccess,
};
