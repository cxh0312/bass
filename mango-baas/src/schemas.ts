import { z } from 'zod';

// 认证 Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string(),
});

// 查询 Schema
export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  filter: z.string().optional(),
  sort: z.string().optional(),
  fields: z.string().optional(),
});

// 数据操作 Schema — 禁止 _id 字段
export const dataPayloadSchema = z.object({
  _id: z.void().optional(), // 显式拒绝 _id
}).passthrough();

export const createDataSchema = dataPayloadSchema;
export const updateDataSchema = dataPayloadSchema;

// 动态 Zod Schema 构建器（用于 Collection.schema 动态校验）
export function buildDynamicSchema(schemaDef: Record<string, unknown>): z.ZodSchema {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, def] of Object.entries(schemaDef)) {
    shape[key] = z.unknown();
  }
  return z.object(shape);
}

// 响应类型
export const responseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.unknown().optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

// 邮箱验证 Schema
export const sendVerificationSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

// 密码重置 Schema
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});