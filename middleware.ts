import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in-memory, za production koristiti Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// CORS Configuration
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

// Rate limit config
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

function getClientIdentifier(request: NextRequest): string {
  return request.ip || request.headers.get("x-forwarded-for") || "unknown";
}

function getRateLimitPolicy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/api/auth/login") {
    return { key: `login:${getClientIdentifier(request)}`, limit: 10 };
  }

  if (pathname === "/api/auth/refresh") {
    return { key: `refresh:${getClientIdentifier(request)}`, limit: 30 };
  }

  if (pathname === "/api/telemetry") {
    const deviceId =
      searchParams.get("id") ||
      searchParams.get("deviceid") ||
      searchParams.get("device_id") ||
      "unknown-device";

    return {
      key: `telemetry:${getClientIdentifier(request)}:${deviceId}`,
      limit: 600,
    };
  }

  return {
    key: `api:${getClientIdentifier(request)}`,
    limit: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CORS Handling
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  // Set CORS headers
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie"
    );
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  // 2. Rate Limiting (samo za API routes)
  if (pathname.startsWith("/api/")) {
    const now = Date.now();
    const policy = getRateLimitPolicy(request);

    // Get ili create rate limit entry
    let limitData = rateLimit.get(policy.key);

    if (!limitData || now > limitData.resetTime) {
      // Reset counter
      limitData = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW,
      };
    }

    limitData.count++;
    rateLimit.set(policy.key, limitData);

    // Check if limit exceeded
    if (limitData.count > policy.limit) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limitData.resetTime - now) / 1000)),
            "X-RateLimit-Limit": String(policy.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limitData.resetTime),
          },
        }
      );
    }

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(policy.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(Math.max(policy.limit - limitData.count, 0))
    );
    response.headers.set("X-RateLimit-Reset", String(limitData.resetTime));
  }

  // 3. Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Cleanup old rate limit entries (every 100th request)
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [ip, data] of rateLimit.entries()) {
      if (now > data.resetTime) {
        rateLimit.delete(ip);
      }
    }
  }

  return response;
}

// Configure koje paths će koristiti middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
