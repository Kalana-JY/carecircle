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

  if (!missingSecretLogged) {
    console.warn('[Security] JWT_SECRET is not set in environment variables. Using default fallback secret.');
    missingSecretLogged = true;
  }

  return DEV_JWT_SECRET;
};

module.exports = { getJwtSecret };
