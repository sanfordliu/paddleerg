import { createSession, takeSession } from '../sessions';

describe('oauth sessions', () => {
  const tokens = {
    access_token: 'a',
    refresh_token: 'r',
    expires_at: 1,
    athlete: { id: 1, firstname: 'Pat' },
  };

  test('create and take once', () => {
    const sid = createSession(tokens);
    expect(takeSession(sid)).toEqual(tokens);
    expect(takeSession(sid)).toBeNull();
  });

  test('missing sid returns null', () => {
    expect(takeSession('missing')).toBeNull();
  });

  test('expired session returns null', () => {
    jest.useFakeTimers();
    const sid = createSession(tokens);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(takeSession(sid)).toBeNull();
    jest.useRealTimers();
  });
});
