require('dotenv').config();
const mongoose = require('mongoose');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const FaceEmbedding = require('../models/FaceEmbedding');
const QRToken = require('../models/QRToken');
const AttendanceAuditLog = require('../models/AttendanceAuditLog');
const AttendanceChallenge = require('../models/AttendanceChallenge');

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to run this migration.');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    for (const model of [
      AttendanceSession,
      AttendanceRecord,
      FaceEmbedding,
      QRToken,
      AttendanceAuditLog,
      AttendanceChallenge,
    ]) {
      await model.createCollection().catch((error) => {
        if (error.codeName !== 'NamespaceExists') throw error;
      });
      await model.syncIndexes();
      console.log(`Attendance collection ready: ${model.collection.collectionName}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

migrate().catch((error) => {
  console.error('Attendance migration failed:', error.message);
  process.exitCode = 1;
});