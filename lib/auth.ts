import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nije postavljen');
  }
  return secret;
}

function getJwtRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET nije postavljen');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: any): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export function generateRefreshToken(payload: any): string {
  return jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: '90d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, getJwtRefreshSecret());
  } catch (error) {
    return null;
  }
}
