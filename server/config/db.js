const mongoose = require('mongoose');

const isTlsDisabled = (uri) => {
  const query = uri.split('?')[1] || '';
  const options = new URLSearchParams(query);
  return (
    options.get('tls')?.toLowerCase() === 'false' ||
    options.get('ssl')?.toLowerCase() === 'false' ||
    options.get('tlsInsecure')?.toLowerCase() === 'true' ||
    options.get('tlsAllowInvalidCertificates')?.toLowerCase() === 'true' ||
    options.get('tlsAllowInvalidHostnames')?.toLowerCase() === 'true'
  );
};

const getMongoOptions = ({
  nodeEnv = process.env.NODE_ENV,
  mongoUri = process.env.MONGO_URI,
  mongoTls = process.env.MONGO_TLS,
} = {}) => {
  const production = nodeEnv === 'production';
  const tlsRequired = production || mongoTls === 'true';
  if (
    (production && mongoTls === 'false') ||
    (tlsRequired && isTlsDisabled(mongoUri || ''))
  ) {
    throw new Error('MongoDB connections configured for TLS must use verified TLS.');
  }

  return {
    serverSelectionTimeoutMS: 5000,
    ...(tlsRequired
      ? { tls: true, tlsAllowInvalidCertificates: false, tlsAllowInvalidHostnames: false }
      : {}),
  };
};

const connectMongo = async (uri = process.env.MONGO_URI) => {
  if (!uri) throw new Error('MONGO_URI is required to connect to MongoDB.');
  return mongoose.connect(uri, getMongoOptions({ mongoUri: uri }));
};

const connectDB = async () => {
  try {
    const conn = await connectMongo();
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[db] MongoDB connection failed (${error?.name || 'Error'}).`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

module.exports = connectDB;
module.exports.connectMongo = connectMongo;
module.exports.getMongoOptions = getMongoOptions;
