const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSalkoPositions() {
  try {
    // Find Salko
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Salko',
          lastName: 'Cerkezovic',
        },
      },
      select: {
        id: true,
        traccarDeviceId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!driver) {
      console.log('❌ Salko not found');
      return;
    }

    console.log('✅ Driver:', driver.user.firstName, driver.user.lastName);
    console.log('   ID:', driver.id);
    console.log('   Device ID:', driver.traccarDeviceId);
    console.log('');

    // Check positions in last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    console.log('');

    const positions = await prisma.position.findMany({
      where: {
        driverId: driver.id,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        speed: true,
        recordedAt: true,
        receivedAt: true,
      },
    });

    console.log(`📍 Found ${positions.length} positions in last 7 days`);
    console.log('');

    if (positions.length > 0) {
      console.log('Recent positions:');
      positions.forEach((pos, i) => {
        console.log(`  ${i + 1}. ${pos.recordedAt.toISOString()} - (${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}) - ${pos.speed || 0} km/h`);
      });
    } else {
      console.log('⚠️  No positions found in last 7 days!');
      console.log('');
      console.log('Checking total positions for this driver...');

      const totalPositions = await prisma.position.count({
        where: { driverId: driver.id },
      });

      console.log('Total positions:', totalPositions);

      if (totalPositions > 0) {
        const latestPosition = await prisma.position.findFirst({
          where: { driverId: driver.id },
          orderBy: { recordedAt: 'desc' },
        });

        console.log('Latest position:', latestPosition.recordedAt.toISOString());
        console.log('');
        console.log('❗ Issue: Position dates might be outside the 7-day range');
        console.log('   OR: recordedAt timestamps are incorrect');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSalkoPositions();
