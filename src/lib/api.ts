export const PRODUCTION_API_ORIGIN = 'https://smartcollage.vercel.app';
export const AUTH_TOKEN_STORAGE_KEY = 'smartcampus_token';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'STATIC_HOST_NO_BACKEND'
  | 'API_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'SERVER_ERROR'
  | 'HTTP_ERROR';

export class ApiRequestError extends Error {
  status?: number;
  code: ApiErrorCode;
  url?: string;
  method?: string;
  responseBody?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      code: ApiErrorCode;
      url?: string;
      method?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code;
    this.url = options.url;
    this.method = options.method;
    this.responseBody = options.responseBody;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Skip attaching the Authorization Bearer token for this request */
  skipAuth?: boolean;
  /** Skip global 401 session-clear & redirect handling (e.g. login credential submission) */
  skipUnauthorizedHandler?: boolean;
}

export interface UnauthorizedContext {
  endpoint: string;
  url: string;
  status: 401;
  message: string;
}

export interface ApiFailureLogEntry {
  timestamp: string;
  level: 'error' | 'warn';
  method: string;
  endpoint: string;
  url: string;
  resolvedUrl: string;
  apiBaseOrigin: string;
  status?: number;
  statusText?: string;
  code: ApiErrorCode;
  durationMs: number;
  responseHeaders?: Record<string, string>;
  responseBody: unknown;
  message: string;
}

export interface ApiLoggerConfig {
  onFailure?: (entry: ApiFailureLogEntry) => void;
  silentConsole?: boolean;
}

export type RequestInterceptorFn = (
  url: string,
  init: RequestInit
) => { url: string; init: RequestInit } | Promise<{ url: string; init: RequestInit }>;

export type ResponseInterceptorFn = (
  response: Response,
  context: { endpoint: string; url: string }
) => Response | Promise<Response>;

export interface ApiInterceptorConfig {
  getToken?: () => string | null;
  onUnauthorized?: (context: UnauthorizedContext) => void;
  onFailure?: (entry: ApiFailureLogEntry) => void;
  fetchImpl?: typeof fetch;
}

export function sanitizeEnvApiOrigin(rawEnv?: string): string {
  const trimmed = (rawEnv || '').trim();
  if (!trimmed || trimmed === '/' || trimmed === '/api' || trimmed === '/api/') {
    return '';
  }

  // Only accept valid absolute http:// or https:// URLs; ignore malformed values (e.g. "prj_..." project IDs)
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return '';
  }
}

export function resolveRuntimeApiOrigin(hostname?: string, envBaseUrl?: string): string {
  const effectiveHost =
    hostname !== undefined ? hostname : typeof window !== 'undefined' ? window.location.hostname : '';
  const effectiveEnv =
    arguments.length >= 2 ? envBaseUrl : (import.meta.env.VITE_API_BASE_URL as string | undefined);

  const cleanHost = effectiveHost.trim().toLowerCase();
  const isVercelHost = cleanHost === 'vercel.app' || cleanHost.endsWith('.vercel.app');

  // Running on Vercel: use empty base ('') so requests use relative '/api/...' on the same deployment origin
  if (isVercelHost) {
    return '';
  }

  const validEnvOrigin = sanitizeEnvApiOrigin(effectiveEnv);
  if (validEnvOrigin) {
    return validEnvOrigin;
  }

  const isLocalOrContainerDev =
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.endsWith('.run.app');

  if (isLocalOrContainerDev) {
    return '';
  }

  // Non-Vercel static/external hosts without a valid VITE_API_BASE_URL use the full production URL
  return PRODUCTION_API_ORIGIN;
}

export function normalizeApiBase(rawBase?: string): string {
  const cleaned = rawBase?.trim().replace(/\/+$/, '') || '';
  if (!cleaned || cleaned === '/') {
    return '/api';
  }
  if (cleaned === '/api' || (cleaned.startsWith('/') && cleaned.endsWith('/api'))) {
    return cleaned;
  }
  if (cleaned.startsWith('/')) {
    return `${cleaned}/api`;
  }
  const validOrigin = sanitizeEnvApiOrigin(cleaned);
  if (!validOrigin) {
    return '/api';
  }
  return `${validOrigin}/api`;
}

