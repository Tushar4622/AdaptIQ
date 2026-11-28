const test = require('node:test');
const assert = require('node:assert/strict');
const { getSeedPasswords } = require('../utils/seed');

const seedPasswordVariables = [
  'SEED_ADMIN_PASSWORD',
  'SEED_TEACHER_PASSWORD',
  'SEED_STUDENT_PASSWORD',
];

test('seed requires separate policy-compliant passwords from environment variables', () => {
  const originalValues = Object.fromEntries(
    seedPasswordVariables.map((name) => [name, process.env[name]])
  );

  try {
    seedPasswordVariables.forEach((name) => { delete process.env[name]; });
    assert.throws(getSeedPasswords, /SEED_ADMIN_PASSWORD/);

    process.env.SEED_ADMIN_PASSWORD = 'AdminSeedPass123!';
    process.env.SEED_TEACHER_PASSWORD = 'TeacherSeedPass123!';
    process.env.SEED_STUDENT_PASSWORD = 'StudentSeedPass123!';
    assert.deepEqual(getSeedPasswords(), {
      admin: 'AdminSeedPass123!',
      teacher: 'TeacherSeedPass123!',
      student: 'StudentSeedPass123!',
    });

    process.env.SEED_STUDENT_PASSWORD = 'short';
    assert.throws(getSeedPasswords, /SEED_STUDENT_PASSWORD/);
  } finally {
    seedPasswordVariables.forEach((name) => {
      if (originalValues[name] === undefined) delete process.env[name];
      else process.env[name] = originalValues[name];
    });
  }
});
