// Small reusable error helpers for consistent, safe error responses.
//
// HTTP errors are normalized to:  { error: { code, message } }
// Socket errors keep the existing client-compatible shape:  { code, message }
// (emitted on the existing "error:message" event by server/multiplayer.js).
import { config as envConfig } from './config.js';

export class AppError extends Error {
  constructor(message, { code = 'INTERNAL_ERROR', status = 500, expose = false } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    // `expose` marks whether the message is safe to send to the client. Only
    // exposable errors reveal their message; everything else gets a generic one.
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request.', code = 'INVALID_INPUT') {
    super(message, { code, status: 400, expose: true });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', code = 'NOT_FOUND') {
    super(message, { code, status: 404, expose: true });
  }
}

export class GameRuleError extends AppError {
  constructor(message = 'That action is not allowed.', code = 'GAME_RULE') {
    super(message, { code, status: 422, expose: true });
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error.', code = 'INTERNAL_ERROR') {
    super(message, { code, status: 500, expose: false });
  }
}

const GENERIC_MESSAGE = 'Internal server error.';

// Build a normalized HTTP error body. Never includes a stack trace. In
// production, non-exposable (unexpected) errors collapse to a generic message
// so internals are not leaked; in development the real message is kept to aid
// debugging.
export function httpErrorBody(err, { production = envConfig.nodeEnv === 'production' } = {}) {
  if (err instanceof AppError && err.expose) {
    return { status: err.status, body: { error: { code: err.code, message: err.message } } };
  }
  const status = err instanceof AppError ? err.status : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message = production ? GENERIC_MESSAGE : (err && err.message) || GENERIC_MESSAGE;
  return { status, body: { error: { code, message } } };
}
