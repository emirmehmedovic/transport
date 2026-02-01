const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecent() {
  try {
    console.log('\n🔍 Checking recent positions for all drivers\n');
    console.log('='.repeat(80));

    const drivers = await prisma.driver.findMany({
      where: {
        traccarDeviceId: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const driver of drivers) {
      const driverName = `${driver.user.firstName} ${driver.user.lastName}`;
      console.log(`\n👤 ${driverName} (Device: ${driver.traccarDeviceId})`);
      console.log('-'.repeat(80));

      const positions = await prisma.position.findMany({
        where: { driverId: driver.id },
        orderBy: { recordedAt: 'desc' },
        take: 15,
        select: {
          latitude: true,
          longitude: true,
          speed: true,
          recordedAt: true,
          receivedAt: true,
        },
      });

      if (positions.length === 0) {
        console.log('   ⚠️  No positions found');
        continue;
      }

      console.log(`\n   Last ${positions.length} positions:\n`);
      positions.forEach((p, i) => {
        const recordedDate = new Date(p.recordedAt);
        const receivedDate = new Date(p.receivedAt);
        const dateStr = recordedDate.toISOString().replace('T', ' ').substring(0, 19);
        const lat = p.latitude.toFixed(6);
        const lon = p.longitude.toFixed(6);
        const speed = p.speed !== null ? p.speed.toFixed(0) : '0';

        // Check if it's today
        const today = new Date();
        const isToday = recordedDate.toDateString() === today.toDateString();
        const marker = isToday ? '✅' : '📅';

        console.log(`   ${marker} ${i + 1}. ${lat}, ${lon} | ${dateStr} | ${speed} km/h`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecent();