const MAX_API_FAILURE_LOGS = 50;
const SENSITIVE_FIELD_PATTERN = /^(password|pass|token|access_?token|refresh_?token|secret|authorization|cookie|filedata)$/i;

let configuredApiOrigin: string | undefined;
let syncedAuthToken: string | null | undefined;
let registeredTokenGetter: (() => string | null) | undefined;
let registeredUnauthorizedHandler: ((ctx: UnauthorizedContext) => void) | undefined;
let registeredFailureHandler: ((entry: ApiFailureLogEntry) => void) | undefined;
let silentConsoleLogging = false;
let customFetchImpl: typeof fetch | undefined;
const apiFailureLogs: ApiFailureLogEntry[] = [];
const requestInterceptors: RequestInterceptorFn[] = [];
const responseInterceptors: ResponseInterceptorFn[] = [];

export function redactSensitiveData(input: unknown, depth: number = 0): unknown {
  if (depth > 4 || input === null || input === undefined) {
    return input;
  }
  if (typeof input === 'string') {
    const trimmed = input.length > 2000 ? `${input.slice(0, 2000)}... [truncated]` : input;
    return trimmed.replace(/sctk_[A-Za-z0-9._-]+/g, '[REDACTED_TOKEN]');
  }
  if (Array.isArray(input)) {
    return input.slice(0, 25).map(item => redactSensitiveData(item, depth + 1));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      out[key] = SENSITIVE_FIELD_PATTERN.test(key)
        ? '[REDACTED]'
        : redactSensitiveData(val, depth + 1);
    }
    return out;
  }
  return input;
}

