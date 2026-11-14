jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));

import { ApiError, request, setAccessToken, setSessionHandlers } from '../../src/api/client';

type FakeResponse = { ok: boolean; status: number; text: () => Promise<string> };
const respond = (status: number, body: unknown): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

describe('API client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    setAccessToken(null);
    setSessionHandlers(null);
  });

  it('unwraps the { data } envelope and sends the native client header', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { data: { id: 'x' } }));
    const result = await request<{ id: string }>('/api/v1/menu');
    expect(result).toEqual({ id: 'x' });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['X-Client-Type']).toBe('native');
  });

  it('maps backend error envelopes to ApiError with the server code and message', async () => {
    fetchMock.mockResolvedValueOnce(respond(409, { error: { code: 'CONFLICT', message: 'Order already settled' } }));
    await expect(request('/api/v1/orders', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Order already settled',
    });
  });

  it('reports a network failure as a readable ApiError with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const error = await request('/api/v1/menu').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK');
  });

  it('refreshes once after a 401 and retries the original request', async () => {
    setAccessToken('expired');
    setSessionHandlers({ refresh: async () => 'fresh', onSessionLost: jest.fn() });
    fetchMock
      .mockResolvedValueOnce(respond(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(respond(200, { data: 'ok' }));

    await expect(request('/api/v1/orders')).resolves.toBe('ok');
    const retryHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer fresh');
  });

  it('ends the session when refresh fails and never loops', async () => {
    const onSessionLost = jest.fn();
    setAccessToken('expired');
    setSessionHandlers({ refresh: async () => null, onSessionLost });
    fetchMock.mockResolvedValue(respond(401, { error: { code: 'UNAUTHORIZED', message: 'no' } }));

    await expect(request('/api/v1/orders')).rejects.toMatchObject({ status: 401 });
    expect(onSessionLost).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh for auth endpoints', async () => {
    const refresh = jest.fn();
    setAccessToken('expired');
    setSessionHandlers({ refresh, onSessionLost: jest.fn() });
    fetchMock.mockResolvedValueOnce(respond(401, { error: { code: 'UNAUTHORIZED', message: 'bad password' } }));
    await expect(request('/api/v1/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });
});
