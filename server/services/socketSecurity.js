const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const Course = require('../models/Course');
const LiveClass = require('../models/LiveClass');
const { Chat, Enrollment } = require('../models');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const objectIdPayloadSchema = objectIdSchema;
const liveClassPayloadSchema = z.object({ classId: objectIdSchema }).strict();
const leaveLiveClassPayloadSchema = z.undefined().optional();
const signalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('offer'), sdp: z.string().min(1).max(65_536) }).strict(),
  z.object({ type: z.literal('answer'), sdp: z.string().min(1).max(65_536) }).strict(),
  z.object({
    type: z.literal('candidate'),
    candidate: z.object({
      candidate: z.string().max(4096),
      sdpMid: z.string().max(128).nullable().optional(),
      sdpMLineIndex: z.number().int().min(0).max(65_535).nullable().optional(),
      usernameFragment: z.string().max(512).nullable().optional(),
    }).catchall(z.union([
      z.string().max(4096),
      z.number().finite(),
      z.boolean(),
      z.null(),
    ])).superRefine((candidate, context) => {
      if (Object.keys(candidate).length > 20) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Too many ICE candidate fields.' });
      }
    }),
  }).strict(),
]);
const signalPayloadSchema = z.object({
  classId: objectIdSchema,
  targetSocketId: z.string().min(1).max(128).regex(/^[\w-]+$/),
  signal: signalSchema,
}).strict();
const cameraStatePayloadSchema = z.object({
  classId: objectIdSchema,
  cameraOn: z.boolean(),
}).strict();

const MAX_EVENTS_PER_WINDOW = 60;
const EVENT_WINDOW_MS = 10_000;

class SocketPolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SocketPolicyError';
    this.code = code;
  }
}

const idOf = (value) => String(value?._id || value || '');
const selectedQuery = (query, fields) =>
  typeof query?.select === 'function' ? query.select(fields) : query;

