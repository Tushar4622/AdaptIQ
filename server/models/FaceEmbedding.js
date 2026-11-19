const mongoose = require('mongoose');

const faceEmbeddingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    role: { type: String, enum: ['student', 'teacher'], required: true },
    ciphertext: { type: String, required: true, select: false },
    iv: { type: String, required: true, select: false },
    authTag: { type: String, required: true, select: false },
    modelVersion: { type: String, required: true },
    consentAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'face_embeddings' }
);

module.exports = mongoose.model('FaceEmbedding', faceEmbeddingSchema);