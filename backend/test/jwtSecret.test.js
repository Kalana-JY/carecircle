const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const jwtPath = require.resolve('../src/config/jwt');

const restoreEnv = (previous) => {
  if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous.nodeEnv;
  if (previous.secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous.secret;
  delete require.cache[jwtPath];
};

describe('JWT secret configuration', { concurrency: 1 }, () => {
  const previous = { nodeEnv: process.env.NODE_ENV, secret: process.env.JWT_SECRET };

  afterEach(() => {
    restoreEnv(previous);
  });

  it('rejects a missing secret when running in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete require.cache[jwtPath];
    const { getJwtSecret } = require('../src/config/jwt');

    assert.throws(() => getJwtSecret(), /not configured/);
  });

  it('keeps a development fallback outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    delete require.cache[jwtPath];
    const { getJwtSecret } = require('../src/config/jwt');

    assert.equal(getJwtSecret(), 'fallback_secret');
  });
});
