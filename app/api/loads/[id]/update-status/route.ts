import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/loads/[id]/update-status
 * Manually update load status (used by drivers)
 *
 * Body:
 * - action: 'pickup' | 'start_transit' | 'deliver'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['pickup', 'start_transit', 'deliver'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: pickup, start_transit, or deliver' },
        { status: 400 }
      );
    }

    // Get the load
    const load = await prisma.load.findUnique({
      where: { id: params.id },
      include: {
        driver: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check permissions: Driver can only update their own loads, ADMIN/DISPATCHER can update any
    const isDriver = decoded.role === 'DRIVER' && load.driver?.userId === decoded.userId;
    const isAdminOrDispatcher = decoded.role === 'ADMIN' || decoded.role === 'DISPATCHER';

    if (!isDriver && !isAdminOrDispatcher) {
      return NextResponse.json(
        { error: 'You do not have permission to update this load' },
        { status: 403 }
      );
    }

    // Validate state transitions
    const validTransitions: Record<string, { from: string[]; to: string; dateField: string }> = {
      pickup: {
        from: ['ASSIGNED'],
        to: 'PICKED_UP',
        dateField: 'actualPickupDate',
      },
      start_transit: {
        from: ['PICKED_UP'],
        to: 'IN_TRANSIT',
        dateField: 'inTransitAt',
      },
      deliver: {
        from: ['IN_TRANSIT', 'PICKED_UP'], // Allow direct delivery from PICKED_UP
        to: 'DELIVERED',
        dateField: 'actualDeliveryDate',
      },
    };

    const transition = validTransitions[action];

    if (!transition.from.includes(load.status)) {
      return NextResponse.json(
        {
          error: `Cannot ${action} - load is currently ${load.status}. Expected: ${transition.from.join(' or ')}`,
        },
        { status: 400 }
      );
    }

    // Update the load
    const updateData: any = {
      status: transition.to,
    };

    // Set timestamp for the action
    if (transition.dateField) {
      updateData[transition.dateField] = new Date();
    }

    const updatedLoad = await prisma.load.update({
      where: { id: params.id },
      data: updateData,
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        truck: true,
      },
    });

    console.log(
      `[LoadStatus] ${load.driver?.user.firstName} ${load.driver?.user.lastName} updated load ${load.loadNumber}: ${load.status} → ${transition.to}`
    );

    return NextResponse.json({
      success: true,
      load: updatedLoad,
      message: `Load status updated to ${transition.to}`,
    });
  } catch (error: any) {
    console.error('[LoadStatus] Error updating load status:', error);
    return NextResponse.json(
      { error: 'Failed to update load status' },
      { status: 500 }
    );
  }
}