export function resolveFullDiagnosticUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const slashUrl = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${slashUrl}`;
  }
  return url;
}

export function configureApiLogger(config: ApiLoggerConfig): () => void {
  if (config.onFailure !== undefined) {
    registeredFailureHandler = config.onFailure;
  }
  if (config.silentConsole !== undefined) {
    silentConsoleLogging = config.silentConsole;
  }
  return () => {
    if (config.onFailure && registeredFailureHandler === config.onFailure) {
      registeredFailureHandler = undefined;
    }
    if (config.silentConsole !== undefined) {
      silentConsoleLogging = false;
    }
  };
}

export function getApiFailureLogs(): ApiFailureLogEntry[] {
  return [...apiFailureLogs];
}

export function clearApiFailureLogs(): void {
  apiFailureLogs.length = 0;
}

export function logApiFailure(entry: ApiFailureLogEntry): void {
  const sanitizedEntry: ApiFailureLogEntry = {
    ...entry,
    responseBody: redactSensitiveData(entry.responseBody),
  };

  apiFailureLogs.unshift(sanitizedEntry);
  if (apiFailureLogs.length > MAX_API_FAILURE_LOGS) {
    apiFailureLogs.length = MAX_API_FAILURE_LOGS;
  }

  if (registeredFailureHandler) {
    registeredFailureHandler(sanitizedEntry);
  }

  if (!silentConsoleLogging) {
    const statusLabel = sanitizedEntry.status !== undefined ? `HTTP ${sanitizedEntry.status}` : 'NETWORK_FAILURE';
    const summary = `[SmartCampus API ${sanitizedEntry.level.toUpperCase()}] ${sanitizedEntry.method} ${sanitizedEntry.resolvedUrl} -> ${statusLabel} (${sanitizedEntry.code})`;
    const details = {
      url: sanitizedEntry.url,
      resolvedUrl: sanitizedEntry.resolvedUrl,
      endpoint: sanitizedEntry.endpoint,
      apiBaseOrigin: sanitizedEntry.apiBaseOrigin || '(same-origin /api)',
      status: sanitizedEntry.status,
      statusText: sanitizedEntry.statusText,
      code: sanitizedEntry.code,
      durationMs: sanitizedEntry.durationMs,
      responseHeaders: sanitizedEntry.responseHeaders,
      responseBody: sanitizedEntry.responseBody,
      message: sanitizedEntry.message,
    };

    if (sanitizedEntry.level === 'error') {
      console.error(summary, details);
    } else {
      console.warn(summary, details);
    }
  }
}

export const apiLogger = {
  logFailure: logApiFailure,
  getLogs: getApiFailureLogs,
  clearLogs: clearApiFailureLogs,
  configure: configureApiLogger,
};

export function setApiBaseOrigin(origin: string): void {
  configuredApiOrigin = sanitizeEnvApiOrigin(origin);
}

export function getApiBaseOrigin(): string {
  if (configuredApiOrigin !== undefined) {
    return configuredApiOrigin;
  }
  return resolveRuntimeApiOrigin();
}

export const API_BASE = normalizeApiBase(resolveRuntimeApiOrigin());

export function buildApiUrl(endpoint: string, base?: string): string {
  const effectiveBase = base !== undefined ? base : getApiBaseOrigin();
  const normalizedBase = normalizeApiBase(effectiveBase);
  const withLeadingSlash = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const dedupedPath = withLeadingSlash.startsWith('/api/')
    ? withLeadingSlash.slice(4)
    : withLeadingSlash === '/api'
      ? ''
      : withLeadingSlash;
  return `${normalizedBase}${dedupedPath}`;
}

export function getStoredToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      return syncedAuthToken ?? null;
    }
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return syncedAuthToken ?? null;
  }
}

export function setStoredToken(token: string | null): void {
  syncedAuthToken = token;
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage access errors in restricted/non-browser environments
  }
}

export function setInterceptorAuthToken(token: string | null): void {
  syncedAuthToken = token;
}

export function resolveActiveAuthToken(): string | null {
  if (syncedAuthToken !== undefined && syncedAuthToken !== null) {
    return syncedAuthToken;
  }
  const fromContext = registeredTokenGetter?.();
  if (fromContext) {
    return fromContext;
  }
  return getStoredToken();
}

export function configureApiInterceptor(config: ApiInterceptorConfig): () => void {
  if (config.getToken !== undefined) {
    registeredTokenGetter = config.getToken;
  }
  if (config.onUnauthorized !== undefined) {
    registeredUnauthorizedHandler = config.onUnauthorized;
  }
  if (config.onFailure !== undefined) {
    registeredFailureHandler = config.onFailure;
  }
  if (config.fetchImpl !== undefined) {
    customFetchImpl = config.fetchImpl;
  }

  return () => {
    if (config.getToken && registeredTokenGetter === config.getToken) {
      registeredTokenGetter = undefined;
    }
    if (config.onUnauthorized && registeredUnauthorizedHandler === config.onUnauthorized) {
      registeredUnauthorizedHandler = undefined;
    }
    if (config.onFailure && registeredFailureHandler === config.onFailure) {
      registeredFailureHandler = undefined;
    }
    if (config.fetchImpl && customFetchImpl === config.fetchImpl) {
      customFetchImpl = undefined;
    }
  };
}

export function resetApiInterceptor(): void {
  syncedAuthToken = undefined;
  registeredTokenGetter = undefined;
  registeredUnauthorizedHandler = undefined;
  registeredFailureHandler = undefined;
  silentConsoleLogging = false;
  customFetchImpl = undefined;
  requestInterceptors.length = 0;
  responseInterceptors.length = 0;
}

export function addRequestInterceptor(interceptor: RequestInterceptorFn): () => void {
  requestInterceptors.push(interceptor);
  return () => {
    const idx = requestInterceptors.indexOf(interceptor);
    if (idx >= 0) requestInterceptors.splice(idx, 1);
  };
}

export function addResponseInterceptor(interceptor: ResponseInterceptorFn): () => void {
  responseInterceptors.push(interceptor);
  return () => {
    const idx = responseInterceptors.indexOf(interceptor);
    if (idx >= 0) responseInterceptors.splice(idx, 1);
  };
}

function isStaticOnlyHostWithoutApiBase(): boolean {
  if (typeof window === 'undefined' || Boolean(getApiBaseOrigin())) {
    return false;
  }
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('.github.io') || host === 'github.io';
}

function isCredentialSubmissionEndpoint(endpoint: string): boolean {
  const normalized = endpoint.split('?')[0].replace(/^\/api/, '');
  return normalized === '/auth/login' || normalized === '/auth/demo-login' || normalized === '/auth/forgot-password';
}

export function isProtectedPortalPathname(pathname: string): boolean {
  const basePath = ((import.meta.env.BASE_URL as string | undefined) || '/').replace(/\/+$/, '');
  const stripped =
    basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname || '/';

  if (
    stripped === '/' ||
    stripped === '/login' ||
    stripped.startsWith('/admission/apply') ||
    stripped.startsWith('/admission/track')
  ) {
    return false;
  }

  return (
    stripped.startsWith('/student') ||
    stripped.startsWith('/faculty') ||
    stripped.startsWith('/parent') ||
    stripped.startsWith('/admission') ||
    stripped.startsWith('/admin')
  );
}

function handleGlobalUnauthorized(context: UnauthorizedContext): void {
  // 1. Clear persisted and in-memory JWT/session token immediately
  setStoredToken(null);

  // 2. Notify AuthContext (or any registered subscriber) so React user/token state clears immediately
  if (registeredUnauthorizedHandler) {
    registeredUnauthorizedHandler(context);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smartcampus:unauthorized', { detail: context }));

    // 3. Redirect to /login only when currently viewing a protected portal route (avoids reload loops on /login)
    if (isProtectedPortalPathname(window.location.pathname)) {
      const basePath = ((import.meta.env.BASE_URL as string | undefined) || '/').replace(/\/+$/, '');
      window.location.replace(`${basePath}/login`);
    }
  }
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { skipAuth = false, skipUnauthorizedHandler = false, headers: rawHeaders, ...restInit } = options;

  const headers: Record<string, string> = {};
  const isFormDataBody = typeof FormData !== 'undefined' && restInit.body instanceof FormData;
  if (!isFormDataBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (rawHeaders) {
    if (typeof Headers !== 'undefined' && rawHeaders instanceof Headers) {
      rawHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(rawHeaders)) {
      for (const [key, value] of rawHeaders) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, rawHeaders as Record<string, string>);
    }
  }

  // Request Interceptor: Automatically attach JWT/session token from AuthContext / storage
  if (!skipAuth && !headers['Authorization'] && !headers['authorization']) {
    const token = resolveActiveAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let targetUrl = buildApiUrl(endpoint);
  let requestInit: RequestInit = {
    ...restInit,
    headers,
  };

  for (const interceptor of requestInterceptors) {
    const next = await interceptor(targetUrl, requestInit);
    targetUrl = next.url;
    requestInit = next.init;
  }

  const method = (requestInit.method || 'GET').toUpperCase();
  const startedAt = Date.now();
  const fetchFn = customFetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchFn(targetUrl, requestInit);
  } catch (networkErr: unknown) {
    const durationMs = Date.now() - startedAt;
    const message =
      'Unable to connect to the Smart Campus server. Check your network connection or API configuration (VITE_API_BASE_URL).';
    const rawReason = networkErr instanceof Error ? networkErr.message : String(networkErr ?? 'Network failure');

    logApiFailure({
      timestamp: new Date().toISOString(),
      level: 'error',
      method,
      endpoint,
      url: targetUrl,
      resolvedUrl: resolveFullDiagnosticUrl(targetUrl),
      apiBaseOrigin: getApiBaseOrigin(),
      code: 'NETWORK_ERROR',
      durationMs,
      responseBody: { networkError: rawReason },
      message,
    });

    throw new ApiRequestError(message, {
      code: 'NETWORK_ERROR',
      url: targetUrl,
      method,
      responseBody: { networkError: rawReason },
    });
  }

  for (const interceptor of responseInterceptors) {
    response = await interceptor(response, { endpoint, url: targetUrl });
  }

  const durationMs = Date.now() - startedAt;
  const contentType = response.headers.get('content-type') || '';
  const rawBodyText = await response.text().catch(() => '');

  let parsedJson: Record<string, any> | null = null;
  if (rawBodyText) {
    const trimmedBody = rawBodyText.trim();
    if (
      contentType.includes('application/json') ||
      trimmedBody.startsWith('{') ||
      trimmedBody.startsWith('[')
    ) {
      try {
        parsedJson = JSON.parse(rawBodyText);
      } catch {
        parsedJson = null;
      }
    }
  }

  const data: Record<string, any> = parsedJson ?? {};
  const diagnosticResponseBody: unknown =
    parsedJson !== null ? parsedJson : rawBodyText ? rawBodyText : null;

  if (!response.ok) {
    const diagnosticHeaders: Record<string, string> = {};
    for (const headerName of ['content-type', 'x-vercel-error', 'x-vercel-id', 'server']) {
      const val = response.headers.get(headerName);
      if (val) {
        diagnosticHeaders[headerName] = val;
      }
    }

    const recordAndBuildError = (
      message: string,
      code: ApiErrorCode,
      level: 'error' | 'warn'
    ): ApiRequestError => {
      logApiFailure({
        timestamp: new Date().toISOString(),
        level,
        method,
        endpoint,
        url: targetUrl,
        resolvedUrl: resolveFullDiagnosticUrl(targetUrl),
        apiBaseOrigin: getApiBaseOrigin(),
        status: response.status,
        statusText: response.statusText || undefined,
        code,
        durationMs,
        responseHeaders: Object.keys(diagnosticHeaders).length > 0 ? diagnosticHeaders : undefined,
        responseBody: diagnosticResponseBody,
        message,
      });

      return new ApiRequestError(message, {
        status: response.status,
        code,
        url: targetUrl,
        method,
        responseBody: diagnosticResponseBody,
      });
    };

    if (response.status === 401) {
      const errorMessage = data?.error || 'Session expired or unauthorized. Please sign in again.';
      const shouldRunGlobalHandler = !skipUnauthorizedHandler && !isCredentialSubmissionEndpoint(endpoint);

      if (shouldRunGlobalHandler) {
        handleGlobalUnauthorized({
          endpoint,
          url: targetUrl,
          status: 401,
          message: errorMessage,
        });
      }

      throw recordAndBuildError(
        data?.error || 'Invalid credentials or unauthorized access.',
        'AUTH_ERROR',
        'warn'
      );
    }

    if (response.status === 403) {
      throw recordAndBuildError(
        data?.error || 'You do not have permission to access this resource.',
        'AUTH_ERROR',
        'warn'
      );
    }

    if (response.status === 404) {
      if (isStaticOnlyHostWithoutApiBase()) {
        throw recordAndBuildError(
          'Backend API is not reachable on GitHub Pages (HTTP 404). GitHub Pages only hosts static files; configure VITE_API_BASE_URL to point to your deployed backend server.',
          'STATIC_HOST_NO_BACKEND',
          'error'
        );
      }
      const isAppLevelNotFound =
        typeof data?.error === 'string' &&
        data.error.length > 0 &&
        !data.error.startsWith('API route not found:');
      throw recordAndBuildError(
        isAppLevelNotFound
          ? data.error
          : `Authentication/API service endpoint not found (HTTP 404 at ${targetUrl}). Verify backend deployment and VITE_API_BASE_URL configuration.`,
        'API_NOT_FOUND',
        'error'
      );
    }

    if (response.status === 400) {
      throw recordAndBuildError(
        data?.error || 'Missing or invalid required fields. Please check your input and try again.',
        'VALIDATION_ERROR',
        'warn'
      );
    }

    if (response.status >= 500) {
      throw recordAndBuildError(
        data?.error || `Server error (HTTP ${response.status}). Please try again shortly.`,
        'SERVER_ERROR',
        'error'
      );
    }

    throw recordAndBuildError(
      data?.error || `Request failed with status ${response.status}.`,
      'HTTP_ERROR',
      'warn'
    );
  }

  return data as T;
}

export const apiClient = {
  request: apiRequest,
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
