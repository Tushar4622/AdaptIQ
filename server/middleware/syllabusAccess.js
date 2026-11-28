const mongoose = require('mongoose');
const Course = require('../models/Course');
const PersonalizedPlan = require('../models/PersonalizedPlan');
const { Enrollment } = require('../models');

const userIdOf = (user) => String(user?.id || user?._id || '');
const idOf = (value) => String(value?._id || value || '');

const createSyllabusAccessMiddleware = ({
  Course: CourseModel = Course,
  Enrollment: EnrollmentModel = Enrollment,
  PersonalizedPlan: PersonalizedPlanModel = PersonalizedPlan,
} = {}) => {
  const requireSyllabusCourseAccess = ({
    allowEnrolledStudentRead = false,
    personalizedPlanRead = false,
  } = {}) => async (req, res, next) => {
    try {
      const requesterId = userIdOf(req.user);
      if (!requesterId) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      let plan = null;
      let courseId = req.params.courseId || req.body?.courseId;

      if (req.params.planId) {
        if (!mongoose.Types.ObjectId.isValid(req.params.planId)) {
          return res.status(400).json({ error: 'Invalid plan ID.' });
        }

        plan = await PersonalizedPlanModel.findById(req.params.planId);
        if (!plan) {
          return res.status(404).json({ error: 'Personalized plan not found.' });
        }
        courseId = plan.course;
        req.syllabusPlan = plan;
      }

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'A valid course ID is required.' });
      }

      const courseQuery = CourseModel.findById(courseId);
      const course = typeof courseQuery.select === 'function'
        ? await courseQuery.select('instructor')
        : await courseQuery;

      if (!course) {
        return res.status(404).json({ error: 'Course not found.' });
      }

      req.syllabusCourse = course;

      const role = req.user.role;
      if (role === 'admin') {
        if (personalizedPlanRead) {
          const targetStudentId = req.query.studentId || requesterId;
          if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
            return res.status(400).json({ error: 'A valid student ID is required.' });
          }
          req.targetStudentId = targetStudentId;
        }
        return next();
      }

      if (role === 'teacher') {
        if (idOf(course.instructor) !== requesterId) {
          return res.status(403).json({ error: 'You can only access syllabi for courses you own.' });
        }

        if (personalizedPlanRead) {
          const targetStudentId = req.query.studentId;
          if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
            return res.status(400).json({ error: 'A valid student ID is required.' });
          }
          const enrolled = await EnrollmentModel.exists({
            course: courseId,
            student: targetStudentId,
          });
          if (!enrolled) {
            return res.status(403).json({ error: 'Student is not enrolled in this course.' });
          }
          req.targetStudentId = targetStudentId;
        }

        return next();
      }

      if (role === 'student') {
        if (!allowEnrolledStudentRead || req.method !== 'GET') {
          return res.status(403).json({ error: 'Access denied.' });
        }

        if (personalizedPlanRead) {
          const requestedStudentId = req.query.studentId;
          if (requestedStudentId && idOf(requestedStudentId) !== requesterId) {
            return res.status(403).json({ error: 'You can only access your own personalized plan.' });
          }
          req.targetStudentId = requesterId;
        }

        const enrolled = await EnrollmentModel.exists({
          course: courseId,
          student: requesterId,
        });
        if (!enrolled) {
          return res.status(403).json({ error: 'You must be enrolled in this course.' });
        }

        if (plan && idOf(plan.student) !== requesterId) {
          return res.status(403).json({ error: 'You can only access your own personalized plan.' });
        }

        return next();
      }

      return res.status(403).json({ error: 'Access denied.' });
    } catch (error) {
      return next(error);
    }
  };

  return { requireSyllabusCourseAccess };
};

const { requireSyllabusCourseAccess } = createSyllabusAccessMiddleware();

module.exports = {
  createSyllabusAccessMiddleware,
  requireSyllabusCourseAccess,
};
