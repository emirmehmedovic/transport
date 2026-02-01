const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Find Mike Driver
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Mike',
          lastName: 'Driver'
        }
      }
    });

    if (!driver) {
      console.log('Driver not found');
      return;
    }

    console.log(`\n🔍 Testing API query for driver: ${driver.id}\n`);

    // Same query as the API uses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`📅 Date range:`);
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   End:   ${endDate.toISOString()}\n`);

    // Total positions for this driver
    const totalCount = await prisma.position.count({
      where: { driverId: driver.id }
    });
    console.log(`📊 Total positions in DB: ${totalCount}`);

    // Positions in date range
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
      take: 100,
    });

    console.log(`📊 Positions in last 7 days: ${positions.length}\n`);

    if (positions.length > 0) {
      console.log('─'.repeat(80));
      console.log('First 15 positions (newest first):');
      console.log('─'.repeat(80));

      positions.slice(0, 15).forEach((p, i) => {
        const date = p.recordedAt.toISOString().replace('T', ' ').substring(0, 19);
        const lat = p.latitude.toFixed(6);
        const lon = p.longitude.toFixed(6);
        const speed = p.speed !== null ? p.speed : 0;

        // Check if today
        const today = new Date();
        const isToday = p.recordedAt.toDateString() === today.toDateString();
        const marker = isToday ? '✅ TODAY' : '📅';

        console.log(`${i+1}. ${marker} ${date} | ${lat}, ${lon} | ${speed} km/h`);
      });

      console.log('─'.repeat(80));
      console.log(`\nOldest position in results: ${positions[positions.length-1].recordedAt.toISOString()}`);
      console.log(`Newest position in results: ${positions[0].recordedAt.toISOString()}\n`);
    }

    // Check if there are positions outside the range
    const olderPositions = await prisma.position.count({
      where: {
        driverId: driver.id,
        recordedAt: {
          lt: startDate,
        },
      },
    });

    if (olderPositions > 0) {
      console.log(`ℹ️  There are ${olderPositions} positions older than 7 days (not shown)\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
