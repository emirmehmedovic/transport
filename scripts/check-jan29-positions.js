const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJan29() {
  try {
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Mike',
          lastName: 'Driver'
        }
      }
    });

    // Check positions around 2026-01-29 08:00
    const positions = await prisma.position.findMany({
      where: {
        driverId: driver.id,
        recordedAt: {
          gte: new Date('2026-01-29T07:00:00Z'),
          lte: new Date('2026-01-29T09:00:00Z'),
        },
      },
      orderBy: {
        recordedAt: 'asc',
      },
    });

    console.log(`\nPositions from 2026-01-29 between 07:00-09:00:\n`);
    console.log('='.repeat(80));

    positions.forEach((p) => {
      const date = p.recordedAt.toISOString().replace('T', ' ').replace('Z', '');
      const lat = p.latitude.toFixed(6);
      const lon = p.longitude.toFixed(6);
      const speed = p.speed !== null ? Math.round(p.speed) : 0;

      console.log(`${lat}, ${lon} | ${date} | ${speed} km/h`);
    });

    console.log('='.repeat(80));
    console.log(`\nTotal: ${positions.length} positions\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJan29();
