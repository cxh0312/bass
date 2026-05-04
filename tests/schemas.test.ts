import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('schemas', () => {
  it('should export all schema definitions', async () => {
    const schemas = await import('../src/schemas.js');
    expect(schemas.registerSchema).toBeDefined();
    expect(schemas.loginSchema).toBeDefined();
    expect(schemas.querySchema).toBeDefined();
    expect(schemas.dataPayloadSchema).toBeDefined();
  });

  it('should validate register schema', async () => {
    const { registerSchema } = await import('../src/schemas.js');
    const result = registerSchema.safeParse({ email: 'test@example.com', password: 'password123' });
    expect(result.success).toBe(true);
  });
});