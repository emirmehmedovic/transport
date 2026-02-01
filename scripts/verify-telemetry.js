const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyLastPositions() {
  try {
    console.log('📊 Checking last 10 positions for Mike Driver...\n');

    const positions = await prisma.position.findMany({
      where: {
        driver: {
          traccarDeviceId: 'kamion0001',
        },
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: 10,
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        recordedAt: true,
        receivedAt: true,
      },
    });

    if (positions.length === 0) {
      console.log('⚠️  No positions found');
      return;
    }

    console.log('Last 10 positions:\n');
    positions.forEach((pos, i) => {
      const recordedYear = pos.recordedAt.getFullYear();
      const isValid = recordedYear >= 2020;
      const emoji = isValid ? '✅' : '❌';

      console.log(`${emoji} ${i + 1}. Recorded: ${pos.recordedAt.toISOString()}`);
      console.log(`     Location: [${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}]`);
      console.log(`     Speed: ${pos.speed || 0} km/h`);
      console.log(`     Received: ${pos.receivedAt.toISOString()}\n`);
    });

    const validCount = positions.filter(p => p.recordedAt.getFullYear() >= 2020).length;
    console.log(`\n📈 Summary: ${validCount}/${positions.length} positions have valid dates (>= 2020)`);

    if (validCount === positions.length) {
      console.log('🎉 All recent positions have valid timestamps!');
    } else {
      console.log('⚠️  Some positions still have invalid dates');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLastPositions();
