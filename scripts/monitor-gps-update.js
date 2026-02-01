const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorGPSUpdate() {
  try {
    console.log('🔍 Monitoring GPS Updates for Mike Driver\n');
    console.log('⏱️  GPS sends position every 300 seconds (5 minutes)');
    console.log('   Monitoring for 10 minutes (2 GPS cycles)\n');

    // Find Mike Driver
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Mike',
          lastName: 'Driver',
        },
      },
    });

    if (!driver) {
      console.log('❌ Mike Driver not found!');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Monitoring driver: ${driver.id}`);
    console.log(`   Current location: (${driver.lastKnownLatitude}, ${driver.lastKnownLongitude})`);
    console.log(`   Last update: ${driver.lastLocationUpdate?.toISOString()}\n`);

    // Check if position is test location (Sarajevo)
    const isTestLocation =
      Math.abs(driver.lastKnownLatitude - 43.8594) < 0.001 &&
      Math.abs(driver.lastKnownLongitude - 18.4318) < 0.001;

    if (isTestLocation) {
      console.log('📍 Current position is TEST LOCATION (Sarajevo, Baščaršija)');
      console.log('   Waiting for GPS to send real location...\n');
    } else {
      console.log('📍 Current position is REAL GPS LOCATION');
      console.log('   Waiting for next GPS update...\n');
    }

    console.log('🗺️  Open Live Map: http://localhost:3000/live-map');
    console.log('   You should see position update when GPS sends data\n');

    let lastLat = driver.lastKnownLatitude;
    let lastLon = driver.lastKnownLongitude;
    let lastUpdate = driver.lastLocationUpdate;
    let checkCount = 0;

    console.log('📊 Monitoring started (checking every 3 seconds)...\n');

    const interval = setInterval(async () => {
      checkCount++;
      const elapsed = checkCount * 3;

      const currentDriver = await prisma.driver.findUnique({
        where: { id: driver.id },
        select: {
          lastKnownLatitude: true,
          lastKnownLongitude: true,
          lastLocationUpdate: true,
        },
      });

      // Check if position changed
      const positionChanged =
        currentDriver.lastKnownLatitude !== lastLat ||
        currentDriver.lastKnownLongitude !== lastLon;

      // Check if timestamp changed (even if position same)
      const timestampChanged =
        new Date(currentDriver.lastLocationUpdate).getTime() !==
        new Date(lastUpdate).getTime();

      if (positionChanged || timestampChanged) {
        console.log(`\n\n✅ GPS UPDATE DETECTED! (after ${elapsed} seconds)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (positionChanged) {
          console.log(`📍 Position Changed:`);
          console.log(`   Old: (${lastLat?.toFixed(6)}, ${lastLon?.toFixed(6)})`);
          console.log(`   New: (${currentDriver.lastKnownLatitude?.toFixed(6)}, ${currentDriver.lastKnownLongitude?.toFixed(6)})`);

          const distance = calculateDistance(
            lastLat,
            lastLon,
            currentDriver.lastKnownLatitude,
            currentDriver.lastKnownLongitude
          );
          console.log(`   Distance: ${distance.toFixed(2)} km\n`);
        }

        console.log(`⏰ Timestamp Updated:`);
        console.log(`   Old: ${new Date(lastUpdate).toISOString()}`);
        console.log(`   New: ${new Date(currentDriver.lastLocationUpdate).toISOString()}`);

        const timeDiff = new Date(currentDriver.lastLocationUpdate).getTime() -
                        new Date(lastUpdate).getTime();
        console.log(`   Time since last update: ${Math.floor(timeDiff / 1000)}s\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 GPS data received and position updated!');
        console.log('🗺️  Live Map should refresh within 5 seconds.\n');
        console.log('✅ Test SUCCESSFUL - Real-time updates working!\n');

        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      } else {
        // Show progress
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const nextUpdate = 300 - (elapsed % 300);
        const nextMinutes = Math.floor(nextUpdate / 60);
        const nextSeconds = nextUpdate % 60;

        process.stdout.write(
          `\r⏳ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} elapsed ` +
          `| Next GPS update in ~${nextMinutes}m ${nextSeconds}s | No change yet     `
        );
      }

      // Timeout after 10 minutes (2 GPS cycles)
      if (checkCount >= 200) {
        console.log('\n\n⏱️  Timeout: No GPS update received in 10 minutes (2 cycles)');
        console.log('   GPS device might not be sending data\n');
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

monitorGPSUpdate();
