import { describe, it, expect } from 'vitest';

describe('db', () => {
  it('should export prisma client', async () => {
    const { db } = await import('../src/db.js');
    expect(db).toBeDefined();
    expect(db.$connect).toBeDefined();
  });
});