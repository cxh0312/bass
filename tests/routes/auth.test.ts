import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';

// Set JWT_SECRET before importing admin routes
process.env.JWT_SECRET = 'test-secret-key-for-vitest';

// mock jsonwebtoken (used by authMiddleware and admin routes)
vi.mock('jsonwebtoken', () => {
  // Create a real-like JWT structure
  const createToken = (payload: object) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${payloadB64}.test-signature`;
  };
  const sign = vi.fn((payload: any) => createToken(payload));
  const verify = vi.fn((token: string) => {
    if (token.startsWith('mocked-token-')) {
      const userId = token.replace('mocked-token-', '');
      return { userId, role: 'admin', iat: 0, exp: 0 };
    }
    // Parse JWT-like token (from createToken)
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        try {
          const payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
          const payload = JSON.parse(Buffer.from(padded, 'base64').toString());
          return { ...payload, iat: 0, exp: 0 };
        } catch {
          // invalid JWT
        }
      }
    }
    throw new Error('Invalid token');
  });
  return { sign, verify, default: { sign, verify } };
});

// mock db
vi.mock('../../src/db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    collection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    data: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    rateLimit: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    apiKey: {
      findFirst: vi.fn(),
    },
    webhook: {
      findMany: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

// mock hono/jwt (used by auth routes)
vi.mock('hono/jwt', () => ({
  sign: vi.fn(async () => 'mocked-token'),
  verify: vi.fn(async (token: string) => {
    if (token.startsWith('mocked-token-')) {
      const userId = token.replace('mocked-token-', '');
      return { userId, role: 'admin', iat: 0, exp: 0 };
    }
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        try {
          let payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
          const payload = JSON.parse(Buffer.from(padded, 'base64').toString());
          return { ...payload, iat: 0, exp: 0 };
        } catch {
          // invalid JWT
        }
      }
    }
    throw new Error('Invalid token');
  }),
}));

// mock authMiddleware to bypass JWT verification for data routes
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ code: 401, msg: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    // Parse JWT-like token to get payload (handles base64url encoding)
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        try {
          let payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
          const payload = JSON.parse(Buffer.from(padded, 'base64').toString());
          c.set('user', payload);
          c.set('authType', 'jwt');
          return next();
        } catch {
          // invalid JWT
        }
      }
    }
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }),
  verifyAuth: vi.fn(),
  adminAuthMiddleware: vi.fn(async (c, next) => next()),
}));

// mock rbac middleware
vi.mock('../../src/middleware/rbac.js', () => ({
  projectAccessMiddleware: vi.fn(async (c, next) => {
    const user = c.get('user') as { userId?: string; role?: string } | undefined;
    if (!user?.userId) {
      return c.json({ code: 401, msg: 'Unauthorized' }, 401);
    }
    const projectId = c.req.param('projectId');
    if (user.role === 'admin') {
      c.set('project', { id: projectId, name: 'Test Project' });
      c.set('member', { role: 'admin' });
      return next();
    }
    const mockDb = (await import('../../src/db.js')).db;
    const fullProject = await mockDb.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!fullProject) {
      return c.json({ code: 404, msg: 'Project not found' }, 404);
    }
    const member = fullProject.members?.find((m: any) => m.userId === user.userId);
    if (!member && user.role !== 'admin') {
      return c.json({ code: 403, msg: 'Access denied' }, 403);
    }
    c.set('project', fullProject);
    c.set('member', member || { role: user.role });
    return next();
  }),
  checkPermission: vi.fn((member, collection, action) => {
    if (member?.role === 'admin') return true;
    if (collection?.permissions) {
      const perms = collection.permissions as Record<string, string[]>;
      if (perms[action]?.includes(member?.role || '')) return true;
      if (perms[action]?.includes('viewer')) return true;
      return false;
    }
    if (action === 'read') return true;
    if (action === 'write') return member?.role === 'editor';
    if (action === 'delete') return member?.role === 'admin';
    return false;
  }),
}));

// mock audit service
vi.mock('../../src/services/audit.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// mock rate limit service
vi.mock('../../src/services/rate-limit.js', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, resetAt: 0 }),
}));

// mock rate limit middleware
vi.mock('../../src/middleware/rate-limit.js', () => ({
  rateLimitMiddleware: vi.fn(async (c, next) => next()),
}));

// mock webhook service
vi.mock('../../src/services/webhook.js', () => ({
  triggerWebhooks: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '../../src/db.js';
import { authRoutes } from '../../src/routes/auth.js';
import { adminRoutes } from '../../src/routes/admin.js';
import { dataRoutes } from '../../src/routes/data.js';

function createTestApp() {
  const app = new Hono();
  app.route('/api/auth', authRoutes);
  app.route('/admin', adminRoutes);
  app.route('/api', dataRoutes);
  return app;
}

// Helper to create test JWTs (mirrors what the mock's sign function does)
function createTestToken(payload: { userId: string; role: string }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${payloadB64}.test-signature`;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('auth routes', () => {
  let mockDb: typeof db;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/db.js');
    mockDb = mod.db as typeof db;
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const app = createTestApp();
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe(400);
      expect(body.msg).toBe('Validation failed');
    });

    it('should return 400 for invalid email format', async () => {
      const app = createTestApp();
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'password123', name: 'Test' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when email already registered', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue({
        id: 'existing', email: 'test@example.com', password: 'hash', name: 'Existing', role: 'viewer', createdAt: new Date(), updatedAt: new Date()
      } as any);
      const app = createTestApp();

      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.msg).toBe('Email already registered');
    });

    it('should successfully register a new user', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.user.create).mockResolvedValue({
        id: 'new-user-id', email: 'new@example.com', password: 'hashed', name: 'New User', role: 'viewer', createdAt: new Date(), updatedAt: new Date(),
      } as any);
      const app = createTestApp();

      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', password: 'password123', name: 'New User' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(0);
      expect(body.data.email).toBe('new@example.com');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing fields', async () => {
      const app = createTestApp();
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should return 401 for non-existent user', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'notexist@example.com', password: 'password123' }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 for wrong password', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      vi.mocked(mockDb.user.findUnique).mockResolvedValue({
        id: 'user-1', email: 'test@example.com', password: hashed, name: 'Test', role: 'viewer', createdAt: new Date(), updatedAt: new Date(),
      } as any);
      const app = createTestApp();

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' }),
      });

      expect(res.status).toBe(401);
    });

    it('should successfully login with valid credentials', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      vi.mocked(mockDb.user.findUnique).mockResolvedValue({
        id: 'user-1', email: 'test@example.com', password: hashed, name: 'Test User', role: 'editor', createdAt: new Date(), updatedAt: new Date(),
      } as any);
      const app = createTestApp();

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'correct-password' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(0);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.role).toBe('editor');
    });
  });

  // NOTE: /me and admin routes call verify() directly inside route handlers,
  // not just via middleware. Since our mock tokens aren't valid JWTs,
  // these tests would require mocking hono/jwt's verify function.
  // Skipping these tests for now - they're covered by integration tests.

  describe('GET /api/auth/me', () => {
    it('should return 401 when no token provided', async () => {
      const app = createTestApp();
      const res = await app.request('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const app = createTestApp();
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(res.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      const token = createTestToken({ userId: 'nonexistent', role: 'viewer' });
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/auth/me', {
        headers: authHeader(token),
      });

      expect(res.status).toBe(404);
    });

    it('should return user data for valid token', async () => {
      const token = createTestToken({ userId: 'user-123', role: 'editor' });
      vi.mocked(mockDb.user.findUnique).mockResolvedValue({
        id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'editor',
      });
      const app = createTestApp();

      const res = await app.request('/api/auth/me', {
        headers: authHeader(token),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe('user-123');
    });
  });
});

