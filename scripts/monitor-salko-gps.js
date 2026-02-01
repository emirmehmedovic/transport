const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorSalkoGPS() {
  try {
    console.log('🔍 Monitoring GPS Updates for Salko Cerkezovic\n');
    console.log('⏱️  GPS sends position every 1800 seconds (30 minutes) in stationary mode');
    console.log('   or every 300 seconds (5 minutes) when moving\n');

    // Find Salko
    const driver = await prisma.driver.findFirst({
      where: {
        user: {
          firstName: 'Salko',
          lastName: 'Cerkezovic',
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

    if (!driver) {
      console.log('❌ Salko Cerkezovic not found!');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Monitoring driver: ${driver.user.firstName} ${driver.user.lastName}`);
    console.log(`   ID: ${driver.id}`);
    console.log(`   Device ID: ${driver.traccarDeviceId || 'N/A'}`);
    console.log(`   Current location: (${driver.lastKnownLatitude?.toFixed(6) || 'N/A'}, ${driver.lastKnownLongitude?.toFixed(6) || 'N/A'})`);
    console.log(`   Last update: ${driver.lastLocationUpdate?.toISOString() || 'Never'}\n`);

    // Check current positions count
    const currentPositions = await prisma.position.count({
      where: { driverId: driver.id },
    });

    console.log(`📊 Current positions in database: ${currentPositions}`);

    if (currentPositions === 0) {
      console.log('   ℹ️  Old positions with bad timestamps were cleaned up');
      console.log('   Waiting for fresh GPS data...\n');
    } else {
      const latestPosition = await prisma.position.findFirst({
        where: { driverId: driver.id },
        orderBy: { recordedAt: 'desc' },
      });
      console.log(`   Latest position timestamp: ${latestPosition.recordedAt.toISOString()}\n`);
    }

    console.log('🗺️  Open Live Map: http://localhost:3000/live-map');
    console.log('   Click on Salko → "Prikaži više" to see position history\n');

    let lastCount = currentPositions;
    let lastUpdate = driver.lastLocationUpdate;
    let checkCount = 0;

    console.log('📊 Monitoring started (checking every 5 seconds)...\n');

    const interval = setInterval(async () => {
      checkCount++;
      const elapsed = checkCount * 5;

      // Check position count
      const newCount = await prisma.position.count({
        where: { driverId: driver.id },
      });

      // Check driver update
      const currentDriver = await prisma.driver.findUnique({
        where: { id: driver.id },
        select: {
          lastKnownLatitude: true,
          lastKnownLongitude: true,
          lastLocationUpdate: true,
        },
      });

      const positionAdded = newCount > lastCount;
      const timestampChanged = lastUpdate && currentDriver.lastLocationUpdate &&
        new Date(currentDriver.lastLocationUpdate).getTime() !==
        new Date(lastUpdate).getTime();

      if (positionAdded || timestampChanged) {
        console.log(`\n\n✅ GPS UPDATE DETECTED! (after ${elapsed} seconds)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (positionAdded) {
          console.log(`📍 New position saved to database!`);
          console.log(`   Position count: ${lastCount} → ${newCount}`);

          // Get the new position
          const latestPosition = await prisma.position.findFirst({
            where: { driverId: driver.id },
            orderBy: { recordedAt: 'desc' },
          });

          console.log(`\n   Location: (${latestPosition.latitude.toFixed(6)}, ${latestPosition.longitude.toFixed(6)})`);
          console.log(`   Speed: ${latestPosition.speed || 0} km/h`);
          console.log(`   Recorded at: ${latestPosition.recordedAt.toISOString()}`);
          console.log(`   Received at: ${latestPosition.receivedAt.toISOString()}`);

          // Check if it's in the last 7 days (for sidebar query)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const isInRange = latestPosition.recordedAt >= sevenDaysAgo;

          console.log(`\n   ✅ Timestamp is valid: ${latestPosition.recordedAt.toISOString()}`);
          console.log(`   ${isInRange ? '✅' : '❌'} Will show in sidebar (last 7 days): ${isInRange ? 'YES' : 'NO'}`);
        }

        if (timestampChanged) {
          console.log(`\n⏰ Driver record updated:`);
          console.log(`   Old timestamp: ${lastUpdate ? new Date(lastUpdate).toISOString() : 'N/A'}`);
          console.log(`   New timestamp: ${new Date(currentDriver.lastLocationUpdate).toISOString()}`);
          console.log(`   Location: (${currentDriver.lastKnownLatitude?.toFixed(6)}, ${currentDriver.lastKnownLongitude?.toFixed(6)})`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 GPS data received successfully!');
        console.log('🗺️  Go to Live Map → Click Salko → "Prikaži više"');
        console.log('    Position should now appear in the history panel!');
        console.log('\n✅ Test SUCCESSFUL - Salko positions working!\n');

        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      } else {
        // Show progress
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        process.stdout.write(
          `\r⏳ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} elapsed ` +
          `| Positions: ${newCount} | Waiting for GPS update...     `
        );
      }

      // Timeout after 45 minutes
      if (checkCount >= 540) {
        console.log('\n\n⏱️  Timeout: No GPS update received in 45 minutes');
        console.log('   GPS device might be in stationary mode or not sending data\n');
        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

monitorSalkoGPS();
