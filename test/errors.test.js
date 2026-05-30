import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  GameRuleError,
  InternalError,
  httpErrorBody
} from '../server/errors.js';

test('error classes carry the expected status/code/expose', () => {
  assert.equal(new ValidationError().status, 400);
  assert.equal(new ValidationError().code, 'INVALID_INPUT');
  assert.equal(new ValidationError().expose, true);

  assert.equal(new NotFoundError().status, 404);
  assert.equal(new NotFoundError().code, 'NOT_FOUND');

  assert.equal(new GameRuleError().status, 422);
  assert.equal(new GameRuleError().code, 'GAME_RULE');

  assert.equal(new InternalError().status, 500);
  assert.equal(new InternalError().expose, false);
});

test('httpErrorBody normalizes exposable errors and supports custom codes', () => {
  const { status, body } = httpErrorBody(new NotFoundError('Unknown tier.', 'unknown_tier'));
  assert.equal(status, 404);
  assert.deepEqual(body, { error: { code: 'unknown_tier', message: 'Unknown tier.' } });
});

test('httpErrorBody hides internal details and never leaks a stack in production', () => {
  const { status, body } = httpErrorBody(new Error('secret db connection string'), { production: true });
  assert.equal(status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(body.error.message, 'Internal server error.');
  assert.equal(JSON.stringify(body).includes('secret'), false, 'must not leak the real message');
  assert.equal(JSON.stringify(body).includes('stack'), false, 'must not include a stack');
});

test('httpErrorBody keeps the real message in development for debugging', () => {
  const { body } = httpErrorBody(new Error('boom'), { production: false });
  assert.equal(body.error.message, 'boom');
});

test('centralized error middleware turns an unexpected throw into a safe 500', async () => {
  const app = express();
  app.get('/boom', () => {
    throw new Error('kaboom internal detail');
  });
  app.use((err, req, res, next) => {
    const { status, body } = httpErrorBody(err, { production: true });
    if (res.headersSent) return next(err);
    res.status(status).json(body);
  });

  const res = await request(app).get('/boom');
  assert.equal(res.status, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.equal(res.text.includes('kaboom'), false, 'internal detail not leaked');
});

test('AppError is the base class for the typed errors', () => {
  assert.ok(new ValidationError() instanceof AppError);
  assert.ok(new NotFoundError() instanceof AppError);
});
