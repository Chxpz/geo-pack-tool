import { logger, withLogContext, type LogBindings } from '@/lib/logger';

export interface RequestContext extends LogBindings {
  route?: string;
  method?: string;
  requestId?: string;
  ip?: string;
  userId?: string;
  businessId?: string;
}

function firstHeaderValue(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
}

export function getClientIp(request: Request): string | undefined {
  return (
    firstHeaderValue(request.headers.get('x-forwarded-for')) ??
    firstHeaderValue(request.headers.get('cf-connecting-ip')) ??
    firstHeaderValue(request.headers.get('x-real-ip'))
  );
}

export function getRequestId(request: Request): string | undefined {
  return (
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    undefined
  );
}

export function getRequestContext(
  request: Request,
  bindings: RequestContext = {},
): RequestContext {
  const route = bindings.route ?? new URL(request.url).pathname;

  return {
    route,
    method: request.method,
    requestId: getRequestId(request),
    ip: getClientIp(request),
    ...bindings,
  };
}

export function createRequestLogger(
  request: Request,
  bindings: RequestContext = {},
) {
  const context = getRequestContext(request, bindings);
  return withLogContext(context);
}

export function logRouteError(
  request: Request,
  message: string,
  error: unknown,
  bindings: RequestContext = {},
): void {
  createRequestLogger(request, bindings).error({ err: error }, message);
}

export { logger };
