const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllPositions() {
  try {
    console.log('📊 Checking all drivers and their GPS positions\n');
    console.log('=' .repeat(80));

    // Get all drivers with traccarDeviceId
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
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    console.log(`\nFound ${drivers.length} drivers with GPS devices:\n`);

    for (const driver of drivers) {
      const driverName = `${driver.user.firstName} ${driver.user.lastName}`;
      console.log(`\n${'━'.repeat(80)}`);
      console.log(`👤 ${driverName}`);
      console.log(`   ID: ${driver.id}`);
      console.log(`   Device ID: ${driver.traccarDeviceId}`);
      console.log(`   Last Location Update: ${driver.lastLocationUpdate?.toISOString() || 'Never'}`);

      // Get total positions
      const totalPositions = await prisma.position.count({
        where: { driverId: driver.id },
      });

      console.log(`\n   📍 Total positions: ${totalPositions}`);

      if (totalPositions === 0) {
        console.log('   ⚠️  No positions in database');
        continue;
      }

      // Get positions with bad dates (before 2020)
      const badPositions = await prisma.position.count({
        where: {
          driverId: driver.id,
          recordedAt: {
            lt: new Date('2020-01-01'),
          },
        },
      });

      if (badPositions > 0) {
        console.log(`   ❌ Bad positions (before 2020): ${badPositions}`);
      }

      // Get positions in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentPositions = await prisma.position.count({
        where: {
          driverId: driver.id,
          recordedAt: {
            gte: sevenDaysAgo,
          },
        },
      });

      console.log(`   ✅ Valid recent positions (last 7 days): ${recentPositions}`);

      // Get latest position
      const latestPosition = await prisma.position.findFirst({
        where: { driverId: driver.id },
        orderBy: { recordedAt: 'desc' },
      });

      if (latestPosition) {
        const isOld = latestPosition.recordedAt < new Date('2020-01-01');
        const isRecent = latestPosition.recordedAt >= sevenDaysAgo;

        console.log(`\n   Latest position:`);
        console.log(`   ${isOld ? '❌' : isRecent ? '✅' : '⚠️ '} Recorded: ${latestPosition.recordedAt.toISOString()}`);
        console.log(`      Received: ${latestPosition.receivedAt.toISOString()}`);
        console.log(`      Location: (${latestPosition.latitude.toFixed(6)}, ${latestPosition.longitude.toFixed(6)})`);
        console.log(`      Speed: ${latestPosition.speed || 0} km/h`);

        if (isOld) {
          console.log(`\n   ⚠️  ISSUE: Latest position has bad timestamp (1970s)`);
          console.log(`      This position will NOT show in "Prikaži više" panel`);
        } else if (!isRecent) {
          console.log(`\n   ℹ️  Latest position is older than 7 days`);
          console.log(`      Will not show in "Prikaži više" panel (only shows last 7 days)`);
        } else {
          console.log(`\n   ✅ Latest position should show in "Prikaži više" panel`);
        }

        // Show 5 most recent positions
        const recent5 = await prisma.position.findMany({
          where: { driverId: driver.id },
          orderBy: { recordedAt: 'desc' },
          take: 5,
        });

        if (recent5.length > 1) {
          console.log(`\n   Last 5 positions:`);
          recent5.forEach((pos, i) => {
            const isBad = pos.recordedAt < new Date('2020-01-01');
            console.log(`      ${i + 1}. ${isBad ? '❌' : '✅'} ${pos.recordedAt.toISOString()}`);
          });
        }
      }
    }

    console.log(`\n${'━'.repeat(80)}\n`);

    // Summary
    const totalAllPositions = await prisma.position.count();
    const totalBadPositions = await prisma.position.count({
      where: {
        recordedAt: {
          lt: new Date('2020-01-01'),
        },
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const totalRecentPositions = await prisma.position.count({
      where: {
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    console.log('📊 SUMMARY:');
    console.log(`   Total positions in database: ${totalAllPositions}`);
    console.log(`   ❌ Bad positions (before 2020): ${totalBadPositions}`);
    console.log(`   ✅ Valid recent positions (last 7 days): ${totalRecentPositions}`);
    console.log(``);

    if (totalBadPositions > 0) {
      console.log(`⚠️  ACTION NEEDED:`);
      console.log(`   ${totalBadPositions} positions have bad timestamps (1970s)`);
      console.log(`   These need to be deleted and fresh GPS data needs to be received`);
      console.log(``);
      console.log(`   To clean up bad positions:`);
      console.log(`   node scripts/cleanup-bad-positions.js`);
      console.log(``);
    }

    if (totalRecentPositions === 0) {
      console.log(`⚠️  NO RECENT POSITIONS:`);
      console.log(`   No positions in last 7 days - waiting for GPS updates`);
      console.log(``);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPositions();
