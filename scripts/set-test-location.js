const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setTestLocation() {
  try {
    console.log('🧪 Setting Test Location for Mike Driver\n');

    // Sarajevo City Center (Baščaršija)
    const testLat = 43.8594;
    const testLon = 18.4318;

    console.log('📍 Test Location: Sarajevo, Baščaršija');
    console.log(`   Coordinates: (${testLat}, ${testLon})\n`);

    // Find Mike Driver
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Mike',
          lastName: 'Driver',
        },
      },
      include: {
        user: true,
      },
    });

    if (!driver) {
      console.log('❌ Mike Driver not found!');
      return;
    }

    console.log(`✅ Found driver: ${driver.user.firstName} ${driver.user.lastName}`);
    console.log(`   Current location: (${driver.lastKnownLatitude}, ${driver.lastKnownLongitude})`);
    console.log(`   Last update: ${driver.lastLocationUpdate?.toISOString() || 'N/A'}\n`);

    // Update to test location
    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        lastKnownLatitude: testLat,
        lastKnownLongitude: testLon,
        lastLocationUpdate: new Date(),
      },
    });

    console.log('✅ Test location set!');
    console.log(`   New location: (${updated.lastKnownLatitude}, ${updated.lastKnownLongitude})`);
    console.log(`   Updated at: ${updated.lastLocationUpdate.toISOString()}\n`);

    console.log('🔍 Now monitoring for GPS updates...');
    console.log('   Open Live Map: http://localhost:3000/live-map');
    console.log('   You should see Mike Driver in Sarajevo (Baščaršija)\n');

    console.log('⏳ Waiting for GPS to send real location...');
    console.log('   When GPS sends data, the position should update within 5 seconds!\n');

    // Start monitoring for changes
    let lastLat = updated.lastKnownLatitude;
    let lastLon = updated.lastKnownLongitude;
    let checkCount = 0;

    console.log('📊 Monitoring started (checking every 3 seconds)...\n');

    const interval = setInterval(async () => {
      checkCount++;

      const currentDriver = await prisma.driver.findUnique({
        where: { id: driver.id },
        select: {
          lastKnownLatitude: true,
          lastKnownLongitude: true,
          lastLocationUpdate: true,
        },
      });

      if (
        currentDriver.lastKnownLatitude !== lastLat ||
        currentDriver.lastKnownLongitude !== lastLon
      ) {
        console.log(`\n✅ POSITION UPDATED! (after ${checkCount * 3} seconds)`);
        console.log(`   Old: (${lastLat?.toFixed(6)}, ${lastLon?.toFixed(6)})`);
        console.log(`   New: (${currentDriver.lastKnownLatitude?.toFixed(6)}, ${currentDriver.lastKnownLongitude?.toFixed(6)})`);
        console.log(`   Updated at: ${currentDriver.lastLocationUpdate?.toISOString()}\n`);

        console.log('🎉 GPS data received and position updated!');
        console.log('   Check Live Map - it should refresh within 5 seconds.\n');

        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      } else {
        process.stdout.write(`\r⏳ Checking... (${checkCount * 3}s elapsed) - No change yet`);
      }

      // Timeout after 5 minutes
      if (checkCount >= 100) {
        console.log('\n\n⏱️  Timeout: No GPS update received in 5 minutes');
        console.log('   Make sure GPS device is sending data to the API\n');
        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      }
    }, 3000);

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setTestLocation();
