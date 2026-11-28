const test = require('node:test');
const assert = require('node:assert/strict');
const { protect } = require('../middleware/auth');
const { createSyllabusAccessMiddleware } = require('../middleware/syllabusAccess');

const ids = {
  course: '64b000000000000000000001',
  teacherA: '64b000000000000000000002',
  teacherB: '64b000000000000000000003',
  studentA: '64b000000000000000000004',
  studentB: '64b000000000000000000005',
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

const runMiddleware = async (middleware, req) => {
  const res = createResponse();
  let nextCalled = false;
  let nextError;
  await middleware(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });
  if (nextError) throw nextError;
  return { res, nextCalled };
};

test('student cannot read another student’s personalized plan', async () => {
  const { requireSyllabusCourseAccess } = createSyllabusAccessMiddleware({
    Course: {
      findById: () => ({ select: async () => ({ instructor: ids.teacherA }) }),
    },
    Enrollment: {
      exists: async () => true,
    },
  });

  const { res, nextCalled } = await runMiddleware(
    requireSyllabusCourseAccess({
      allowEnrolledStudentRead: true,
      personalizedPlanRead: true,
    }),
    {
      method: 'GET',
      params: { courseId: ids.course },
      body: {},
      query: { studentId: ids.studentB },
      user: { id: ids.studentA, role: 'student' },
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('teacher cannot edit another teacher’s course', async () => {
  const { requireSyllabusCourseAccess } = createSyllabusAccessMiddleware({
    Course: {
      findById: () => ({ select: async () => ({ instructor: ids.teacherB }) }),
    },
  });

  const { res, nextCalled } = await runMiddleware(
    requireSyllabusCourseAccess(),
    {
      method: 'PUT',
      params: { courseId: ids.course },
      body: {},
      query: {},
      user: { id: ids.teacherA, role: 'teacher' },
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('syllabus access requires an authentication token', async () => {
  const res = createResponse();
  let nextCalled = false;

  await protect(
    { headers: {} },
    res,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});
