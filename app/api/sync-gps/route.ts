import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { syncNTSGPSData } from '@/lib/nts-gps-sync';

/**
 * POST /api/sync-gps
 * Manually trigger GPS sync from NTS International
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    console.log('[Sync GPS] Manual sync triggered by admin');

    // Run sync
    const result = await syncNTSGPSData();

    return NextResponse.json({
      success: result.success,
      message: `Processed ${result.vehiclesProcessed} vehicles, saved ${result.positionsSaved} positions`,
      details: result,
    });
  } catch (error: any) {
    console.error('[Sync GPS] Error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-gps/status
 * Check sync status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if NTS credentials are configured
    const isConfigured = !!(
      process.env.NTS_AUTH_COOKIE || process.env.NTS_AUTH_TOKEN
    );

    return NextResponse.json({
      configured: isConfigured,
      apiUrl: process.env.NTS_API_URL || 'Not set',
      lastSync: 'Not implemented yet', // TODO: Store last sync time
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
