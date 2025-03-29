// src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // Added missing JWT import

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    // match: [/\S+@\S+\.\S+/, 'Please use a valid email address'] // Commented out as requested
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    // minlength: [6, 'Password must be at least 6 characters'], // Commented out as requested
    select: false
  },
  role: {
    type: String,
    enum: ['Institute', 'Verifier'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  lastLogin: Date,
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: String,
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockUntil: Date
});

// Indexes
UserSchema.index({ role: 1 });

// Pre-save hooks
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (err) {
    next(err);
  }
});

// Instance methods
UserSchema.methods = {
  comparePassword: async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  },

  trackLogin: function (req) {
    this.lastLogin = Date.now();
    this.loginHistory.push({
      timestamp: Date.now(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    if (this.loginHistory.length > 10) this.loginHistory.shift();
  },

  generateAuthToken: function () {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  generateRefreshToken: function () {
    const refreshToken = jwt.sign(
      { id: this._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    this.refreshToken = refreshToken;
    return refreshToken;
  }
};

// Static methods
UserSchema.statics = {
  findByEmail: async function (email) {
    return this.findOne({ email }).select('+password +refreshToken');
  }
};

export default mongoose.model('User', UserSchema);