export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void | Promise<void>;
}

export interface RetryableResponseLike {
  status?: number;
}

const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Error & {
    status?: number;
    response?: RetryableResponseLike;
    cause?: { code?: string };
    code?: string;
  };

  const status = candidate.status ?? candidate.response?.status;
  if (typeof status === 'number' && TRANSIENT_STATUS_CODES.has(status)) {
    return true;
  }

  if (candidate.name === 'AbortError' || candidate.name === 'TimeoutError') {
    return true;
  }

  const code = candidate.code ?? candidate.cause?.code;
  if (typeof code === 'string' && NETWORK_ERROR_CODES.has(code)) {
    return true;
  }

  return candidate instanceof TypeError;
}

export function calculateRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(250, Math.floor(exponentialDelay / 4) + 1));
  return Math.min(maxDelayMs, exponentialDelay + jitter);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    attempt += 1;

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delayMs = calculateRetryDelay(attempt, baseDelayMs, maxDelayMs);
      await onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry operation failed');
}
