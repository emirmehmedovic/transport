import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, generateToken, generateRefreshToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUMMY_BCRYPT_HASH =
  "$2b$10$7EqJtq98hPqEX7fNZaFWoO.KHkJ4nM6sP6KyHRcY6z3n9JVpaz6Ka";

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_THRESHOLD = 8;
const LOGIN_MAX_BACKOFF_MS = 3000;

const failedLoginAttempts = new Map<
  string,
  { count: number; firstAttemptAt: number; lockedUntil: number }
>();

function getClientIp(request: NextRequest) {
  return request.ip || request.headers.get("x-forwarded-for") || "unknown";
}

function getLoginAttemptKey(request: NextRequest, email: string) {
  return `${getClientIp(request)}:${email}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyFailedLoginDelay(attempts: number) {
  const delay = Math.min(300 * attempts, LOGIN_MAX_BACKOFF_MS);
  if (delay > 0) {
    await sleep(delay);
  }
}

function getLoginAttemptState(key: string) {
  const now = Date.now();
  const existing = failedLoginAttempts.get(key);

  if (!existing) return null;
  if (now - existing.firstAttemptAt > LOGIN_WINDOW_MS && now >= existing.lockedUntil) {
    failedLoginAttempts.delete(key);
    return null;
  }

  return existing;
}

function registerFailedLoginAttempt(key: string) {
  const now = Date.now();
  const existing = getLoginAttemptState(key);

  const next = existing
    ? {
        count: existing.count + 1,
        firstAttemptAt: existing.firstAttemptAt,
        lockedUntil:
          existing.count + 1 >= LOGIN_LOCK_THRESHOLD
            ? now + LOGIN_WINDOW_MS
            : existing.lockedUntil,
      }
    : {
        count: 1,
        firstAttemptAt: now,
        lockedUntil: 0,
      };

  failedLoginAttempts.set(key, next);
  return next;
}

function clearFailedLoginAttempts(key: string) {
  failedLoginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const email = rawEmail.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const attemptKey = getLoginAttemptKey(request, email);
    const attemptState = getLoginAttemptState(attemptKey);

    if (attemptState?.lockedUntil && attemptState.lockedUntil > Date.now()) {
      return NextResponse.json(
        { error: "Previše neuspješnih pokušaja prijave. Pokušajte ponovo kasnije." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((attemptState.lockedUntil - Date.now()) / 1000)
            ),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true,
      },
    });

    if (!user) {
      const failedAttempt = registerFailedLoginAttempt(attemptKey);
      await applyFailedLoginDelay(failedAttempt.count);
      await comparePassword(password, DUMMY_BCRYPT_HASH);
      return NextResponse.json(
        { error: "Invalid credentials" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      const failedAttempt = registerFailedLoginAttempt(attemptKey);
      await applyFailedLoginDelay(failedAttempt.count);
      return NextResponse.json(
        { error: "Invalid credentials" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    clearFailedLoginAttempts(attemptKey);

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      driverId: user.driver?.id || null,
      tokenVersion: user.refreshTokenVersion,
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data (without password) and tokens
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      user: userWithoutPassword,
      token,
      refreshToken,
    });

    // Set token in cookies (HttpOnly for security)
    response.cookies.set("token", token, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days to match JWT expiry
    });

    response.cookies.set("refreshToken", refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
