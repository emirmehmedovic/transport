import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear cookies
  response.cookies.delete("token");
  response.cookies.delete("refreshToken");

  return response;
}
