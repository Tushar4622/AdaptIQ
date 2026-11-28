const test = require('node:test');
const assert = require('node:assert/strict');
const { createSocketSecurity } = require('../services/socketSecurity');

const ids = {
  userA: '64b000000000000000000001',
  userB: '64b000000000000000000002',
  course: '64b000000000000000000003',
};

class MockIo {
  constructor() {
    this.sockets = {
      adapter: { rooms: new Map() },
      sockets: new Map(),
    };
  }

  use(middleware) {
    this.authMiddleware = middleware;
  }

  on(event, handler) {
    if (event === 'connection') this.connectionHandler = handler;
  }

  to() {
    return { emit: () => {} };
  }
}

class MockSocket {
  constructor(token) {
    this.id = 'socket-a';
    this.handshake = { auth: token ? { token } : {}, headers: {} };
    this.data = {};
    this.rooms = new Set([this.id]);
    this.handlers = new Map();
    this.emitted = [];
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  async join(room) {
    this.rooms.add(room);
  }

  leave(room) {
    this.rooms.delete(room);
  }

  emit(event, payload) {
    this.emitted.push({ event, payload });
  }

  disconnect() {
    this.disconnected = true;
  }
}

const selectedQuery = (value) => ({ select: async () => value });
const createUserModel = (user) => ({
  findById: (id) => selectedQuery(id === user._id ? user : null),
});
const authenticateSocket = (io, socket) => new Promise((resolve) => {
  io.authMiddleware(socket, resolve);
});
const emitWithAck = (socket, event, ...args) => new Promise((resolve) => {
  socket.handlers.get(event)(...args, resolve);
});

test('Socket.IO rejects a connection without an access token', async () => {
  const io = new MockIo();
  createSocketSecurity().install(io);
  const error = await authenticateSocket(io, new MockSocket());

  assert.equal(error.message, 'Authentication required.');
  assert.equal(error.data.code, 'AUTHENTICATION_REQUIRED');
});

test('a user cannot join another user’s private room', async () => {
  const io = new MockIo();
  const now = 1_000_000;
  const socket = new MockSocket('valid-token');
  createSocketSecurity({
    UserModel: createUserModel({
      _id: ids.userA,
      name: 'Student A',
      role: 'student',
      isActive: true,
    }),
    verifyAccessToken: () => ({ id: ids.userA, exp: 2_000 }),
    now: () => now,
  }).install(io);

  assert.equal(await authenticateSocket(io, socket), undefined);
  io.connectionHandler(socket);
  const result = await emitWithAck(socket, 'join-user', ids.userB);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'FORBIDDEN');
  assert.equal(socket.rooms.has(`user:${ids.userB}`), false);
});

test('a teacher cannot join another teacher’s course room', async () => {
  const io = new MockIo();
  const socket = new MockSocket('valid-token');
  createSocketSecurity({
    UserModel: createUserModel({
      _id: ids.userA,
      name: 'Teacher A',
      role: 'teacher',
      isActive: true,
    }),
    CourseModel: {
      findById: () => selectedQuery({ instructor: ids.userB }),
    },
    EnrollmentModel: { exists: async () => false },
    verifyAccessToken: () => ({ id: ids.userA, exp: 2_000 }),
    now: () => 1_000_000,
  }).install(io);

  assert.equal(await authenticateSocket(io, socket), undefined);
  io.connectionHandler(socket);
  const result = await emitWithAck(socket, 'join-course', ids.course);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'FORBIDDEN');
  assert.equal(socket.rooms.has(`course:${ids.course}`), false);
});

test('socket event rate limits are enforced per connection', async () => {
  const io = new MockIo();
  const socket = new MockSocket('valid-token');
  createSocketSecurity({
    UserModel: createUserModel({
      _id: ids.userA,
      name: 'Student A',
      role: 'student',
      isActive: true,
    }),
    verifyAccessToken: () => ({ id: ids.userA, exp: 2_000 }),
    now: () => 1_000_000,
    maxEvents: 1,
  }).install(io);

  assert.equal(await authenticateSocket(io, socket), undefined);
  io.connectionHandler(socket);
  assert.equal((await emitWithAck(socket, 'join-user', ids.userA)).ok, true);
  const limited = await emitWithAck(socket, 'join-user', ids.userA);

  assert.equal(limited.ok, false);
  assert.equal(limited.error.code, 'RATE_LIMITED');
});
