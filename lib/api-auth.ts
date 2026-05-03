import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, verifyToken } from "@/lib/auth";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "ADMIN" | "DISPATCHER" | "DRIVER" | "CLIENT";
  driverId?: string | null;
  tokenVersion?: number;
  firstName?: string;
  lastName?: string;
};

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  if (!headerValue.startsWith("Bearer ")) return null;

  const token = headerValue.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function getAccessTokenFromRequest(request: NextRequest): string | null {
  const bearerToken = getBearerToken(request.headers.get("authorization"));
  if (bearerToken) return bearerToken;

  const cookieToken = request.cookies.get("token")?.value;
  return cookieToken || null;
}

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  const bearerToken = getBearerToken(request.headers.get("x-refresh-token"));
  if (bearerToken) return bearerToken;

  const rawHeaderToken = request.headers.get("x-refresh-token");
  if (rawHeaderToken && rawHeaderToken.trim().length > 0) {
    return rawHeaderToken.trim();
  }

  const cookieToken = request.cookies.get("refreshToken")?.value;
  return cookieToken || null;
}

export function getAuthUserFromRequest(
  request: NextRequest
): AuthTokenPayload | null {
  const token = getAccessTokenFromRequest(request);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  return decoded as AuthTokenPayload;
}

export async function getVerifiedAuthUserFromRequest(
  request: NextRequest
): Promise<AuthTokenPayload | null> {
  const decoded = getAuthUserFromRequest(request);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      role: true,
      refreshTokenVersion: true,
      driver: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) return null;

  if ((decoded.tokenVersion ?? 0) !== user.refreshTokenVersion) {
    return null;
  }

  return {
    ...decoded,
    role: user.role,
    driverId: decoded.driverId ?? user.driver?.id ?? null,
  };
}

export function getRefreshAuthUserFromRequest(
  request: NextRequest
): AuthTokenPayload | null {
  const token = getRefreshTokenFromRequest(request);
  if (!token) return null;

  const decoded = verifyRefreshToken(token);
  if (!decoded) return null;

  return decoded as AuthTokenPayload;
}

export function hasRole(
  user: AuthTokenPayload | null,
  roles: AuthTokenPayload["role"][]
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
