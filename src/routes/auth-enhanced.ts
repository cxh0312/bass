import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { sendVerificationSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas.js';
import { createAuditLog } from '../services/audit.js';

export const authEnhancedRoutes = new Hono();

// 发送邮箱验证链接（Mock 实现）
authEnhancedRoutes.post('/send-verification', async (c) => {
  const body = await c.req.json();
  const result = sendVerificationSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { email } = result.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // 安全考虑，不暴露用户是否存在
    return c.json({ success: true, message: 'Verification email sent' });
  }

  const token = await sign(
    { userId: user.id, email, purpose: 'email-verify' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  );

  // Mock: 输出到控制台
  console.log(`[Email Verify] Token for ${email}: ${token}`);

  await db.user.update({
    where: { id: user.id },
    data: { verificationToken: token }
  });

  return c.json({ success: true, message: 'Verification email sent' });
});

// 验证邮箱
authEnhancedRoutes.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const result = verifyEmailSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { token } = result.data;

  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.purpose !== 'email-verify') {
      return c.json({ success: false, error: 'INVALID_TOKEN' }, 400);
    }

    await db.user.update({
      where: { id: payload.userId as string },
      data: { emailVerified: true, verificationToken: null }
    });

    return c.json({ success: true, message: 'Email verified' });
  } catch {
    return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
  }
});

// 请求密码重置（Mock 实现）
authEnhancedRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const result = forgotPasswordSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { email } = result.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return c.json({ success: true, message: 'Password reset email sent' });
  }

  // 生成无状态 JWT 作为重置 token
  const token = await sign(
    { userId: user.id, purpose: 'password-reset' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  // Mock: 输出到控制台
  console.log(`[Password Reset] Token for ${email}: ${token}`);

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) }
  });

  return c.json({ success: true, message: 'Password reset email sent' });
});

// 重置密码
authEnhancedRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const result = resetPasswordSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { token, newPassword } = result.data;

  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.purpose !== 'password-reset') {
      return c.json({ success: false, error: 'INVALID_TOKEN' }, 400);
    }

    // 检查 token 是否已使用
    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
    }

    // 更新密码
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: payload.userId as string },
      data: { password: hashed }
    });

    // 标记 token 已使用
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

    return c.json({ success: true, message: 'Password reset successful' });
  } catch {
    return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
  }
});

// 注销（JWT 黑名单）
authEnhancedRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.exp) {
      await db.refreshToken.create({
        data: {
          tokenId: payload.jti as string || payload.userId as string,
          userId: payload.userId as string,
          expiresAt: new Date(payload.exp * 1000)
        }
      });
    }

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null;
    const userAgent = c.req.header('user-agent');
    await createAuditLog({
      userId: payload.userId as string,
      action: 'auth.logout',
      resource: 'User',
      ip,
      userAgent
    });

    return c.json({ success: true, message: 'Logged out' });
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
});