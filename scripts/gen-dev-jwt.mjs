/**
 * Generates local-dev JWT tokens for the Supabase docker stack.
 * Run once: node scripts/gen-dev-jwt.mjs
 * Copy the output into .env.local
 */

import { createHmac } from 'crypto';

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeJwt(payload) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 3650; // 10 years

const anonKey = makeJwt({ role: 'anon', iss: 'supabase-local', iat, exp });
const serviceKey = makeJwt({ role: 'service_role', iss: 'supabase-local', iat, exp });

console.log('# Add these to .env.local\n');
console.log(`SUPABASE_URL=http://localhost:8000`);
console.log(`SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
console.log(`\n# PostgREST JWT config (used in docker-compose.yml)`);
console.log(`PGRST_JWT_SECRET=${JWT_SECRET}`);
