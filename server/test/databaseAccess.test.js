const test = require('node:test');
const assert = require('node:assert/strict');
const { getMongoOptions } = require('../config/db');

test('production MongoDB connections require verified TLS', () => {
  assert.deepEqual(
    getMongoOptions({ nodeEnv: 'production', mongoUri: 'mongodb+srv://cluster.example/app' }),
    {
      serverSelectionTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    },
  );
});

test('production rejects URI options that disable TLS or certificate verification', () => {
  for (const option of [
    'tls=false',
    'ssl=false',
    'tlsInsecure=true',
    'tlsAllowInvalidCertificates=true',
    'tlsAllowInvalidHostnames=true',
  ]) {
    assert.throws(
      () => getMongoOptions({
        nodeEnv: 'production',
        mongoUri: `mongodb://db.example/app?${option}`,
      }),
      /verified TLS/,
    );
  }
  assert.throws(
    () => getMongoOptions({
      nodeEnv: 'production',
      mongoUri: 'mongodb://db.example/app',
      mongoTls: 'false',
    }),
    /verified TLS/,
  );
  assert.throws(
    () => getMongoOptions({
      nodeEnv: 'development',
      mongoUri: 'mongodb://db.example/app?tls=false',
      mongoTls: 'true',
    }),
    /verified TLS/,
  );
});

test('development can opt in to verified MongoDB TLS', () => {
  assert.deepEqual(
    getMongoOptions({
      nodeEnv: 'development',
      mongoUri: 'mongodb://db.example/app',
      mongoTls: 'true',
    }),
    {
      serverSelectionTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    },
  );
});
