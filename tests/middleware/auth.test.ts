import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import { authMiddleware, verifyAuth } from '../../src/middleware/auth.js';

// mock db
vi.mock('../../src/db.js', () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    apiKey: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from '../../src/db.js';

function createMockContext(overrides?: {
  header?: (name: string) => string | null;
  query?: (name: string) => string | null;
  get?: (key: string) => unknown;
  set?: (key: string, value: unknown) => void;
  json?: (body: unknown, status: number) => Response;
}) {
  const ctx = {
    req: {
      header: (name: string) => overrides?.header?.(name) ?? null,
      query: (name: string) => overrides?.query?.(name) ?? null,
    },
    set: overrides?.set ?? vi.fn(),
    json: overrides?.json ?? vi.fn((body: unknown, status: number) => new Response(JSON.stringify(body), { status })),
    get: overrides?.get ?? vi.fn(),
  };
  return ctx as unknown as Context;
}

function createNext() {
  return vi.fn().mockResolvedValue(undefined);
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key authentication', () => {
    it('should return 401 when API key is invalid', async () => {
      vi.mocked(db.project.findUnique).mockResolvedValue(null);
      const c = createMockContext({
        header: (name: string) => name === 'X-API-Key' ? 'invalid-key' : null,
      });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Invalid API Key' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass when API key is valid', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project', apiKey: 'valid-key' };
      vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as any);
      const c = createMockContext({
        header: (name: string) => name === 'X-API-Key' ? 'valid-key' : null,
      });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.set).toHaveBeenCalledWith('project', mockProject);
      expect(c.set).toHaveBeenCalledWith('authType', 'apiKey');
      expect(next).toHaveBeenCalled();
    });

    it('should accept API key from query parameter', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project', apiKey: 'query-key' };
      vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as any);
      const c = createMockContext({
        header: () => null,
        query: (name: string) => name === 'apiKey' ? 'query-key' : null,
      });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.set).toHaveBeenCalledWith('project', mockProject);
      expect(c.set).toHaveBeenCalledWith('authType', 'apiKey');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('JWT authentication', () => {
    it('should return 401 when no Authorization header', async () => {
      const c = createMockContext({ header: () => null });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Unauthorized' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const c = createMockContext({
        header: (name: string) => name === 'Authorization' ? 'Basic abc' : null,
      });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Unauthorized' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const c = createMockContext({
        header: (name: string) => name === 'Authorization' ? 'Bearer invalid-token' : null,
      });
      const next = createNext();

      await authMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Invalid token' }, 401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('verifyAuth', () => {
  it('should return apiKey auth type with project', () => {
    const mockProject = { id: 'proj-1', name: 'Test Project' };
    const c = {
      get: (key: string) => {
        if (key === 'authType') return 'apiKey';
        if (key === 'project') return mockProject;
        return undefined;
      },
    } as unknown as Context;

    const result = verifyAuth(c);

    expect(result).toEqual({ type: 'apiKey', project: mockProject });
  });

  it('should return jwt auth type with user', () => {
    const mockUser = { userId: 'user-1', role: 'editor' };
    const c = {
      get: (key: string) => {
        if (key === 'authType') return 'jwt';
        if (key === 'user') return mockUser;
        return undefined;
      },
    } as unknown as Context;

    const result = verifyAuth(c);

    expect(result).toEqual({ type: 'jwt', user: mockUser });
  });
});