import request from 'supertest';
import { createApp } from '../../app';

describe('GET /health', () => {
  test('returns ok payload', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: 'paddleerg-server' });
  });
});
