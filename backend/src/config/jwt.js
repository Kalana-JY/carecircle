const DEV_JWT_SECRET = 'fallback_secret';

let missingSecretLogged = false;

const readSecret = () => String(process.env.JWT_SECRET || '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '');

/**
 * Production must set JWT_SECRET. Local development and the test suite can
 * keep the built-in fallback so other modules still start without extra setup.
 */
const getJwtSecret = () => {
  const secret = readSecret();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    if (!missingSecretLogged) {
      console.error('JWT_SECRET is not set. Refusing to sign or verify tokens.');
      missingSecretLogged = true;
    }
    const error = new Error('JWT secret is not configured');
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }

  return DEV_JWT_SECRET;
};

module.exports = { getJwtSecret };
