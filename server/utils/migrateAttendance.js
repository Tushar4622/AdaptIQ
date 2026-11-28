require('dotenv').config();
const mongoose = require('mongoose');
const { connectMongo } = require('../config/db');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const FaceEmbedding = require('../models/FaceEmbedding');
const QRToken = require('../models/QRToken');
const AttendanceAuditLog = require('../models/AttendanceAuditLog');
const AttendanceChallenge = require('../models/AttendanceChallenge');

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to run this migration.');
  await connectMongo();

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
  console.error(`[attendance migration] failed (${error?.name || 'Error'}).`);
  process.exitCode = 1;
});