const createSocketSecurity = ({
  UserModel = User,
  CourseModel = Course,
  EnrollmentModel = Enrollment,
  ChatModel = Chat,
  LiveClassModel = LiveClass,
  verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET),
  now = Date.now,
  maxEvents = MAX_EVENTS_PER_WINDOW,
  windowMs = EVENT_WINDOW_MS,
  logError = (event, error) =>
    console.error(JSON.stringify({
      event: 'socket.error',
      operation: String(event).slice(0, 80),
      errorType: error?.name || 'Error',
    })),
} = {}) => {
  const loadUser = async (userId) => {
    const user = await selectedQuery(UserModel.findById(userId), 'name role isActive');
    if (
      !user ||
      !user.isActive ||
      !['student', 'teacher', 'admin'].includes(user.role)
    ) {
      return null;
    }

    return {
      id: idOf(user._id || userId),
      name: user.name || 'User',
      role: user.role,
    };
  };

  const authenticate = async (socket, next) => {
    const token = socket.handshake.auth?.token
      || (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (typeof token !== 'string' || token.length === 0 || token.length > 8192) {
      return next(Object.assign(new Error('Authentication required.'), {
        data: { code: 'AUTHENTICATION_REQUIRED' },
      }));
    }

    try {
      const decoded = verifyAccessToken(token);
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        typeof decoded.id !== 'string' ||
        (decoded.tokenUse !== undefined && decoded.tokenUse !== 'access') ||
        !Number.isFinite(decoded.exp) ||
        decoded.exp * 1000 <= now()
      ) {
        throw new Error('Invalid access token.');
      }

      const user = await loadUser(decoded.id);
      if (!user) throw new Error('User is unavailable.');

      socket.data.authUser = user;
      socket.data.tokenExpiresAt = decoded.exp * 1000;
      return next();
    } catch {
      return next(Object.assign(new Error('Invalid authentication token.'), {
        data: { code: 'AUTHENTICATION_FAILED' },
      }));
    }
  };

  const consumeEvent = (socket) => {
    const timestamp = now();
    let rate = socket.data.eventRateLimit;
    if (!rate || timestamp - rate.windowStartedAt >= windowMs) {
      rate = { windowStartedAt: timestamp, count: 0 };
      socket.data.eventRateLimit = rate;
    }
    if (rate.count >= maxEvents) return false;
    rate.count += 1;
    return true;
  };

  const reportEventError = (socket, event, ack, code, message) => {
    const response = { ok: false, error: { code, message } };
    if (typeof ack === 'function') ack(response);
    socket.emit('socket:error', { event, ...response.error });
  };

  const currentUserForSocket = async (socket) => {
    if (!socket.data.authUser || socket.data.tokenExpiresAt <= now()) {
      throw new SocketPolicyError('AUTHENTICATION_EXPIRED', 'Reconnect with a valid access token.');
    }

    const user = await loadUser(socket.data.authUser.id);
    if (!user) {
      throw new SocketPolicyError('AUTHENTICATION_EXPIRED', 'Reconnect with a valid access token.');
    }
    socket.data.authUser = user;
    return user;
  };

  const requireCourseAccess = async (user, courseId) => {
    const course = await selectedQuery(CourseModel.findById(courseId), 'instructor');
    if (!course) throw new SocketPolicyError('NOT_FOUND', 'Course not found.');

    if (user.role === 'admin') return course;
    if (user.role === 'teacher' && idOf(course.instructor) === user.id) return course;
    if (
      user.role === 'student' &&
      await EnrollmentModel.exists({ student: user.id, course: courseId })
    ) {
      return course;
    }

    throw new SocketPolicyError('FORBIDDEN', 'You cannot access this course room.');
  };

  const findLiveClass = async (classId) => {
    const liveClass = await selectedQuery(
      LiveClassModel.findById(classId),
      'status teacher participants'
    );
    if (!liveClass) throw new SocketPolicyError('NOT_FOUND', 'Live class not found.');
    if (liveClass.status !== 'live') {
      throw new SocketPolicyError('FORBIDDEN', 'This live class is not active.');
    }
    return liveClass;
  };

  const participantFor = (liveClass, userId) =>
    (liveClass.participants || []).find((participant) => idOf(participant.student) === userId);

  const requireLiveClassAccess = (user, liveClass) => {
    if (user.role === 'admin') return null;
    if (user.role === 'teacher' && idOf(liveClass.teacher) === user.id) return null;
    if (user.role === 'student' && participantFor(liveClass, user.id)) {
      return participantFor(liveClass, user.id);
    }
    throw new SocketPolicyError('FORBIDDEN', 'You are not registered for this live class.');
  };

  const install = (io) => {
    io.use(authenticate);
    io.on('connection', (socket) => {
      const register = (event, schema, handler) => {
        socket.on(event, (...args) => {
          const lastArgument = args[args.length - 1];
          const ack = typeof lastArgument === 'function' ? args.pop() : undefined;
          if (!consumeEvent(socket)) {
            reportEventError(socket, event, ack, 'RATE_LIMITED', 'Too many events. Try again shortly.');
            return;
          }

          const payload = args.length === 1 ? args[0] : undefined;
          const parsed = args.length <= 1 ? schema.safeParse(payload) : { success: false };
          if (!parsed.success) {
            reportEventError(socket, event, ack, 'INVALID_PAYLOAD', 'Invalid event payload.');
            return;
          }

          void (async () => {
            const user = await currentUserForSocket(socket);
            await handler(user, parsed.data);
            if (typeof ack === 'function') ack({ ok: true });
          })().catch((error) => {
            if (error instanceof SocketPolicyError) {
              reportEventError(socket, event, ack, error.code, error.message);
              if (error.code === 'AUTHENTICATION_EXPIRED') socket.disconnect(true);
              return;
            }
            logError(event, error);
            reportEventError(socket, event, ack, 'EVENT_FAILED', 'The event could not be completed.');
          });
        });
      };

      const leaveLiveClass = () => {
        const classId = socket.data.liveClassMeta?.classId;
        if (!classId) return;

        const roomName = `live-class:${classId}`;
        socket.leave(roomName);
        io.to(roomName).emit('live-class:presence', {
          type: 'left',
          socketId: socket.id,
          userId: socket.data.authUser.id,
        });
        socket.data.liveClassMeta = null;
      };

      const getLiveClassParticipants = (classId) => {
        const room = io.sockets.adapter.rooms.get(`live-class:${classId}`);
        if (!room) return [];
        return Array.from(room).map((socketId) => {
          const peer = io.sockets.sockets.get(socketId);
          const peerUser = peer?.data?.authUser;
          if (!peerUser) return null;
          return {
            socketId,
            userId: peerUser.id,
            name: peerUser.name,
            role: peerUser.role,
          };
        }).filter(Boolean);
      };

      register('join-user', objectIdPayloadSchema, async (user, userId) => {
        if (userId !== user.id) {
          throw new SocketPolicyError('FORBIDDEN', 'You can only join your own user room.');
        }
        await socket.join(`user:${userId}`);
      });

      register('leave-user', objectIdPayloadSchema, async (user, userId) => {
        if (userId !== user.id) {
          throw new SocketPolicyError('FORBIDDEN', 'You can only leave your own user room.');
        }
        socket.leave(`user:${userId}`);
      });

      register('join-course', objectIdPayloadSchema, async (user, courseId) => {
        await requireCourseAccess(user, courseId);
        await socket.join(`course:${courseId}`);
      });

      register('leave-course', objectIdPayloadSchema, async (_user, courseId) => {
        const roomName = `course:${courseId}`;
        if (!socket.rooms.has(roomName)) {
          throw new SocketPolicyError('FORBIDDEN', 'You are not in this course room.');
        }
        socket.leave(roomName);
      });

      register('join-chat', objectIdPayloadSchema, async (user, chatId) => {
        const chat = await selectedQuery(ChatModel.findById(chatId), 'participants');
        if (!chat) throw new SocketPolicyError('NOT_FOUND', 'Chat not found.');
        const isParticipant = (chat.participants || []).some(
          (participantId) => idOf(participantId) === user.id
        );
        if (!isParticipant) {
          throw new SocketPolicyError('FORBIDDEN', 'You cannot access this chat room.');
        }
        await socket.join(`chat:${chatId}`);
      });

      register('leave-chat', objectIdPayloadSchema, async (_user, chatId) => {
        const roomName = `chat:${chatId}`;
        if (!socket.rooms.has(roomName)) {
          throw new SocketPolicyError('FORBIDDEN', 'You are not in this chat room.');
        }
        socket.leave(roomName);
      });

      register('join-live-class', liveClassPayloadSchema, async (user, { classId }) => {
        const liveClass = await findLiveClass(classId);
        requireLiveClassAccess(user, liveClass);

        if (socket.data.liveClassMeta?.classId !== classId) leaveLiveClass();
        await socket.join(`live-class:${classId}`);
        socket.data.liveClassMeta = { classId };
        socket.emit('live-class:participants', getLiveClassParticipants(classId));
        io.to(`live-class:${classId}`).emit('live-class:presence', {
          type: 'joined',
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          role: user.role,
        });
      });

      register('leave-live-class', leaveLiveClassPayloadSchema, async () => {
        leaveLiveClass();
      });

      register('live-class:webrtc-signal', signalPayloadSchema, async (user, payload) => {
        if (socket.data.liveClassMeta?.classId !== payload.classId) {
          throw new SocketPolicyError('FORBIDDEN', 'Join this live class before signaling.');
        }

        const liveClass = await findLiveClass(payload.classId);
        requireLiveClassAccess(user, liveClass);

        const target = io.sockets.sockets.get(payload.targetSocketId);
        const targetClassId = target?.data?.liveClassMeta?.classId;
        if (!target || targetClassId !== payload.classId || target.data.tokenExpiresAt <= now()) {
          throw new SocketPolicyError('NOT_FOUND', 'Signal recipient is not in this live class.');
        }

        const targetUser = await loadUser(target.data.authUser?.id);
        if (!targetUser) {
          throw new SocketPolicyError('NOT_FOUND', 'Signal recipient is not in this live class.');
        }
        requireLiveClassAccess(targetUser, liveClass);

        target.emit('live-class:webrtc-signal', {
          classId: payload.classId,
          fromSocketId: socket.id,
          fromUserId: user.id,
          signal: payload.signal,
        });
      });

      register('live-class:camera-state', cameraStatePayloadSchema, async (user, payload) => {
        if (socket.data.liveClassMeta?.classId !== payload.classId) {
          throw new SocketPolicyError('FORBIDDEN', 'Join this live class before changing camera state.');
        }

        const liveClass = await findLiveClass(payload.classId);
        const participant = requireLiveClassAccess(user, liveClass);
        const isClassTeacher = user.role === 'teacher' && idOf(liveClass.teacher) === user.id;
        if (payload.cameraOn && !isClassTeacher && !participant?.cameraApproved) {
          throw new SocketPolicyError('FORBIDDEN', 'Camera access has not been approved.');
        }

        io.to(`live-class:${payload.classId}`).emit('live-class:camera-state', {
          classId: payload.classId,
          socketId: socket.id,
          userId: user.id,
          cameraOn: payload.cameraOn,
        });
      });

      socket.on('disconnect', leaveLiveClass);
    });
  };

  return { authenticate, install };
};

module.exports = {
  createSocketSecurity,
  MAX_EVENTS_PER_WINDOW,
  EVENT_WINDOW_MS,
};
