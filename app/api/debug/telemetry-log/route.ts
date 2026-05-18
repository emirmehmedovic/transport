import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';

const LOG_FILE = join(process.cwd(), 'gps-telemetry.log');

async function requireAdmin(request: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

/**
 * GET /api/debug/telemetry-log
 * View logged GPS telemetry data
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!existsSync(LOG_FILE)) {
      return NextResponse.json({ message: 'No telemetry logged yet', entries: [] });
    }

    const fs = require('fs');
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter((line: string) => line);
    const entries = lines.map((line: string) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    return NextResponse.json({
      message: `${entries.length} telemetry entries logged`,
      entries: entries.slice(-50), // Last 50 entries
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to read log', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug/telemetry-log
 * Log incoming GPS telemetry data (for debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const method = request.method;
    const url = request.url;
    const searchParams = request.nextUrl.searchParams;

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      // Not JSON
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      searchParams: Object.fromEntries(searchParams.entries()),
      body,
    };

    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');

    return NextResponse.json({ logged: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to log', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/debug/telemetry-log
 * Clear the telemetry log
 */
export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (existsSync(LOG_FILE)) {
      writeFileSync(LOG_FILE, '');
    }
    return NextResponse.json({ message: 'Log cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to clear log', details: error.message },
      { status: 500 }
    );
  }
}
