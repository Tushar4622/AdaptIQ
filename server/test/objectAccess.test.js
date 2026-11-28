const test = require('node:test');
const assert = require('node:assert/strict');
const { createObjectAccessMiddleware } = require('../middleware/objectAccess');

const ids = {
  course: '64b000000000000000000001',
  teacherA: '64b000000000000000000002',
  teacherB: '64b000000000000000000003',
  studentA: '64b000000000000000000004',
  studentB: '64b000000000000000000005',
  assignment: '64b000000000000000000006',
  submission: '64b000000000000000000007',
  quiz: '64b000000000000000000008',
  attempt: '64b000000000000000000009',
  competency: '64b000000000000000000010',
  discussion: '64b000000000000000000011',
};

const query = (value) => {
  const result = {
    select: () => result,
    populate: () => result,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return result;
};

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const execute = async (method, req, models) => {
  const access = createObjectAccessMiddleware(models);
  const res = createResponse();
  let nextCalled = false;
  let nextError;
  await method(access)(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });
  if (nextError) throw nextError;
  return { res, nextCalled };
};

test('course content is denied to a student for an unpublished course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireCourseAccess({
      param: 'id',
      allowEnrolledStudent: true,
      requirePublishedForStudent: true,
    }),
    {
      method: 'GET',
      params: { id: ids.course },
      body: {},
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB, isPublished: false }) },
      Enrollment: { exists: async () => true },
    }
  );
  assert.equal(res.statusCode, 404);
  assert.equal(nextCalled, false);
});

test('assignment submission is denied when the student is not enrolled', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireAssignmentEnrollment,
    {
      params: { id: ids.assignment },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Assignment: { findById: () => query({ course: { _id: ids.course } }) },
      Enrollment: { exists: async () => false },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('grading is denied when a teacher does not own the submission course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireSubmissionCourseOwner,
    {
      params: { id: ids.submission },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Submission: {
        findById: () => query({ assignment: { course: { instructor: ids.teacherB } } }),
      },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('unpublished quiz cannot be read by a student', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireQuizAccess('view'),
    {
      params: { id: ids.quiz },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Quiz: {
        findById: () => query({
          isPublished: false,
          course: { _id: ids.course, instructor: ids.teacherB },
        }),
      },
      Enrollment: { exists: async () => true },
    }
  );
  assert.equal(res.statusCode, 404);
  assert.equal(nextCalled, false);
});

test('quiz update is denied when the teacher does not own its course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireQuizAccess('manage'),
    {
      params: { id: ids.quiz },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Quiz: {
        findById: () => query({
          course: { _id: ids.course, instructor: ids.teacherB },
        }),
      },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('quiz update cannot move a quiz to another teacher’s course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireQuizAccess('manage'),
    {
      params: { id: ids.quiz },
      body: { course: ids.assignment },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Quiz: {
        findById: () => query({
          course: { _id: ids.course, instructor: ids.teacherA },
        }),
      },
      Course: {
        findById: () => query({ _id: ids.assignment, instructor: ids.teacherB }),
      },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('published quiz attempt is denied when the student is not enrolled', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireQuizAccess('attempt'),
    {
      params: { id: ids.quiz },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Quiz: {
        findById: () => query({
          isPublished: true,
          course: { _id: ids.course, instructor: ids.teacherB },
        }),
      },
      Enrollment: { exists: async () => false },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('advanced submission is denied for an unpublished quiz', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireQuizAccess('attempt'),
    {
      params: { id: ids.quiz },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Quiz: {
        findById: () => query({
          isPublished: false,
          course: { _id: ids.course, instructor: ids.teacherB },
        }),
      },
      Enrollment: { exists: async () => true },
    }
  );
  assert.equal(res.statusCode, 404);
  assert.equal(nextCalled, false);
});

test('advanced quiz generation denies a teacher who does not own the target course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireCourseOwner({ body: 'courseId' }),
    {
      params: {},
      body: { courseId: ids.course },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB }) },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('quiz upload denies a teacher who does not own the target course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireCourseOwner({ body: 'courseId' }),
    {
      params: {},
      body: { courseId: ids.course },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB }) },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('class analytics denies a teacher who does not own the course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireCourseOwner({ param: 'courseId' }),
    {
      params: { courseId: ids.course },
      body: {},
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB }) },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('attempt report is hidden from another student', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireAttemptAccess,
    {
      params: { attemptId: ids.attempt },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      QuizAttempt: {
        findById: () => query({
          student: { _id: ids.studentB },
          quiz: { course: { instructor: ids.teacherB } },
        }),
      },
    }
  );
  assert.equal(res.statusCode, 404);
  assert.equal(nextCalled, false);
});

test('concept creation is denied for another teacher’s generic competency', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireConceptCreationAccess,
    {
      body: { competency: ids.competency },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Competency: {
        findById: () => query({ _id: ids.competency, createdBy: ids.teacherB, course: null }),
      },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('discussion reply is denied to a student not enrolled in the course', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireDiscussionAccess('reply'),
    {
      params: { id: ids.discussion },
      user: { _id: ids.studentA, role: 'student' },
    },
    {
      Discussion: {
        findById: () => query({
          course: { _id: ids.course, instructor: ids.teacherB },
        }),
      },
      Enrollment: { exists: async () => false },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('discussion read is denied to an unrelated teacher', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireDiscussionAccess('read'),
    {
      params: { courseId: ids.course },
      user: { _id: ids.teacherA, role: 'teacher' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB }) },
    }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('administrator retains access to a course-management route', async () => {
  const { res, nextCalled } = await execute(
    (access) => access.requireCourseOwner({ body: 'courseId' }),
    {
      params: {},
      body: { courseId: ids.course },
      user: { _id: ids.studentA, role: 'admin' },
    },
    {
      Course: { findById: () => query({ _id: ids.course, instructor: ids.teacherB }) },
    }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});
