const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const INITIAL_LOCK_MS = 60_000;
const MAX_LOCK_MS = 60 * 60 * 1000;

const isLoginLocked = (user, now = Date.now()) =>
  Boolean(user?.loginLockedUntil && new Date(user.loginLockedUntil).getTime() > now);

const getLoginLockDuration = (failedAttempts) => {
  if (failedAttempts < MAX_FAILED_LOGIN_ATTEMPTS) return 0;
  const escalation = Math.floor(
    (failedAttempts - MAX_FAILED_LOGIN_ATTEMPTS) / MAX_FAILED_LOGIN_ATTEMPTS
  );
  return Math.min(MAX_LOCK_MS, INITIAL_LOCK_MS * (2 ** escalation));
};

const recordFailedLogin = async (userModel, userId, now = Date.now()) => {
  const query = userModel.findByIdAndUpdate(
    userId,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  );
  if (typeof query.select === 'function') query.select('+failedLoginAttempts');
  const user = await query;
  if (!user) return { failedAttempts: 0, lockedUntil: null };

  const lockDuration = getLoginLockDuration(user.failedLoginAttempts);
  if (!lockDuration) {
    return { failedAttempts: user.failedLoginAttempts, lockedUntil: null };
  }

  const lockedUntil = new Date(now + lockDuration);
  await userModel.updateOne(
    { _id: userId, failedLoginAttempts: user.failedLoginAttempts },
    { $set: { loginLockedUntil: lockedUntil } }
  );
  return { failedAttempts: user.failedLoginAttempts, lockedUntil };
};

const clearFailedLoginState = async (userModel, user) => {
  await userModel.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, loginLockedUntil: null } }
  );
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = null;
};

module.exports = {
  INITIAL_LOCK_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  MAX_LOCK_MS,
  clearFailedLoginState,
  getLoginLockDuration,
  isLoginLocked,
  recordFailedLogin,
};
