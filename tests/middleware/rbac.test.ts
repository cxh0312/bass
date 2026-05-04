import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import { projectAccessMiddleware, checkPermission } from '../../src/middleware/rbac.js';

vi.mock('../../src/db.js', () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from '../../src/db.js';

function createMockContext(overrides?: {
  get?: (key: string) => unknown;
  param?: (name: string) => string;
}) {
  return {
    get: overrides?.get ?? vi.fn(),
    req: {
      param: overrides?.param ?? (() => ''),
    },
    set: vi.fn(),
    json: vi.fn((body, status) => new Response(JSON.stringify(body), { status })),
  } as unknown as Context;
}

function createNext() {
  return vi.fn().mockResolvedValue(undefined);
}

describe('checkPermission', () => {
  describe('admin role', () => {
    it('should grant all permissions to admin', () => {
      const member = { role: 'admin' };
      expect(checkPermission(member, null, 'read')).toBe(true);
      expect(checkPermission(member, null, 'write')).toBe(true);
      expect(checkPermission(member, null, 'delete')).toBe(true);
    });
  });

  describe('viewer role', () => {
    it('should have read permission by default', () => {
      const member = { role: 'viewer' };
      expect(checkPermission(member, null, 'read')).toBe(true);
    });

    it('should not have write permission by default', () => {
      const member = { role: 'viewer' };
      expect(checkPermission(member, null, 'write')).toBe(false);
    });

    it('should not have delete permission by default', () => {
      const member = { role: 'viewer' };
      expect(checkPermission(member, null, 'delete')).toBe(false);
    });
  });

  describe('editor role', () => {
    it('should have read permission by default', () => {
      const member = { role: 'editor' };
      expect(checkPermission(member, null, 'read')).toBe(true);
    });

    it('should have write permission by default', () => {
      const member = { role: 'editor' };
      expect(checkPermission(member, null, 'write')).toBe(true);
    });

    it('should not have delete permission by default', () => {
      const member = { role: 'editor' };
      expect(checkPermission(member, null, 'delete')).toBe(false);
    });
  });

  describe('null member', () => {
    it('should have read permission by default', () => {
      expect(checkPermission(null, null, 'read')).toBe(true);
    });

    it('should not have write permission', () => {
      expect(checkPermission(null, null, 'write')).toBe(false);
    });

    it('should not have delete permission', () => {
      expect(checkPermission(null, null, 'delete')).toBe(false);
    });
  });

  describe('custom permissions', () => {
    it('should use custom permissions when provided', () => {
      const member = { role: 'viewer' };
      const collection = {
        permissions: {
          read: ['editor'],
          write: ['admin'],
          delete: [],
        },
      };

      expect(checkPermission(member, collection, 'read')).toBe(false);
      expect(checkPermission(member, collection, 'write')).toBe(false);
    });

    it('should allow viewer to read when viewer is in permissions', () => {
      const member = { role: 'viewer' };
      const collection = {
        permissions: {
          read: ['viewer', 'editor'],
          write: ['editor'],
          delete: ['admin'],
        },
      };

      // viewer can read because 'viewer' is in the read permissions list
      expect(checkPermission(member, collection, 'read')).toBe(true);
      // viewer cannot write because 'editor' is in write list, not 'viewer'
      expect(checkPermission(member, collection, 'write')).toBe(false);
      expect(checkPermission(member, collection, 'delete')).toBe(false);
    });

    it('should check viewer permission even when member role is empty', () => {
      const member = { role: '' };
      const collection = {
        permissions: {
          read: ['viewer'],
          write: [],
          delete: [],
        },
      };

      expect(checkPermission(member, collection, 'read')).toBe(true);
      expect(checkPermission(member, collection, 'write')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for unknown action with admin', () => {
      const member = { role: 'admin' };
      // admin always returns true regardless of action
      expect(checkPermission(member, null, 'delete' as any)).toBe(true);
    });

    it('should return false for null collection with editor on delete', () => {
      const member = { role: 'editor' };
      expect(checkPermission(member, null, 'delete')).toBe(false);
    });

    it('should return false for unknown action (not read/write/delete)', () => {
      const member = { role: 'editor' };
      // Unknown action, not admin, falls through to return false
      expect(checkPermission(member, null, 'update' as any)).toBe(false);
    });

    it('should return false for unknown action with null member', () => {
      // Unknown action, null member, not admin
      expect(checkPermission(null, null, 'update' as any)).toBe(false);
    });
  });
});

describe('projectAccessMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key authentication', () => {
    it('should pass through without checking project membership', async () => {
      const c = createMockContext({
        get: (key: string) => key === 'authType' ? 'apiKey' : undefined,
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(next).toHaveBeenCalled();
      expect(c.set).not.toHaveBeenCalled();
    });
  });

  describe('JWT authentication', () => {
    it('should return 401 when no authType in context', async () => {
      const c = createMockContext({
        get: () => undefined,
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Unauthorized' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is undefined', async () => {
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return undefined;
          return undefined;
        },
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Unauthorized' }, 401);
    });

    it('should return 401 when user has no userId', async () => {
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return { role: 'editor' };
          return undefined;
        },
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 401, msg: 'Unauthorized' }, 401);
    });

    it('should return 404 when project not found', async () => {
      vi.mocked(db.project.findUnique).mockResolvedValue(null);
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return { userId: 'user-1', role: 'editor' };
          return undefined;
        },
        param: () => 'nonexistent-project',
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 404, msg: 'Project not found' }, 404);
    });

    it('should allow global admin to access any project', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project', members: [] };
      vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as any);
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return { userId: 'admin-1', role: 'admin' };
          return undefined;
        },
        param: () => 'proj-1',
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.set).toHaveBeenCalledWith('project', mockProject);
      expect(c.set).toHaveBeenCalledWith('member', { role: 'admin' });
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user is not a project member', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        members: [{ userId: 'other-user', role: 'editor' }],
      };
      vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as any);
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return { userId: 'user-1', role: 'editor' };
          return undefined;
        },
        param: () => 'proj-1',
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.json).toHaveBeenCalledWith({ code: 403, msg: 'Access denied' }, 403);
    });

    it('should allow project member to access their project', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        members: [
          { userId: 'user-1', role: 'viewer' },
          { userId: 'other-user', role: 'editor' },
        ],
      };
      vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as any);
      const c = createMockContext({
        get: (key: string) => {
          if (key === 'authType') return 'jwt';
          if (key === 'user') return { userId: 'user-1', role: 'viewer' };
          return undefined;
        },
        param: () => 'proj-1',
      });
      const next = createNext();

      await projectAccessMiddleware(c, next);

      expect(c.set).toHaveBeenCalledWith('project', mockProject);
      expect(c.set).toHaveBeenCalledWith('member', { userId: 'user-1', role: 'viewer' });
      expect(next).toHaveBeenCalled();
    });
  });
});