// Admin routes - verify via mock JWT
  describe('admin routes', () => {
    let mockDb: typeof db;

    beforeEach(async () => {
      vi.clearAllMocks();
      const mod = await import('../../src/db.js');
      mockDb = mod.db as typeof db;
    });

    describe('GET /admin/users', () => {
      it('should return 401 when no token provided', async () => {
        const app = createTestApp();
        const res = await app.request('/admin/users');

        expect(res.status).toBe(401);
      });

      it('should return 401 for invalid token', async () => {
        const app = createTestApp();
        const res = await app.request('/admin/users', {
          headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.status).toBe(401);
      });

      it('should return 403 when user is not admin', async () => {
        const token = createTestToken({ userId: 'user-1', role: 'editor' });
        const app = createTestApp();

        const res = await app.request('/admin/users', {
          headers: authHeader(token),
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.msg).toBe('Admin only');
      });

      it('should return user list for admin', async () => {
        const token = createTestToken({ userId: 'admin-1', role: 'admin' });
        vi.mocked(mockDb.user.findMany).mockResolvedValue([
          { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'viewer', createdAt: new Date() },
          { id: 'user-2', email: 'user2@example.com', name: 'User 2', role: 'editor', createdAt: new Date() },
        ] as any);
        const app = createTestApp();

        const res = await app.request('/admin/users', {
          headers: authHeader(token),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toHaveLength(2);
      });
    });

    describe('PUT /admin/users/:id/role', () => {
      it('should return 401 when no token provided', async () => {
        const app = createTestApp();
        const res = await app.request('/admin/users/user-1/role', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'editor' }),
        });

        expect(res.status).toBe(401);
      });

      it('should return 403 when user is not admin', async () => {
        const token = createTestToken({ userId: 'user-1', role: 'viewer' });
        const app = createTestApp();

        const res = await app.request('/admin/users/user-1/role', {
          method: 'PUT',
          headers: { ...authHeader(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'editor' }),
        });

        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid role', async () => {
        const token = createTestToken({ userId: 'admin-1', role: 'admin' });
        const app = createTestApp();

        const res = await app.request('/admin/users/user-1/role', {
          method: 'PUT',
          headers: { ...authHeader(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'superuser' }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.msg).toBe('Invalid role');
      });

      it('should successfully update user role', async () => {
        const token = createTestToken({ userId: 'admin-1', role: 'admin' });
        vi.mocked(mockDb.user.update).mockResolvedValue({
          id: 'user-1', email: 'user1@example.com', role: 'editor',
        } as any);
        const app = createTestApp();

        const res = await app.request('/admin/users/user-1/role', {
          method: 'PUT',
          headers: { ...authHeader(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'editor' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.role).toBe('editor');
      });
    });

    describe('GET /admin/stats', () => {
      it('should return 401 when no token provided', async () => {
        const app = createTestApp();
        const res = await app.request('/admin/stats');

        expect(res.status).toBe(401);
      });

      it('should return 403 when user is not admin', async () => {
        const token = createTestToken({ userId: 'user-1', role: 'editor' });
        const app = createTestApp();

        const res = await app.request('/admin/stats', {
          headers: authHeader(token),
        });

        expect(res.status).toBe(403);
      });

      it('should return stats for admin', async () => {
        const token = createTestToken({ userId: 'admin-1', role: 'admin' });
        vi.mocked(mockDb.user.count).mockResolvedValue(10);
        vi.mocked(mockDb.project.count).mockResolvedValue(5);
        vi.mocked(mockDb.data.count).mockResolvedValue(100);
        const app = createTestApp();

        const res = await app.request('/admin/stats', {
          headers: authHeader(token),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.userCount).toBe(10);
        expect(body.data.projectCount).toBe(5);
        expect(body.data.dataCount).toBe(100);
      });
    });
  });

  describe('data routes', () => {
    let mockDb: typeof db;
    let editorToken: string;
    let viewerToken: string;
    let adminToken: string;

    beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/db.js');
    mockDb = mod.db as typeof db;
    editorToken = createTestToken({ userId: 'editor-1', role: 'editor' });
    viewerToken = createTestToken({ userId: 'viewer-1', role: 'viewer' });
    adminToken = createTestToken({ userId: 'admin-1', role: 'admin' });
  });

  const mockProject = { id: 'proj-1', name: 'Test Project', apiKey: 'test-key', members: [{ userId: 'editor-1', role: 'editor' }, { userId: 'viewer-1', role: 'viewer' }] };
  const mockCollection = { id: 'col-1', projectId: 'proj-1', name: 'posts', strict: false, schema: null, permissions: null };

  describe('GET /api/:projectId/:collection', () => {
    it('should return 401 without auth', async () => {
      const app = createTestApp();
      const res = await app.request('/api/proj-1/posts');

      expect(res.status).toBe(401);
    });

    it('should return 404 when collection not found', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/nonexistent', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(404);
    });

    it('should return 403 when viewer has no read permission', async () => {
      const collectionNoViewer = { id: 'col-1', projectId: 'proj-1', name: 'posts', strict: false, schema: null, permissions: { read: ['editor', 'admin'] } };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(collectionNoViewer as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        headers: authHeader(viewerToken),
      });

      expect(res.status).toBe(403);
    });

    it('should return data list for authorized user', async () => {
      const mockData = [
        { id: 'data-1', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'Post 1' }, createdAt: new Date() },
        { id: 'data-2', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'Post 2' }, createdAt: new Date() },
      ];
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findMany).mockResolvedValue(mockData as any);
      vi.mocked(mockDb.data.count).mockResolvedValue(2);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
    });

    it('should support pagination parameters', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findMany).mockResolvedValue([] as any);
      vi.mocked(mockDb.data.count).mockResolvedValue(0);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts?page=2&limit=10', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });

    it('should support sort with descending order', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findMany).mockResolvedValue([] as any);
      vi.mocked(mockDb.data.count).mockResolvedValue(0);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts?sort=-createdAt', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
    });

    it('should support sort with ascending order', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findMany).mockResolvedValue([] as any);
      vi.mocked(mockDb.data.count).mockResolvedValue(0);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts?sort=createdAt', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
    });

    it('should return empty data when filter has invalid JSON', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findMany).mockResolvedValue([] as any);
      vi.mocked(mockDb.data.count).mockResolvedValue(0);
      const app = createTestApp();

      // Invalid JSON filter - should be caught and return empty object, still works
      const res = await app.request('/api/proj-1/posts?filter=invalid-json', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/:projectId/:collection', () => {
    it('should return 400 when trying to write _id field', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        method: 'POST',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: 'cannot-write-this', title: 'New Post' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.msg).toBe('Field _id is read-only');
    });

    it('should return 403 when viewer tries to write', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        method: 'POST',
        headers: { ...authHeader(viewerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Post' }),
      });

      expect(res.status).toBe(403);
    });

    it('should return 403 when editor lacks write permission via custom permissions', async () => {
      const collectionNoEditorWrite = { id: 'col-1', projectId: 'proj-1', name: 'posts', strict: false, schema: null, permissions: { read: ['viewer', 'editor', 'admin'], write: ['admin'], delete: ['admin'] } };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(collectionNoEditorWrite as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        method: 'POST',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Post' }),
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 when collection not found on POST', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        method: 'POST',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Post' }),
      });

      expect(res.status).toBe(404);
    });

    it('should successfully create data with editor', async () => {
      const newData = { id: 'new-data-id', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'New Post' }, createdAt: new Date() };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.create).mockResolvedValue(newData as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts', {
        method: 'POST',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Post' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.title).toBe('New Post');
    });
  });

  describe('GET /api/:projectId/:collection/:id', () => {
    it('should return 404 when collection not found', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(404);
    });

    it('should return 403 when viewer has no read permission', async () => {
      const collectionNoViewer = { id: 'col-1', projectId: 'proj-1', name: 'posts', strict: false, schema: null, permissions: { read: ['editor', 'admin'] } };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(collectionNoViewer as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        headers: authHeader(viewerToken),
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 when data not found', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/nonexistent-id', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(404);
    });

    it('should return single data record', async () => {
      const mockData = { id: 'data-1', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'Post 1', content: 'Hello' }, createdAt: new Date() };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(mockData as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe('data-1');
    });
  });

  describe('PUT /api/:projectId/:collection/:id', () => {
    it('should return 400 when trying to update _id', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'PUT',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: 'cannot-change', title: 'Updated Post' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 403 when viewer tries to update', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'PUT',
        headers: { ...authHeader(viewerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Post' }),
      });

      expect(res.status).toBe(403);
    });

    it('should successfully update data with editor', async () => {
      const existingData = { id: 'data-1', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'Old Title' }, createdAt: new Date() };
      const updatedData = { id: 'data-1', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'Updated Title' }, updatedAt: new Date() };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(existingData as any);
      vi.mocked(mockDb.data.update).mockResolvedValue(updatedData as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'PUT',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/:projectId/:collection/:id', () => {
    it('should return 403 when non-admin tries to delete', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'DELETE',
        headers: authHeader(editorToken),
      });

      expect(res.status).toBe(403);
    });

    it('should return 403 when viewer tries to delete', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'DELETE',
        headers: authHeader(viewerToken),
      });

      expect(res.status).toBe(403);
    });

    it('should successfully delete data with admin', async () => {
      const existingData = { id: 'data-1', collectionId: 'col-1', projectId: 'proj-1', payload: { title: 'To Delete' } };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(existingData as any);
      vi.mocked(mockDb.data.delete).mockResolvedValue(existingData as any);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe('data-1');
    });

    it('should return 404 when collection not found on delete', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/data-1', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 when data not found on delete', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(mockCollection as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/nonexistent-id', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/:projectId/:collection/:id', () => {
    it('should return 404 when data not found on PUT', async () => {
      const collectionWithEditorWrite = { id: 'col-1', projectId: 'proj-1', name: 'posts', strict: false, schema: null, permissions: null };
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(collectionWithEditorWrite as any);
      vi.mocked(mockDb.data.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/posts/nonexistent-id', {
        method: 'PUT',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Post' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.msg).toBe('Data not found');
    });

    it('should return 404 when collection not found on PUT', async () => {
      vi.mocked(mockDb.project.findUnique).mockResolvedValue(mockProject as any);
      vi.mocked(mockDb.collection.findFirst).mockResolvedValue(null);
      const app = createTestApp();

      const res = await app.request('/api/proj-1/nonexistent-collection/data-1', {
        method: 'PUT',
        headers: { ...authHeader(editorToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Post' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.msg).toBe('Collection not found');
    });
  });
});