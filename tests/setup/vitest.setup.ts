import { afterEach, beforeEach, vi } from 'vitest';

const baseEnv = {
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'test-nextauth-secret-32-characters',
  CRON_SECRET: 'test-cron-secret',
};

beforeEach(() => {
  process.env = {
    ...process.env,
    ...baseEnv,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
