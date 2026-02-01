const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllDrivers() {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    console.log(`\n📋 Total drivers in database: ${drivers.length}\n`);
    console.log('=' .repeat(80));

    drivers.forEach((driver, index) => {
      const name = `${driver.user.firstName} ${driver.user.lastName}`;
      const hasGPS = driver.traccarDeviceId ? '✅' : '❌';

      console.log(`\n${index + 1}. ${name}`);
      console.log(`   ${hasGPS} GPS Device: ${driver.traccarDeviceId || 'Not configured'}`);
      console.log(`   Last Location: ${driver.lastKnownLatitude && driver.lastKnownLongitude
        ? `(${driver.lastKnownLatitude.toFixed(6)}, ${driver.lastKnownLongitude.toFixed(6)})`
        : 'Unknown'}`);
      console.log(`   Last Update: ${driver.lastLocationUpdate?.toISOString() || 'Never'}`);
    });

    console.log(`\n${'='.repeat(80)}\n`);

    const withGPS = drivers.filter(d => d.traccarDeviceId).length;
    const withoutGPS = drivers.length - withGPS;

    console.log(`Summary:`);
    console.log(`  ✅ Drivers with GPS configured: ${withGPS}`);
    console.log(`  ❌ Drivers without GPS: ${withoutGPS}`);
    console.log(``);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllDrivers();
