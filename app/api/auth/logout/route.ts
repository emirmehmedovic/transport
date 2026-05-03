import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRefreshAuthUserFromRequest, getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authUser =
    (await getVerifiedAuthUserFromRequest(request)) ||
    getRefreshAuthUserFromRequest(request);

  if (authUser?.userId) {
    try {
      await prisma.user.update({
        where: { id: authUser.userId },
        data: {
          refreshTokenVersion: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      console.error("Logout refresh token revoke error:", error);
    }
  }

  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear cookies
  response.cookies.delete("token");
  response.cookies.delete("refreshToken");

  return response;
}
