const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PASSWORD_BCRYPT_COST = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [12, 'Password must be at least 12 characters'],
      maxlength: [72, 'Password cannot exceed 72 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    institution: {
      type: String,
      default: '',
    },
    course: {
      type: String,
      default: '',
    },
    careerGoals: {
      type: String,
      default: '',
    },
    // Gamification
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner',
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    // Auth
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenFamilyId: {
      type: String,
      select: false,
    },
    refreshTokenFamilyExpiresAt: {
      type: Date,
      select: false,
    },
    refreshTokenHistory: {
      type: [{
        _id: false,
        familyId: { type: String, required: true },
        tokenHash: { type: String, required: true },
        usedAt: { type: Date, required: true },
      }],
      default: [],
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    loginLockedUntil: {
      type: Date,
      default: null,
      select: false,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecretEncrypted: {
      type: String,
      select: false,
    },
    mfaPendingSecretEncrypted: {
      type: String,
      select: false,
    },
    mfaSetupExpiresAt: {
      type: Date,
      select: false,
    },
    mfaRecoveryCodeHashes: {
      type: [String],
      default: [],
      select: false,
    },
    mfaLastUsedStep: {
      type: Number,
      default: -1,
      select: false,
    },
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, PASSWORD_BCRYPT_COST);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Update level based on XP
userSchema.pre('save', function (next) {
  if (this.xp >= 5000) this.level = 'Expert';
  else if (this.xp >= 2000) this.level = 'Advanced';
  else if (this.xp >= 500) this.level = 'Intermediate';
  else this.level = 'Beginner';
  next();
});

// Instance method — compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual — enrolled courses count
userSchema.virtual('enrolledCoursesCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'student',
  count: true,
});

const User = mongoose.model('User', userSchema);
User.PASSWORD_BCRYPT_COST = PASSWORD_BCRYPT_COST;
module.exports = User;
