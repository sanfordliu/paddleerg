import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';

describe('SPA static fallback', () => {
  const prevStatic = process.env.STATIC_DIR;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paddleerg-spa-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<!doctype html><title>spa</title>');
    process.env.STATIC_DIR = tmpDir;
  });

  afterAll(() => {
    if (prevStatic === undefined) delete process.env.STATIC_DIR;
    else process.env.STATIC_DIR = prevStatic;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('serves index.html for /strava-callback (client OAuth return)', async () => {
    const res = await request(createApp()).get('/strava-callback').query({ sid: 'abc', state: 'xyz' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>spa</title>');
  });

  test('does not SPA-fallback API paths under /strava/', async () => {
    const res = await request(createApp()).get('/strava/session/missing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Session not found or already used' });
    expect(res.text).not.toContain('<title>spa</title>');
  });
});

